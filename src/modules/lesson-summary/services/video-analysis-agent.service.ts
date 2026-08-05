import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoAnalysisAgent } from '../interfaces/lesson-summary.interfaces';
import { StructureExtractionOutput, ChapterChunkOutput, ChunkType } from '../types/lesson-summary.types';
import { parseStrictJson } from './lesson-summary.validators';
import { AIProviderAdapter } from './ai-provider.adapter';
import { LESSON_SUMMARY_MAX_RETRIES } from '../constants/lesson-summary.constants';
import { ContextTooLargeError, InsufficientCreditsError } from '../errors/ai-execution.errors';

@Injectable()
export class VideoAnalysisAgentService implements VideoAnalysisAgent {
  private readonly logger = new Logger(VideoAnalysisAgentService.name);

  constructor(
    private readonly aiProvider: AIProviderAdapter,
    private readonly configService: ConfigService,
  ) {}

  async extractStructure(metadata: { title: string; duration: number; transcript: string; language: string }): Promise<{
    output: StructureExtractionOutput;
    metrics: any;
  }> {
    const model = this.configService.get<string>('lessonSummary.analysisModel') || 'meta/llama-3.1-70b-instruct';
    
    const promptContent = `
You are an expert AI teacher assistant. You are provided with the full text transcript of an educational video titled "${metadata.title}" (Duration: ${metadata.duration}s).
Read the transcript and extract the overarching structure of the lesson.

Requirements:
- Identify the main lesson title.
- Identify the main chapters of the video, including their precise start and end times in HH:MM:SS format.
- Extract the main headings discussed in the video.
- Extract the high-level teaching order (e.g. Introduction, Core Concept, Examples, Conclusion).

Return ONLY valid JSON in the following format:
{
  "lessonTitle": "String",
  "mainHeadings": ["Heading 1", "Heading 2"],
  "teachingOrder": ["Step 1", "Step 2"],
  "chapters": [
    { "title": "Chapter 1", "startTime": "00:00:00", "endTime": "00:05:30" }
  ]
}
`;

    let lastError: unknown;
    let expectedTokens = 800; // Structure extraction should be short

    for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
      try {
        const response = await this.aiProvider.chatCompletion([
          { role: 'system', content: promptContent },
          { role: 'user', content: `Video Transcript:\n\n${metadata.transcript}` },
        ], { model, expectedTokens, provider: 'nvidia' });

        const parsed = parseStrictJson<StructureExtractionOutput>(response.content);
        if (parsed.lessonTitle && Array.isArray(parsed.chapters)) {
          return { output: parsed, metrics: response.metrics };
        } else {
          lastError = new Error('Invalid structure JSON - missing required fields');
        }
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          expectedTokens = Math.max(200, Math.floor(expectedTokens / 2));
        } else if (e instanceof ContextTooLargeError) {
           throw e; // Cannot easily split the whole structure extraction, user must provide shorter video
        }
        lastError = e;
      }
    }
    throw lastError;
  }

  async extractChapterChunk(
    metadata: { title: string; duration: number; transcript: string; language: string },
    chapter: { title: string; startTime: string; endTime: string },
    chunkType: ChunkType,
    depth: number = 0
  ): Promise<{
    output: ChapterChunkOutput;
    metrics: any;
  }> {
    const model = this.configService.get<string>('lessonSummary.analysisModel') || 'meta/llama-3.1-70b-instruct';
    
    // Stop deep recursion
    if (depth > 3) {
      this.logger.warn(`Max chunking depth reached for chapter ${chapter.title}. Returning empty result to allow pipeline to continue.`);
      return {
        output: this.getEmptyChunkOutput(chunkType),
        metrics: { model, inputTokens: 0, outputTokens: 0, estimatedCost: 0, executionTimeMs: 0 }
      };
    }

    let promptContent = `You are an expert AI teacher assistant. Read the following video transcript covering the segment "${chapter.title}" (from ${chapter.startTime} to ${chapter.endTime}).\n\n`;

    let baseExpectedTokens = 1500;

    if (chunkType === 'definitions_laws_formulas') {
      baseExpectedTokens = 600;
      promptContent += `
Extract all Definitions, Laws, and Formulas mentioned during this EXACT time segment.
Return ONLY valid JSON in the following format:
{
  "definitions": ["Def 1", "Def 2"],
  "laws": ["Law 1", "Law 2"],
  "formulas": ["Formula 1", "Formula 2"]
}`;
    } else if (chunkType === 'examples_solutions') {
      baseExpectedTokens = 1200;
      promptContent += `
Extract all Examples discussed and their step-by-step solutions during this EXACT time segment.
Return ONLY valid JSON in the following format:
{
  "examples": [{ "title": "Example 1", "content": "Question text here" }],
  "solutionSteps": ["Step 1 of solving", "Step 2 of solving"]
}`;
    } else if (chunkType === 'notes_keypoints') {
      baseExpectedTokens = 800;
      promptContent += `
Extract all teacher Notes, Key Points, Sub Headings, and Teacher Focus Phrases during this EXACT time segment.
Return ONLY valid JSON in the following format:
{
  "keyPoints": ["Point 1", "Point 2"],
  "notes": ["Note 1", "Note 2"],
  "teacherFocusPhrases": ["Phrase 1"],
  "subHeadings": ["Subheading 1"]
}`;
    }

    // Discount tokens proportionally if depth > 0 (meaning we are asking for half the duration)
    let expectedTokens = Math.max(100, Math.floor(baseExpectedTokens / (depth + 1)));

    let lastError: unknown;
    for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
      try {
        const response = await this.aiProvider.chatCompletion([
          { role: 'system', content: promptContent },
          { role: 'user', content: `Video Transcript (Chapter: ${chapter.title}):\n\n${metadata.transcript}` },
        ], { model, expectedTokens, provider: 'nvidia' });

        const parsed = parseStrictJson<ChapterChunkOutput>(response.content);
        return { output: parsed, metrics: response.metrics };
      } catch (e) {
        if (e instanceof InsufficientCreditsError || e instanceof ContextTooLargeError) {
          this.logger.warn(`Encountered ${e.name} on ${chapter.title}. Adaptive Chunking initiated (depth ${depth + 1})...`);
          
          // Adaptive Chunking: Split the chapter into two halves based on time
          const midPoint = this.calculateMidpoint(chapter.startTime, chapter.endTime);
          
          if (!midPoint) {
            this.logger.error(`Could not split timestamps for ${chapter.startTime} - ${chapter.endTime}`);
            throw e;
          }

          // Recursively process both halves
          const part1 = await this.extractChapterChunk(metadata, { ...chapter, title: `${chapter.title} (Part 1)`, endTime: midPoint }, chunkType, depth + 1);
          const part2 = await this.extractChapterChunk(metadata, { ...chapter, title: `${chapter.title} (Part 2)`, startTime: midPoint }, chunkType, depth + 1);
          
          return {
             output: this.mergeChunkOutputs(part1.output, part2.output, chunkType),
             metrics: this.mergeMetrics(part1.metrics, part2.metrics)
          };
        }
        lastError = e;
      }
    }
    throw lastError;
  }

  private calculateMidpoint(start: string, end: string): string | null {
    try {
      const s = this.timeToSeconds(start);
      const e = this.timeToSeconds(end);
      if (s >= e) return null;
      
      const mid = s + Math.floor((e - s) / 2);
      // Don't split if segment is smaller than 10 seconds
      if (e - s < 10) return null;

      return this.secondsToTime(mid);
    } catch {
      return null;
    }
  }

  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
       return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  private secondsToTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private getEmptyChunkOutput(type: ChunkType): ChapterChunkOutput {
    if (type === 'definitions_laws_formulas') {
       return { definitions: [], laws: [], formulas: [] };
    }
    if (type === 'examples_solutions') {
       return { examples: [], solutionSteps: [] };
    }
    return { keyPoints: [], notes: [], teacherFocusPhrases: [], subHeadings: [] };
  }

  private mergeChunkOutputs(p1: ChapterChunkOutput, p2: ChapterChunkOutput, type: ChunkType): ChapterChunkOutput {
     if (type === 'definitions_laws_formulas') {
        const out1 = p1 as { definitions: string[], laws: string[], formulas: string[] };
        const out2 = p2 as { definitions: string[], laws: string[], formulas: string[] };
        return {
           definitions: [...(out1.definitions || []), ...(out2.definitions || [])],
           laws: [...(out1.laws || []), ...(out2.laws || [])],
           formulas: [...(out1.formulas || []), ...(out2.formulas || [])]
        };
     } else if (type === 'examples_solutions') {
        const out1 = p1 as { examples: any[], solutionSteps: string[] };
        const out2 = p2 as { examples: any[], solutionSteps: string[] };
        return {
           examples: [...(out1.examples || []), ...(out2.examples || [])],
           solutionSteps: [...(out1.solutionSteps || []), ...(out2.solutionSteps || [])]
        };
     } else {
        const out1 = p1 as { keyPoints: string[], notes: string[], teacherFocusPhrases: string[], subHeadings: string[] };
        const out2 = p2 as { keyPoints: string[], notes: string[], teacherFocusPhrases: string[], subHeadings: string[] };
        return {
           keyPoints: [...(out1.keyPoints || []), ...(out2.keyPoints || [])],
           notes: [...(out1.notes || []), ...(out2.notes || [])],
           teacherFocusPhrases: [...(out1.teacherFocusPhrases || []), ...(out2.teacherFocusPhrases || [])],
           subHeadings: [...(out1.subHeadings || []), ...(out2.subHeadings || [])]
        };
     }
  }

  private mergeMetrics(m1: any, m2: any): any {
     return {
        model: m1.model,
        inputTokens: (m1.inputTokens || 0) + (m2.inputTokens || 0),
        outputTokens: (m1.outputTokens || 0) + (m2.outputTokens || 0),
        estimatedCost: (m1.estimatedCost || 0) + (m2.estimatedCost || 0),
        executionTimeMs: (m1.executionTimeMs || 0) + (m2.executionTimeMs || 0),
     };
  }
}
