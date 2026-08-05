import { registerAs } from '@nestjs/config';

export default registerAs('lessonSummary', () => ({
  openRouterEndpoint:
    process.env.OPENROUTER_ENDPOINT ||
    'https://openrouter.ai/api/v1/chat/completions',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // Agent 1: video analysis only.
  geminiModel: process.env.OPENROUTER_GEMINI_MODEL || 'google/gemini-2.5-flash',
  // Agent 2: document-model formatting only. The free variant keeps Phase 1 affordable.
  formatterModel: process.env.OPENROUTER_FORMATTER_MODEL || 'openai/gpt-oss-120b:free',
  formatterFallbackModel: process.env.OPENROUTER_FORMATTER_FALLBACK_MODEL || 'openrouter/free',
  designVersion: process.env.LESSON_SUMMARY_DESIGN_VERSION || 'v1',
  promptDir: process.env.LESSON_SUMMARY_PROMPT_DIR || 'prompts',
  manifestPath:
    process.env.LESSON_SUMMARY_MANIFEST_PATH ||
    'src/modules/lesson-summary/manifest/design-manifest.json',
  jsonSchemaVersion:
    process.env.LESSON_SUMMARY_JSON_SCHEMA_VERSION || 'lesson-json-schema-v1',
  layoutEngineVersion:
    process.env.LESSON_SUMMARY_LAYOUT_VERSION || 'layout-engine-v1',
  htmlRendererVersion:
    process.env.LESSON_SUMMARY_HTML_RENDERER_VERSION || 'html-renderer-v1',
  pdfRendererVersion:
    process.env.LESSON_SUMMARY_PDF_RENDERER_VERSION || 'pdf-renderer-v1',
}));
