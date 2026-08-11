import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../shared/cache/cache.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LEARNING_COLLECTIONS, StudentLearningRepository } from './student-learning.repository';
import { LessonSummaryService } from '../lesson-summary/services/lesson-summary.service';

type Block = { id: string; title?: string; content: string; items?: string[]; metadata: { type: string; importance: string; priority: number } };
type ContentEnvelope = { schemaVersion: string; promptVersion: string; data: { blocks: Block[] } };
const PROMPT_VERSION = 'student-learning-prompts-v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class StudentLearningService {
  constructor(private readonly repository: StudentLearningRepository, private readonly cache: CacheService, private readonly lessonSummary: LessonSummaryService, private readonly prisma: PrismaService) {}

  async chat(userId: string, lessonId: string, question: string) {
    const source = await this.source(lessonId);
    const terms = this.terms(question);
    const matches = source.data.blocks.map((block) => ({ block, score: this.score(block, terms) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    await this.repository.usage(userId, lessonId, 'chat', PROMPT_VERSION);
    return {
      answer: matches.length ? matches.map(({ block }) => block.title ? `${block.title}: ${block.content}` : block.content).join('\n\n') : 'لا توجد معلومات كافية داخل محتوى الدرس للإجابة عن هذا السؤال.',
      sufficientContext: matches.length > 0,
      sources: matches.map(({ block }) => ({ blockId: block.id, type: block.metadata.type, section: block.title })),
    };
  }

  async flashcards(userId: string, lessonId: string) {
    const source = await this.source(lessonId);
    const cached = await this.material<unknown[]>(lessonId, 'flashcards', source.schemaVersion);
    if (cached) return cached;
    const cards = source.data.blocks.filter((block) => ['definition', 'law', 'formula', 'important', 'note'].includes(block.metadata.type)).map((block) => ({
      id: block.id, question: `ما المقصود بـ ${block.title || this.firstWords(block.content)}؟`, answer: block.content,
      difficulty: block.metadata.importance === 'critical' ? 'hard' : block.metadata.importance === 'high' ? 'medium' : 'easy', tags: [block.metadata.type], blockId: block.id,
    }));
    await this.save(lessonId, 'flashcards', source.schemaVersion, cards);
    await this.repository.usage(userId, lessonId, 'flashcards', PROMPT_VERSION);
    return cards;
  }

  async quiz(userId: string, lessonId: string) {
    const source = await this.source(lessonId);
    const cached = await this.material<unknown[]>(lessonId, 'quiz', source.schemaVersion);
    if (cached) return cached;
    const candidates = source.data.blocks.filter((block) => block.content.trim().length > 10).slice(0, 20);
    const questions = candidates.map((block, index) => ({
      id: `q-${block.id}`, type: index % 4 === 0 ? 'mcq' : index % 4 === 1 ? 'true_false' : index % 4 === 2 ? 'fill_blank' : 'short_answer',
      question: index % 4 === 0 ? `أي مما يلي يصف: ${block.title || this.firstWords(block.content)}؟` : index % 4 === 1 ? `صح أم خطأ: ${block.content}` : index % 4 === 2 ? `أكمل العبارة المرتبطة بـ: ${block.title || this.firstWords(block.content)}` : `اشرح: ${block.title || this.firstWords(block.content)}`,
      answer: index % 4 === 1 ? 'صح' : block.content, explanation: block.content,
      options: index % 4 === 0 ? [block.content, ...candidates.filter((candidate) => candidate.id !== block.id).slice(0, 3).map((candidate) => candidate.content)] : undefined,
      difficulty: block.metadata.importance === 'critical' ? 'hard' : 'medium', section: block.title, blockId: block.id,
    }));
    await this.save(lessonId, 'quiz', source.schemaVersion, questions);
    await this.repository.usage(userId, lessonId, 'quiz', PROMPT_VERSION);
    return questions;
  }

  async revision(userId: string, lessonId: string) {
    const source = await this.source(lessonId);
    const cached = await this.material<unknown[]>(lessonId, 'revision', source.schemaVersion);
    if (cached) return cached;
    const items = [...source.data.blocks].sort((a, b) => b.metadata.priority - a.metadata.priority).slice(0, 30).map((block) => ({ blockId: block.id, title: block.title, content: block.content, importance: block.metadata.importance }));
    await this.save(lessonId, 'revision', source.schemaVersion, items);
    await this.repository.usage(userId, lessonId, 'revision', PROMPT_VERSION);
    return items;
  }

  async search(lessonId: string, query: string) {
    const source = await this.source(lessonId); const terms = this.terms(query);
    return source.data.blocks.map((block) => ({ block, score: this.score(block, terms) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map(({ block, score }) => ({ blockId: block.id, type: block.metadata.type, title: block.title, content: block.content, score }));
  }

  note(userId: string, lessonId: string, content: string, blockId?: string) { return this.repository.createUserRecord(LEARNING_COLLECTIONS.notes, userId, lessonId, { content, blockId: blockId || null }); }
  notes(userId: string, lessonId: string) { return this.repository.userRecords(LEARNING_COLLECTIONS.notes, userId, lessonId); }
  bookmark(userId: string, lessonId: string, blockId?: string, title?: string) { return this.repository.createUserRecord(LEARNING_COLLECTIONS.bookmarks, userId, lessonId, { blockId: blockId || null, title: title || null }); }
  bookmarks(userId: string, lessonId: string) { return this.repository.userRecords(LEARNING_COLLECTIONS.bookmarks, userId, lessonId); }
  progress(userId: string, lessonId: string, percent: number, completed: boolean) { return this.repository.saveProgress(userId, lessonId, percent, completed); }


  /** Backfills older video lessons created before automatic summary generation was enabled. */
  private async backfillSummary(lessonId: string): Promise<boolean> {
    const aiEnabled = await this.prisma.featureFlag.findUnique({ where: { name: 'AUTO_AI_SUMMARY' } });
    if (aiEnabled && !aiEnabled.isEnabled) return false;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { 
        videos: { select: { videoUrl: true }, take: 1 }, 
        section: { select: { course: { select: { instructors: { select: { teacher: { select: { userId: true } } }, take: 1 } } } } } 
      },
    });
    const videoUrl = lesson?.videos[0]?.videoUrl;
    const teacherUserId = lesson?.section?.course?.instructors[0]?.teacher?.userId;
    if (!videoUrl || !teacherUserId) return false;
    await this.lessonSummary.start(teacherUserId, { lessonId, videoUrl });
    return true;
  }

  private async source(lessonId: string): Promise<ContentEnvelope> {
    const key = `student-learning:source:${lessonId}`; const cached = await this.cache.get<ContentEnvelope>(key); if (cached) return cached;
    const value = await this.repository.content(lessonId) as ContentEnvelope | null;
    if (!value?.data?.blocks) throw new NotFoundException('Lesson JSON content is not available');
    await this.cache.set(key, value, CACHE_TTL_MS); return value;
  }
  private async material<T>(lessonId: string, type: string, version: string): Promise<T | null> { const key = `student-learning:${type}:${lessonId}:${version}`; const cached = await this.cache.get<T>(key); if (cached) return cached; const stored = await this.repository.material(lessonId, type, version) as T | null; if (stored) await this.cache.set(key, stored, CACHE_TTL_MS); return stored; }
  private async save(lessonId: string, type: string, version: string, payload: unknown) { await this.repository.saveMaterial(lessonId, type, version, PROMPT_VERSION, payload); await this.cache.set(`student-learning:${type}:${lessonId}:${version}`, payload, CACHE_TTL_MS); }
  private terms(value: string) { return value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 1); }
  private score(block: Block, terms: string[]) { const text = `${block.title || ''} ${block.content} ${(block.items || []).join(' ')}`.toLowerCase(); return terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0); }
  private firstWords(value: string) { return value.split(/\s+/).slice(0, 7).join(' '); }
}
