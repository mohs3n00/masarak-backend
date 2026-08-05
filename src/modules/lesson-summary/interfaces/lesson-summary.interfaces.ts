import {
  AIJobRecord,
  AIUsageRecord,
  AnalysisOutput,
  AIExecutionMetrics,
  DocumentModel,
  LayoutModel,
  LessonSummaryRecord,
  LessonSummaryQueuePayload,
  LessonSummaryStage,
  LessonSummaryStatus,
  PromptDefinition,
  StageLogPayload,
  VersionedJsonArtifact,
} from '../types/lesson-summary.types';

export interface VideoAnalysisAgent {
  extractStructure(metadata: { title: string; duration: number; transcript: string; language: string }): Promise<{
    output: import('../types/lesson-summary.types').StructureExtractionOutput;
    metrics: AIExecutionMetrics;
  }>;

  extractChapterChunk(
    metadata: { title: string; duration: number; transcript: string; language: string },
    chapter: { title: string; startTime: string; endTime: string },
    chunkType: import('../types/lesson-summary.types').ChunkType
  ): Promise<{
    output: import('../types/lesson-summary.types').ChapterChunkOutput;
    metrics: AIExecutionMetrics;
  }>;
}

export interface DocumentFormattingAgent {
  buildDocumentModel(input: AnalysisOutput): Promise<{
    output: DocumentModel;
    promptVersion: string;
    metrics: AIExecutionMetrics;
  }>;
}

export interface LayoutEngine {
  buildLayout(lessonId: string, model: DocumentModel): Promise<LayoutModel>;
}

export interface HtmlRenderer {
  render(layout: LayoutModel): Promise<string>;
}

export interface PdfGenerator {
  generate(html: string): Promise<Buffer>;
}

export interface StoredAsset {
  fileId: string;
  path: string;
  url: string;
  artifactVersion: string;
}

export interface PromptManager {
  getPrompt(name: 'analysis' | 'formatter' | 'retry'): Promise<PromptDefinition>;
}

export interface DocumentValidationService {
  validateAnalysisEnvelope(
    payload: unknown,
  ): payload is VersionedJsonArtifact<AnalysisOutput>;
  validateDocumentEnvelope(
    payload: unknown,
  ): payload is VersionedJsonArtifact<DocumentModel>;
  ensureNoDuplicateBlocks(model: DocumentModel): void;
}

export interface LessonSummaryRepository {
  findByLessonId(lessonId: string): Promise<LessonSummaryRecord | null>;
  findByTeacherAndVideo(teacherId: string, videoUrl: string): Promise<LessonSummaryRecord | null>;
  findActiveJobByRequestHash(requestHash: string): Promise<AIJobRecord | null>;
  findJobById(jobId: string): Promise<AIJobRecord | null>;
  createLesson(record: Omit<LessonSummaryRecord, 'createdAt' | 'updatedAt'>): Promise<LessonSummaryRecord>;
  updateLesson(lessonId: string, patch: Partial<LessonSummaryRecord>): Promise<LessonSummaryRecord>;

  createJob(record: Omit<AIJobRecord, 'createdAt' | 'updatedAt'>): Promise<AIJobRecord>;
  updateJob(jobId: string, patch: Partial<AIJobRecord>): Promise<AIJobRecord>;

  saveJsonOutput(
    lessonId: string,
    key: string,
    payload: unknown,
    artifactVersion: string,
  ): Promise<StoredAsset>;
  saveHtmlOutput(lessonId: string, html: string, artifactVersion: string): Promise<StoredAsset>;
  savePdfOutput(lessonId: string, pdf: Buffer, artifactVersion: string): Promise<StoredAsset>;
  getLatestJsonOutput<T>(lessonId: string, key: string): Promise<T | null>;

  findCache<T>(hash: string, cacheType: 'analysis' | 'content'): Promise<T | null>;
  saveCache(
    hash: string,
    cacheType: 'analysis' | 'content',
    payload: unknown,
    metadata: Record<string, unknown>,
  ): Promise<void>;

  appendLog(
    lessonId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;

  appendStageLog(lessonId: string, jobId: string, payload: StageLogPayload): Promise<void>;

  saveMetadata(
    lessonId: string,
    key: string,
    payload: Record<string, unknown>,
  ): Promise<void>;

  saveAIUsage(payload: AIUsageRecord): Promise<void>;

  setStatus(lessonId: string, status: LessonSummaryStatus, failedStage?: LessonSummaryStage): Promise<void>;
}

export interface LessonSummaryOrchestrator {
  execute(payload: LessonSummaryQueuePayload): Promise<void>;
}
