import {
  AnalysisOutput,
  BlockType,
  DocumentBlock,
  DocumentModel,
  ImportanceLevel,
} from '../types/lesson-summary.types';

const ALLOWED_BLOCKS: ReadonlySet<BlockType> = new Set([
  'summary',
  'heading',
  'subheading',
  'definition',
  'law',
  'formula',
  'example',
  'important',
  'warning',
  'note',
  'exercise',
  'mcq',
  'table',
  'comparison',
  'mindmap',
  'timeline',
  'steps',
  'tip',
  'image_placeholder',
  'quote',
  'reference',
]);

const ALLOWED_IMPORTANCE: ReadonlySet<ImportanceLevel> = new Set([
  'low',
  'medium',
  'high',
  'critical',
]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseStrictJson<T>(raw: string): T {
  const text = raw.trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fallback for models that include markdown wrappers.
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }
}

export function validateAnalysisOutput(output: unknown): output is AnalysisOutput {
  const value = output as AnalysisOutput;
  if (!value || typeof value !== 'object') return false;

  value.mainHeadings = value.mainHeadings || [];
  value.subHeadings = value.subHeadings || [];
  value.definitions = value.definitions || [];
  value.laws = value.laws || [];
  value.formulas = value.formulas || [];
  value.examples = value.examples || [];
  value.solutionSteps = value.solutionSteps || [];
  value.keyPoints = value.keyPoints || [];
  value.teacherFocusPhrases = value.teacherFocusPhrases || [];
  value.notes = value.notes || [];
  value.teachingOrder = value.teachingOrder || [];
  value.logicalSequence = value.logicalSequence || [];
  value.lessonTitle = value.lessonTitle || 'Untitled Lesson';

  return (
    typeof value.lessonTitle === 'string' &&
    isStringArray(value.mainHeadings) &&
    isStringArray(value.subHeadings) &&
    isStringArray(value.definitions) &&
    isStringArray(value.laws) &&
    isStringArray(value.formulas) &&
    Array.isArray(value.examples) &&
    value.examples.every(
      (example) =>
        typeof example === 'object' &&
        !!example &&
        typeof example.content === 'string' &&
        (typeof example.title === 'string' || typeof example.title === 'undefined'),
    ) &&
    isStringArray(value.solutionSteps) &&
    isStringArray(value.keyPoints) &&
    isStringArray(value.teacherFocusPhrases) &&
    isStringArray(value.notes) &&
    isStringArray(value.teachingOrder) &&
    isStringArray(value.logicalSequence)
  );
}

function isValidBlock(block: DocumentBlock): boolean {
  return (
    typeof block.id === 'string' &&
    typeof block.content === 'string' &&
    !!block.metadata &&
    ALLOWED_BLOCKS.has(block.metadata.type) &&
    ALLOWED_IMPORTANCE.has(block.metadata.importance) &&
    Number.isFinite(block.metadata.priority) &&
    Number.isFinite(block.metadata.estimatedComplexity) &&
    typeof block.metadata.breakable === 'boolean' &&
    typeof block.metadata.keepTogether === 'boolean'
  );
}

export function validateDocumentModel(output: unknown): output is DocumentModel {
  const value = output as DocumentModel;
  if (!value || typeof value !== 'object') return false;

  return (
    typeof value.lessonTitle === 'string' &&
    value.language === 'ar' &&
    value.direction === 'rtl' &&
    Array.isArray(value.blocks) &&
    value.blocks.length > 0 &&
    value.blocks.every((block) => isValidBlock(block as DocumentBlock))
  );
}
