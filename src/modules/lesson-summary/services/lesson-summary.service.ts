import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { LESSON_SUMMARY_TOKENS } from '../constants/lesson-summary.tokens';
import { CreateLessonSummaryDto } from '../dto/create-lesson-summary.dto';
import { RetryLessonSummaryDto } from '../dto/retry-lesson-summary.dto';
import type { LessonSummaryRepository } from '../interfaces/lesson-summary.interfaces';
import type {
  LessonSummaryQueuePayload,
  LessonSummaryRecord,
  LessonSummaryStage,
} from '../types/lesson-summary.types';
import { LESSON_SUMMARY_VERSION } from '../constants/lesson-summary.constants';
import { HashingService } from './hashing.service';

@Injectable()
export class LessonSummaryService {
  constructor(
    @Inject(LESSON_SUMMARY_TOKENS.LESSON_SUMMARY_REPOSITORY)
    private readonly repository: LessonSummaryRepository,
    @InjectQueue(QUEUE_NAMES.LESSON_SUMMARY)
    private readonly lessonQueue: Queue<LessonSummaryQueuePayload>,
    private readonly hashingService: HashingService,
  ) {}

  async start(teacherId: string, dto: CreateLessonSummaryDto) {
    const existing = await this.repository.findByTeacherAndVideo(teacherId, dto.videoUrl);
    const lessonId = dto.lessonId || existing?.lessonId || randomUUID();

    const designVersion = dto.designVersion || 'v1';
    const lesson = existing
      ? await this.repository.updateLesson(lessonId, {
          designVersion,
          failedStage: undefined,
        })
      : await this.repository.createLesson({
          lessonId,
          teacherId,
          videoUrl: dto.videoUrl,
          status: 'Pending',
          summaryStatus: 'Pending',
          version: LESSON_SUMMARY_VERSION,
          designVersion,
        });

    const requestHash = this.hashingService.buildRequestHash(teacherId, lessonId);
    const activeJob = await this.repository.findActiveJobByRequestHash(requestHash);
    if (activeJob) {
      return {
        accepted: true,
        lessonId,
        jobId: activeJob.jobId,
        status: activeJob.status,
        reused: true,
      };
    }

    const created = await this.repository.createJob({
      jobId: randomUUID(),
      lessonId,
      status: 'Pending',
      retries: 0,
      requestHash,
      stage: undefined,
    });

    await this.repository.updateLesson(lessonId, {
      status: 'Pending',
      summaryStatus: 'Pending',
      lastJobId: created.jobId,
    });

    await this.enqueueJob({
      lessonId,
      jobId: created.jobId,
      requestedBy: teacherId,
    });

    return {
      accepted: true,
      lessonId,
      jobId: created.jobId,
      status: 'Pending',
      reused: false,
    };
  }

  async retry(teacherId: string, lessonId: string, dto: RetryLessonSummaryDto) {
    const lesson = await this.repository.findByLessonId(lessonId);
    if (!lesson || lesson.teacherId !== teacherId) {
      throw new NotFoundException('Lesson summary not found');
    }

    if (lesson.status === 'Completed' && !dto.stage) {
      throw new ConflictException('Lesson summary is already completed');
    }

    const stage = (dto.stage || lesson.failedStage) as LessonSummaryStage | undefined;
    const requestHash = this.hashingService.buildRequestHash(teacherId, lessonId, stage);
    const activeJob = await this.repository.findActiveJobByRequestHash(requestHash);
    if (activeJob) {
      return {
        accepted: true,
        lessonId,
        jobId: activeJob.jobId,
        status: activeJob.status,
        stage,
        reused: true,
      };
    }

    const job = await this.repository.createJob({
      jobId: randomUUID(),
      lessonId,
      status: 'Pending',
      retries: 0,
      stage,
      requestHash,
    });

    await this.repository.updateLesson(lessonId, {
      status: 'Pending',
      summaryStatus: 'Pending',
      failedStage: undefined,
      lastJobId: job.jobId,
    });

    await this.enqueueJob({
      lessonId,
      jobId: job.jobId,
      stage,
      requestedBy: teacherId,
      forceFullPipeline: false,
    });

    return {
      accepted: true,
      lessonId,
      jobId: job.jobId,
      status: 'Pending',
      stage,
      reused: false,
    };
  }

  async getByLessonId(lessonId: string): Promise<LessonSummaryRecord> {
    const lesson = await this.repository.findByLessonId(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lesson summary not found');
    }

    return lesson;
  }

  private async enqueueJob(payload: LessonSummaryQueuePayload): Promise<void> {
    await this.lessonQueue.add('lesson-summary', payload, {
      jobId: payload.jobId,
      attempts: 5,
      removeOnComplete: 100,
      removeOnFail: 100,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
