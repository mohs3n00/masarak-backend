export type LessonSummaryStatus =
  | 'Pending'
  | 'Analyzing'
  | 'Formatting'
  | 'Validating'
  | 'Layout'
  | 'Rendering'
  | 'Uploading'
  | 'Completed'
  | 'Failed'
  | 'TranscriptUnavailable';

export type LessonSummaryStage =
  | 'analysis'
  | 'formatting'
  | 'validation'
  | 'layout'
  | 'rendering'
  | 'upload';

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';

export type BlockType =
  | 'summary'
  | 'heading'
  | 'subheading'
  | 'definition'
  | 'law'
  | 'formula'
  | 'example'
  | 'important'
  | 'warning'
  | 'note'
  | 'exercise'
  | 'mcq'
  | 'table'
  | 'comparison'
  | 'mindmap'
  | 'timeline'
  | 'steps'
  | 'tip'
  | 'image_placeholder'
  | 'quote'
  | 'reference';

export interface AnalysisOutput {
  lessonTitle: string;
  mainHeadings: string[];
  subHeadings: string[];
  definitions: string[];
  laws: string[];
  formulas: string[];
  examples: Array<{ title?: string; content: string }>;
  solutionSteps: string[];
  keyPoints: string[];
  teacherFocusPhrases: string[];
  notes: string[];
  teachingOrder: string[];
  logicalSequence: string[];
  rawTranscriptHints?: string[];
}

export interface StructureExtractionOutput {
  lessonTitle: string;
  mainHeadings: string[];
  teachingOrder: string[];
  chapters: Array<{
    title: string;
    startTime: string;
    endTime: string;
  }>;
}

export type ChunkType = 'definitions_laws_formulas' | 'examples_solutions' | 'notes_keypoints';

export interface ChapterChunkOutput {
  definitions?: string[];
  laws?: string[];
  formulas?: string[];
  examples?: Array<{ title?: string; content: string }>;
  solutionSteps?: string[];
  keyPoints?: string[];
  notes?: string[];
  teacherFocusPhrases?: string[];
  subHeadings?: string[];
}

export interface AnalysisState {
  lessonId: string;
  videoUrl: string;
  structure?: StructureExtractionOutput;
  chaptersCompleted: Record<string, Record<ChunkType, boolean>>;
  chapterData: Record<string, ChapterChunkOutput>;
  globalData?: Partial<AnalysisOutput>;
  isMerged: boolean;
}

export interface DocumentBlockMetadata {
  type: BlockType;
  importance: ImportanceLevel;
  priority: number;
  breakable: boolean;
  keepTogether: boolean;
  estimatedComplexity: number;
}

export interface DocumentBlock {
  id: string;
  metadata: DocumentBlockMetadata;
  title?: string;
  content: string;
  items?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface DocumentModel {
  lessonTitle: string;
  language: 'ar';
  direction: 'rtl';
  blocks: DocumentBlock[];
}

export interface LayoutItem {
  blockId: string;
  type: BlockType;
  designComponent?: string;
  estimatedHeight: number;
  breakable: boolean;
  keepTogether: boolean;
  payload: DocumentBlock;
}

export interface LayoutPage {
  pageNumber: number;
  items: LayoutItem[];
}

export interface LayoutModel {
  lessonId: string;
  lessonTitle: string;
  pageSize: 'A4';
  pages: LayoutPage[];
  header: string;
  footerTemplate: string;
}

export interface LessonSummaryRecord {
  lessonId: string;
  teacherId: string;
  videoUrl: string;
  status: LessonSummaryStatus;
  summaryStatus: LessonSummaryStatus;
  pdfUrl?: string;
  htmlUrl?: string;
  jsonUrl?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  failedStage?: LessonSummaryStage;
  designVersion: string;
  lastJobId?: string;
  latestArtifactVersion?: string;
}

export interface AIJobRecord {
  jobId: string;
  lessonId: string;
  status: LessonSummaryStatus;
  stage?: LessonSummaryStage;
  retries: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  requestHash?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface VersionedJsonArtifact<T> {
  schemaVersion: string;
  createdAt: string;
  generatedBy: string;
  model: string;
  promptVersion: string;
  data: T;
}

export interface PromptDefinition {
  name: 'analysis' | 'formatter' | 'retry';
  version: string;
  content: string;
}

export interface AIUsageRecord {
  lessonId: string;
  jobId: string;
  agentName: string;
  aiModel: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  executionTimeMs: number;
  retryCount: number;
  status: 'Completed' | 'Failed';
  errorMessage?: string;
}

export interface AIExecutionMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  executionTimeMs: number;
}

export interface LessonSummaryQueuePayload {
  lessonId: string;
  jobId: string;
  stage?: LessonSummaryStage;
  requestedBy: string;
  forceFullPipeline?: boolean;
}

export interface StageLogPayload {
  stage: LessonSummaryStage;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'Completed' | 'Failed';
  agentName?: string;
  model?: string;
  promptVersion?: string;
  jsonVersion?: string;
  errorMessage?: string;
}
