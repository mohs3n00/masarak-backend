import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MediaExtractionModule } from '../media-extraction/media-extraction.module';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { LessonSummaryController } from './lesson-summary.controller';
import { LessonSummaryService } from './services/lesson-summary.service';
import { LESSON_SUMMARY_TOKENS } from './constants/lesson-summary.tokens';
import { VideoAnalysisAgentService } from './services/video-analysis-agent.service';
import { DocumentFormattingAgentService } from './services/document-formatting-agent.service';
import { LayoutEngineService } from './services/layout-engine.service';
import { HtmlRendererService } from './services/html-renderer.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { AppwriteLessonSummaryRepository } from './repositories/appwrite-lesson-summary.repository';
import { AIProviderAdapter } from './services/ai-provider.adapter';
import { PromptManagerService } from './services/prompt-manager.service';
import { DocumentValidationServiceImpl } from './services/document-validation.service';
import { LessonSummaryOrchestratorService } from './services/lesson-summary-orchestrator.service';
import { LessonSummaryProcessor } from './workers/lesson-summary.processor';
import { HashingService } from './services/hashing.service';

@Module({
  imports: [
    MediaExtractionModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.LESSON_SUMMARY,
    }),
  ],
  controllers: [LessonSummaryController],
  providers: [
    AIProviderAdapter,
    PromptManagerService,
    HashingService,
    LessonSummaryService,
    LessonSummaryOrchestratorService,
    LessonSummaryProcessor,
    {
      provide: LESSON_SUMMARY_TOKENS.LESSON_SUMMARY_REPOSITORY,
      useClass: AppwriteLessonSummaryRepository,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.PROMPT_MANAGER,
      useClass: PromptManagerService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.VALIDATION_SERVICE,
      useClass: DocumentValidationServiceImpl,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.ORCHESTRATOR_SERVICE,
      useClass: LessonSummaryOrchestratorService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.VIDEO_ANALYSIS_AGENT,
      useClass: VideoAnalysisAgentService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.DOCUMENT_FORMATTING_AGENT,
      useClass: DocumentFormattingAgentService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.LAYOUT_ENGINE,
      useClass: LayoutEngineService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.HTML_RENDERER,
      useClass: HtmlRendererService,
    },
    {
      provide: LESSON_SUMMARY_TOKENS.PDF_GENERATOR,
      useClass: PdfGeneratorService,
    },
  ],
  exports: [LessonSummaryService],
})
export class LessonSummaryModule {}
