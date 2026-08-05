import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { LessonSummaryOrchestratorService } from '../services/lesson-summary-orchestrator.service';
import type { LessonSummaryQueuePayload } from '../types/lesson-summary.types';

@Processor(QUEUE_NAMES.LESSON_SUMMARY, {
  concurrency: 5,
})
export class LessonSummaryProcessor extends WorkerHost {
  constructor(
    private readonly orchestrator: LessonSummaryOrchestratorService,
  ) {
    super();
  }

  async process(job: Job<LessonSummaryQueuePayload>): Promise<void> {
    await this.orchestrator.execute(job.data);
  }
}
