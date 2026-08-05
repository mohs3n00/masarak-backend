import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LESSON_SUMMARY_TOKENS } from '../constants/lesson-summary.tokens';
import {
  LESSON_SUMMARY_LAYOUT_VERSION,
  LESSON_SUMMARY_PDF_VERSION,
  LESSON_SUMMARY_RENDERER_VERSION,
  LESSON_SUMMARY_SCHEMA_VERSION,
} from '../constants/lesson-summary.constants';
import type {
  DocumentFormattingAgent,
  DocumentValidationService,
  HtmlRenderer,
  LayoutEngine,
  LessonSummaryOrchestrator,
  LessonSummaryRepository,
  PromptManager,
  PdfGenerator,
  VideoAnalysisAgent,
} from '../interfaces/lesson-summary.interfaces';
import type {
  AnalysisOutput,
  DocumentModel,
  LayoutModel,
  LessonSummaryQueuePayload,
  LessonSummaryStage,
  VersionedJsonArtifact,
  AnalysisState,
  ChunkType,
} from '../types/lesson-summary.types';
import { HashingService } from './hashing.service';
import { MediaExtractionService } from '../../media-extraction/services/media-extraction.service';
import { ExtractedTranscript } from '../../media-extraction/types/media.types';

const STAGE_ORDER: LessonSummaryStage[] = [
  'analysis',
  'formatting',
  'validation',
  'layout',
  'rendering',
  'pdf',
  'upload',
];

@Injectable()
export class LessonSummaryOrchestratorService implements LessonSummaryOrchestrator {
  constructor(
    @Inject(LESSON_SUMMARY_TOKENS.LESSON_SUMMARY_REPOSITORY)
    private readonly repository: LessonSummaryRepository,
    @Inject(LESSON_SUMMARY_TOKENS.VIDEO_ANALYSIS_AGENT)
    private readonly videoAnalysisAgent: VideoAnalysisAgent,
    @Inject(LESSON_SUMMARY_TOKENS.DOCUMENT_FORMATTING_AGENT)
    private readonly documentFormattingAgent: DocumentFormattingAgent,
    @Inject(LESSON_SUMMARY_TOKENS.LAYOUT_ENGINE)
    private readonly layoutEngine: LayoutEngine,
    @Inject(LESSON_SUMMARY_TOKENS.HTML_RENDERER)
    private readonly htmlRenderer: HtmlRenderer,
    @Inject(LESSON_SUMMARY_TOKENS.PDF_GENERATOR)
    private readonly pdfGenerator: PdfGenerator,
    @Inject(LESSON_SUMMARY_TOKENS.VALIDATION_SERVICE)
    private readonly validationService: DocumentValidationService,
    @Inject(LESSON_SUMMARY_TOKENS.PROMPT_MANAGER)
    private readonly promptManager: PromptManager,
    private readonly hashingService: HashingService,
    private readonly mediaExtractionService: MediaExtractionService,
  ) {}

  async execute(payload: LessonSummaryQueuePayload): Promise<void> {
    const lesson = await this.repository.findByLessonId(payload.lessonId);
    if (!lesson) {
      throw new Error('Lesson not found for queued job');
    }

    const artifactVersion = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const startStage = payload.forceFullPipeline ? undefined : payload.stage;

    try {
      await this.repository.updateJob(payload.jobId, {
        status: 'Analyzing',
        startedAt: new Date().toISOString(),
      });

      let analysisEnv = await this.repository.getLatestJsonOutput<VersionedJsonArtifact<AnalysisOutput>>(
        lesson.lessonId,
        'analysis',
      );

      let contentEnv = await this.repository.getLatestJsonOutput<VersionedJsonArtifact<DocumentModel>>(
        lesson.lessonId,
        'content',
      );

      let layoutEnv = await this.repository.getLatestJsonOutput<VersionedJsonArtifact<LayoutModel>>(
        lesson.lessonId,
        'layout',
      );

      let htmlText = await this.repository.getLatestJsonOutput<string>(
        lesson.lessonId,
        'lesson-html-inline',
      );

      if (this.shouldRunStage('analysis', startStage) || !analysisEnv) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Analyzing', 'analysis');

        // Extract Transcript first
        let metadata: ExtractedTranscript;
        try {
          const extraction = await this.mediaExtractionService.processMedia(lesson.videoUrl, payload.jobId);
          metadata = extraction.metadata;
        } catch (error: any) {
          if (error.message === 'TranscriptUnavailable') {
            await this.repository.setStatus(payload.lessonId, 'TranscriptUnavailable', undefined);
            await this.repository.updateJob(payload.jobId, {
              status: 'TranscriptUnavailable',
              finishedAt: new Date().toISOString(),
              errorMessage: 'Video transcript is not available',
            });
            return; // End job silently without throwing an actual error
          }
          throw error;
        }

        const modelVersion = process.env.OPENROUTER_GEMINI_MODEL || 'google/gemini-2.5-pro';
        const analysisPrompt = await this.promptManager.getPrompt('analysis');
        const analysisPromptVersion = analysisPrompt.version;
        const analysisHash = this.hashingService.buildContentHash(
          lesson.videoUrl,
          analysisPromptVersion,
          modelVersion,
        );

        const cached = await this.repository.findCache<VersionedJsonArtifact<AnalysisOutput>>(
          analysisHash,
          'analysis',
        );

        if (cached && this.validationService.validateAnalysisEnvelope(cached)) {
          analysisEnv = cached;
        } else {
          const output = await this.runChunkedAnalysis(metadata, lesson.lessonId, payload.jobId);
          analysisEnv = {
            schemaVersion: LESSON_SUMMARY_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            generatedBy: 'analysis-agent-chunked',
            model: 'chunked-models',
            promptVersion: 'chunked-v1',
            data: output,
          };

          await this.repository.saveCache(analysisHash, 'analysis', analysisEnv, {
            model: 'chunked-models',
            promptVersion: 'chunked-v1',
          });
        }

        await this.repository.saveJsonOutput(
          lesson.lessonId,
          'analysis',
          analysisEnv,
          artifactVersion,
        );

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'analysis',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          agentName: 'analysis-agent',
          model: analysisEnv.model,
          promptVersion: analysisEnv.promptVersion,
          jsonVersion: analysisEnv.schemaVersion,
        });
      }

      if (!analysisEnv || !this.validationService.validateAnalysisEnvelope(analysisEnv)) {
        throw new Error('analysis validation failed');
      }

      if (this.shouldRunStage('formatting', startStage) || !contentEnv) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Formatting', 'formatting');

        const modelVersion = process.env.OPENROUTER_CHATGPT_MODEL || 'openai/gpt-5-mini';
        const formatterPrompt = await this.promptManager.getPrompt('formatter');
        const formatterPromptVersion = formatterPrompt.version;
        const contentHash = this.hashingService.buildContentHash(
          lesson.videoUrl,
          formatterPromptVersion,
          modelVersion,
        );

        const cached = await this.repository.findCache<VersionedJsonArtifact<DocumentModel>>(
          contentHash,
          'content',
        );

        if (cached && this.validationService.validateDocumentEnvelope(cached)) {
          contentEnv = cached;
        } else {
          const formatResult = await this.documentFormattingAgent.buildDocumentModel(analysisEnv.data);
          contentEnv = {
            schemaVersion: LESSON_SUMMARY_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            generatedBy: 'formatter-agent',
            model: formatResult.metrics.model,
            promptVersion: formatResult.promptVersion,
            data: formatResult.output,
          };

          await this.repository.saveCache(contentHash, 'content', contentEnv, {
            model: formatResult.metrics.model,
            promptVersion: formatResult.promptVersion,
          });

          await this.repository.saveAIUsage({
            lessonId: lesson.lessonId,
            jobId: payload.jobId,
            agentName: 'formatter-agent',
            aiModel: formatResult.metrics.model,
            promptVersion: formatResult.promptVersion,
            inputTokens: formatResult.metrics.inputTokens,
            outputTokens: formatResult.metrics.outputTokens,
            estimatedCost: formatResult.metrics.estimatedCost,
            executionTimeMs: formatResult.metrics.executionTimeMs,
            retryCount: 0,
            status: 'Completed',
          });
        }

        await this.repository.saveJsonOutput(
          lesson.lessonId,
          'content',
          contentEnv,
          artifactVersion,
        );

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'formatting',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          agentName: 'formatter-agent',
          model: contentEnv.model,
          promptVersion: contentEnv.promptVersion,
          jsonVersion: contentEnv.schemaVersion,
        });
      }

      if (!contentEnv || !this.validationService.validateDocumentEnvelope(contentEnv)) {
        throw new Error('document model validation failed');
      }

      if (this.shouldRunStage('validation', startStage) || !contentEnv) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Validating', 'validation');
        this.validationService.ensureNoDuplicateBlocks(contentEnv.data);

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'validation',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          jsonVersion: contentEnv.schemaVersion,
        });
      }

      const designChanged = lesson.designVersion !== lesson.version;

      if (
        this.shouldRunStage('layout', startStage) ||
        !layoutEnv ||
        designChanged
      ) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Layout', 'layout');

        const layout = await this.layoutEngine.buildLayout(lesson.lessonId, contentEnv.data);
        layoutEnv = {
          schemaVersion: LESSON_SUMMARY_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          generatedBy: 'layout-engine',
          model: LESSON_SUMMARY_LAYOUT_VERSION,
          promptVersion: 'none',
          data: layout,
        };

        await this.repository.saveJsonOutput(
          lesson.lessonId,
          'layout',
          layoutEnv,
          artifactVersion,
        );

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'layout',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          model: LESSON_SUMMARY_LAYOUT_VERSION,
          jsonVersion: LESSON_SUMMARY_SCHEMA_VERSION,
        });
      }

      if (!layoutEnv) {
        throw new Error('layout generation failed');
      }

      if (this.shouldRunStage('rendering', startStage) || !htmlText || designChanged) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Rendering', 'rendering');

        htmlText = await this.htmlRenderer.render(layoutEnv.data);
        await this.repository.saveJsonOutput(
          lesson.lessonId,
          'lesson-html-inline',
          htmlText,
          artifactVersion,
        );
        await this.repository.saveHtmlOutput(lesson.lessonId, htmlText, artifactVersion);

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'rendering',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          model: LESSON_SUMMARY_RENDERER_VERSION,
          jsonVersion: LESSON_SUMMARY_SCHEMA_VERSION,
        });
      }

      if (!htmlText) {
        throw new Error('html rendering failed');
      }

      let pdfUrl = lesson.pdfUrl;
      let htmlUrl = lesson.htmlUrl;
      let analysisUrl = lesson.jsonUrl;

      if (this.shouldRunStage('pdf', startStage) || this.shouldRunStage('upload', startStage)) {
        const started = Date.now();
        await this.transition(payload.lessonId, payload.jobId, 'Generating PDF', 'pdf');
        const pdfBuffer = await this.pdfGenerator.generate(htmlText);

        await this.transition(payload.lessonId, payload.jobId, 'Uploading', 'upload');
        const pdfAsset = await this.repository.savePdfOutput(
          lesson.lessonId,
          pdfBuffer,
          artifactVersion,
        );
        const htmlAsset = await this.repository.saveHtmlOutput(
          lesson.lessonId,
          htmlText,
          artifactVersion,
        );
        const analysisAsset = await this.repository.saveJsonOutput(
          lesson.lessonId,
          'analysis',
          analysisEnv,
          artifactVersion,
        );

        pdfUrl = pdfAsset.url;
        htmlUrl = htmlAsset.url;
        analysisUrl = analysisAsset.url;

        await this.repository.appendStageLog(lesson.lessonId, payload.jobId, {
          stage: 'pdf',
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: 'Completed',
          model: LESSON_SUMMARY_PDF_VERSION,
          jsonVersion: LESSON_SUMMARY_SCHEMA_VERSION,
        });
      }

      await this.repository.updateLesson(lesson.lessonId, {
        status: 'Completed',
        summaryStatus: 'Completed',
        pdfUrl,
        htmlUrl,
        jsonUrl: analysisUrl,
        failedStage: undefined,
        version: lesson.designVersion,
        latestArtifactVersion: artifactVersion,
      });

      await this.repository.updateJob(payload.jobId, {
        status: 'Completed',
        stage: undefined,
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      const stage = this.inferFailedStage(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown failure';

      await this.repository.setStatus(payload.lessonId, 'Failed', stage);
      await this.repository.updateJob(payload.jobId, {
        status: 'Failed',
        stage,
        finishedAt: new Date().toISOString(),
        errorMessage,
      });

      await this.repository.appendStageLog(payload.lessonId, payload.jobId, {
        stage,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0,
        status: 'Failed',
        errorMessage,
      });

      throw error;
    }
  }

  private shouldRunStage(stage: LessonSummaryStage, startStage?: LessonSummaryStage): boolean {
    if (!startStage) {
      return true;
    }

    return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(startStage);
  }

  private async transition(
    lessonId: string,
    jobId: string,
    status:
      | 'Analyzing'
      | 'Formatting'
      | 'Validating'
      | 'Layout'
      | 'Rendering'
      | 'Generating PDF'
      | 'Uploading',
    stage: LessonSummaryStage,
  ): Promise<void> {
    await this.repository.setStatus(lessonId, status, undefined);
    await this.repository.updateJob(jobId, { status, stage });
    await this.repository.appendLog(lessonId, 'info', `stage:${stage}`, {
      jobId,
      stage,
      status,
    });
  }

  private async runChunkedAnalysis(
    metadata: ExtractedTranscript,
    lessonId: string,
    jobId: string,
  ): Promise<AnalysisOutput> {
    let state = await this.repository.getLatestJsonOutput<AnalysisState>(lessonId, 'analysis_state');
    
    if (!state) {
      state = {
        lessonId,
        videoUrl: metadata.videoId, // use videoId or just store it
        chaptersCompleted: {},
        chapterData: {},
        isMerged: false,
      };
    }

    if (!state.structure) {
      const structureResult = await this.videoAnalysisAgent.extractStructure(metadata);
      state.structure = structureResult.output;
      await this.repository.saveJsonOutput(lessonId, 'analysis_state', state, '1.0');
      await this.repository.saveAIUsage({
        lessonId,
        jobId,
        agentName: 'analysis-agent-structure',
        aiModel: structureResult.metrics.model,
        promptVersion: 'structure-v1',
        inputTokens: structureResult.metrics.inputTokens,
        outputTokens: structureResult.metrics.outputTokens,
        estimatedCost: structureResult.metrics.estimatedCost,
        executionTimeMs: structureResult.metrics.executionTimeMs,
        retryCount: 0,
        status: 'Completed',
      });
    }

    const chunkTypes: ChunkType[] = ['definitions_laws_formulas', 'examples_solutions', 'notes_keypoints'];

    for (const chapter of state.structure.chapters) {
      const chapterId = chapter.title;
      if (!state.chaptersCompleted[chapterId]) {
        state.chaptersCompleted[chapterId] = {
          definitions_laws_formulas: false,
          examples_solutions: false,
          notes_keypoints: false,
        };
        state.chapterData[chapterId] = {};
      }

      for (const chunkType of chunkTypes) {
        if (!state.chaptersCompleted[chapterId][chunkType]) {
            const chunkResult = await this.videoAnalysisAgent.extractChapterChunk(
              metadata,
              chapter,
              chunkType,
            );
          state.chapterData[chapterId] = {
            ...state.chapterData[chapterId],
            ...chunkResult.output,
          };
          state.chaptersCompleted[chapterId][chunkType] = true;
          
          await this.repository.saveJsonOutput(lessonId, 'analysis_state', state, '1.0');
          await this.repository.saveAIUsage({
            lessonId,
            jobId,
            agentName: `analysis-agent-${chunkType}`,
            aiModel: chunkResult.metrics.model,
            promptVersion: 'chunk-v1',
            inputTokens: chunkResult.metrics.inputTokens,
            outputTokens: chunkResult.metrics.outputTokens,
            estimatedCost: chunkResult.metrics.estimatedCost,
            executionTimeMs: chunkResult.metrics.executionTimeMs,
            retryCount: 0,
            status: 'Completed',
          });
        }
      }
    }

    if (!state.isMerged) {
      const merged: AnalysisOutput = {
        lessonTitle: state.structure.lessonTitle,
        mainHeadings: state.structure.mainHeadings || [],
        teachingOrder: state.structure.teachingOrder || [],
        subHeadings: [],
        definitions: [],
        laws: [],
        formulas: [],
        examples: [],
        solutionSteps: [],
        keyPoints: [],
        teacherFocusPhrases: [],
        notes: [],
        logicalSequence: [],
      };

      for (const chapter of state.structure.chapters) {
        const data = state.chapterData[chapter.title];
        if (!data) continue;
        if (data.definitions) merged.definitions.push(...data.definitions);
        if (data.laws) merged.laws.push(...data.laws);
        if (data.formulas) merged.formulas.push(...data.formulas);
        if (data.examples) merged.examples.push(...data.examples);
        if (data.solutionSteps) merged.solutionSteps.push(...data.solutionSteps);
        if (data.keyPoints) merged.keyPoints.push(...data.keyPoints);
        if (data.teacherFocusPhrases) merged.teacherFocusPhrases.push(...data.teacherFocusPhrases);
        if (data.notes) merged.notes.push(...data.notes);
        if (data.subHeadings) merged.subHeadings.push(...data.subHeadings);
      }

      state.globalData = merged;
      state.isMerged = true;
      await this.repository.saveJsonOutput(lessonId, 'analysis_state', state, '1.0');
    }

    return state.globalData as AnalysisOutput;
  }

  private inferFailedStage(error: unknown): LessonSummaryStage {
    const text = error instanceof Error ? error.message.toLowerCase() : 'unknown';
    if (text.includes('analysis')) return 'analysis';
    if (text.includes('format') || text.includes('document')) return 'formatting';
    if (text.includes('valid')) return 'validation';
    if (text.includes('layout')) return 'layout';
    if (text.includes('render')) return 'rendering';
    if (text.includes('pdf')) return 'pdf';
    if (text.includes('credit') || text.includes('afford')) return 'analysis'; // Credit errors usually happen during AI calls
    return 'upload';
  }
}
