export const LESSON_SUMMARY_COLLECTIONS = {
  LESSONS: process.env.APPWRITE_LESSON_COLLECTION_ID || 'Lessons',
  AI_JOBS: process.env.APPWRITE_AI_JOBS_COLLECTION_ID || 'AIJobs',
  AI_OUTPUTS: process.env.APPWRITE_AI_OUTPUTS_COLLECTION_ID || 'AIOutputs',
  AI_METADATA: process.env.APPWRITE_AI_METADATA_COLLECTION_ID || 'AIMetadata',
  AI_USAGE: process.env.APPWRITE_AI_USAGE_COLLECTION_ID || 'AIUsage',
  LOGS: process.env.APPWRITE_AI_LOGS_COLLECTION_ID || 'Logs',
} as const;

export const LESSON_SUMMARY_BUCKET =
  process.env.APPWRITE_LESSON_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || 'lesson-assets';

export const LESSON_SUMMARY_VERSION = 'v1';

export const LESSON_SUMMARY_SCHEMA_VERSION = 'lesson-json-schema-v1';
export const LESSON_SUMMARY_LAYOUT_VERSION = 'layout-engine-v1';
export const LESSON_SUMMARY_RENDERER_VERSION = 'html-renderer-v1';
export const LESSON_SUMMARY_PDF_VERSION = 'pdf-renderer-v1';
export const LESSON_SUMMARY_PROMPT_DIR =
  process.env.LESSON_SUMMARY_PROMPT_DIR || 'prompts';
export const LESSON_SUMMARY_MANIFEST_PATH =
  process.env.LESSON_SUMMARY_MANIFEST_PATH ||
  'src/modules/lesson-summary/manifest/design-manifest.json';
export const LESSON_SUMMARY_QUEUE_NAME = 'lesson_summary_queue';

export const LESSON_SUMMARY_PROVIDER = {
  AGENT_1: 'openrouter:google/gemini-2.5-flash',
  AGENT_2: 'openrouter:openai/gpt-oss-120b:free',
} as const;

export const LESSON_SUMMARY_MAX_RETRIES = 3;

export const LESSON_SUMMARY_AI_TIMEOUT_MS = 90_000;

export const LESSON_SUMMARY_STAGES = [
  'analysis',
  'formatting',
  'validation',
  'layout',
  'rendering',
  'pdf',
  'upload',
] as const;
