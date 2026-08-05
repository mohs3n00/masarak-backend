import { Injectable } from '@nestjs/common';
import { ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { AppwriteService } from '../../../shared/appwrite/appwrite.service';
import {
  LESSON_SUMMARY_BUCKET,
  LESSON_SUMMARY_COLLECTIONS,
} from '../constants/lesson-summary.constants';
import type {
  AIJobRecord,
  AIUsageRecord,
  LessonSummaryRecord,
  LessonSummaryStage,
  LessonSummaryStatus,
  StageLogPayload,
} from '../types/lesson-summary.types';
import type {
  LessonSummaryRepository,
  StoredAsset,
} from '../interfaces/lesson-summary.interfaces';

/** Remove undefined values so Appwrite doesn't throw 'Unknown attribute' errors */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const ACTIVE_JOB_STATUSES: LessonSummaryStatus[] = [
  'Pending',
  'Analyzing',
  'Formatting',
  'Validating',
  'Layout',
  'Rendering',
  'Generating PDF',
  'Uploading',
];

@Injectable()
export class AppwriteLessonSummaryRepository implements LessonSummaryRepository {
  constructor(private readonly appwrite: AppwriteService) {}

  async findByLessonId(lessonId: string): Promise<LessonSummaryRecord | null> {
    try {
      const doc = await this.appwrite.databases.getDocument(
        this.appwrite.databaseId,
        LESSON_SUMMARY_COLLECTIONS.LESSONS,
        lessonId,
      );
      return this.mapLesson(doc);
    } catch {
      return null;
    }
  }

  async findByTeacherAndVideo(
    teacherId: string,
    videoUrl: string,
  ): Promise<LessonSummaryRecord | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.LESSONS,
      [
        Query.equal('teacherId', teacherId),
        Query.equal('videoUrl', videoUrl),
        Query.limit(1),
      ],
    );

    return result.documents[0] ? this.mapLesson(result.documents[0]) : null;
  }

  async findActiveJobByRequestHash(requestHash: string): Promise<AIJobRecord | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_JOBS,
      [
        Query.equal('requestHash', requestHash),
        Query.equal('status', ACTIVE_JOB_STATUSES),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ],
    );

    return result.documents[0] ? this.mapJob(result.documents[0]) : null;
  }

  async findJobById(jobId: string): Promise<AIJobRecord | null> {
    try {
      const doc = await this.appwrite.databases.getDocument(
        this.appwrite.databaseId,
        LESSON_SUMMARY_COLLECTIONS.AI_JOBS,
        jobId,
      );
      return this.mapJob(doc);
    } catch {
      return null;
    }
  }

  async createLesson(
    record: Omit<LessonSummaryRecord, 'createdAt' | 'updatedAt'>,
  ): Promise<LessonSummaryRecord> {
    const now = new Date().toISOString();
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.LESSONS,
      record.lessonId,
      stripUndefined({
        ...record,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return this.mapLesson(doc);
  }

  async updateLesson(
    lessonId: string,
    patch: Partial<LessonSummaryRecord>,
  ): Promise<LessonSummaryRecord> {
    const doc = await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.LESSONS,
      lessonId,
      stripUndefined({
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.mapLesson(doc);
  }

  async createJob(
    record: Omit<AIJobRecord, 'createdAt' | 'updatedAt'>,
  ): Promise<AIJobRecord> {
    const now = new Date().toISOString();
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_JOBS,
      record.jobId,
      stripUndefined({
        ...record,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return this.mapJob(doc);
  }

  async updateJob(jobId: string, patch: Partial<AIJobRecord>): Promise<AIJobRecord> {
    const doc = await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_JOBS,
      jobId,
      stripUndefined(patch),
    );

    return this.mapJob(doc);
  }

  async saveJsonOutput(
    lessonId: string,
    key: string,
    payload: unknown,
    artifactVersion: string,
  ): Promise<StoredAsset> {
    const fileName = `${key}.json`;
    const jsonText = JSON.stringify(payload, null, 2);
    const uploaded = await this.uploadBuffer(
      lessonId,
      fileName,
      Buffer.from(jsonText, 'utf8'),
      artifactVersion,
    );

    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_OUTPUTS,
      ID.unique(),
      {
        lessonId,
        key,
        fileId: uploaded.fileId,
        path: uploaded.path,
        url: uploaded.url,
        artifactVersion,
        payloadJson: JSON.stringify(payload),
      },
    );

    return uploaded;
  }

  async saveHtmlOutput(
    lessonId: string,
    html: string,
    artifactVersion: string,
  ): Promise<StoredAsset> {
    const uploaded = await this.uploadBuffer(
      lessonId,
      'lesson.html',
      Buffer.from(html, 'utf8'),
      artifactVersion,
    );

    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_OUTPUTS,
      ID.unique(),
      {
        lessonId,
        key: 'lesson.html',
        fileId: uploaded.fileId,
        path: uploaded.path,
        url: uploaded.url,
        artifactVersion,
        payloadJson: null,
      },
    );

    return uploaded;
  }

  async savePdfOutput(
    lessonId: string,
    pdf: Buffer,
    artifactVersion: string,
  ): Promise<StoredAsset> {
    const uploaded = await this.uploadBuffer(
      lessonId,
      'lesson.pdf',
      pdf,
      artifactVersion,
    );

    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_OUTPUTS,
      ID.unique(),
      {
        lessonId,
        key: 'lesson.pdf',
        fileId: uploaded.fileId,
        path: uploaded.path,
        url: uploaded.url,
        artifactVersion,
        payloadJson: null,
      },
    );

    return uploaded;
  }

  async getLatestJsonOutput<T>(lessonId: string, key: string): Promise<T | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_OUTPUTS,
      [
        Query.equal('lessonId', lessonId),
        Query.equal('key', key),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ],
    );

    const output = result.documents[0];
    if (!output?.payloadJson) {
      return null;
    }

    try {
      return JSON.parse(output.payloadJson) as T;
    } catch {
      return null;
    }
  }

  async findCache<T>(
    hash: string,
    cacheType: 'analysis' | 'content',
  ): Promise<T | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_METADATA,
      [
        Query.equal('key', `cache:${cacheType}:${hash}`),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ],
    );

    const cache = result.documents[0];
    if (!cache?.payloadJson) {
      return null;
    }

    try {
      return JSON.parse(cache.payloadJson) as T;
    } catch {
      return null;
    }
  }

  async saveCache(
    hash: string,
    cacheType: 'analysis' | 'content',
    payload: unknown,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_METADATA,
      ID.unique(),
      {
        lessonId: 'cache',
        key: `cache:${cacheType}:${hash}`,
        cacheHash: hash,
        type: cacheType,
        payloadJson: JSON.stringify(payload),
        metadataJson: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
  }

  async appendLog(
    lessonId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.LOGS,
      ID.unique(),
      stripUndefined({
        lessonId,
        jobId: metadata?.jobId || null,
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  async appendStageLog(
    lessonId: string,
    jobId: string,
    payload: StageLogPayload,
  ): Promise<void> {
    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.LOGS,
      ID.unique(),
      stripUndefined({
        lessonId,
        jobId,
        level: payload.status === 'Failed' ? 'error' : 'info',
        message: `Stage ${payload.stage} ${payload.status}`,
        metadata: JSON.stringify(payload),
        createdAt: new Date().toISOString(),
      }),
    );
  }

  async saveMetadata(
    lessonId: string,
    key: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_METADATA,
      ID.unique(),
      {
        lessonId,
        key,
        cacheHash: key,
        type: 'metadata',
        payloadJson: JSON.stringify(payload),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
  }

  async saveAIUsage(payload: AIUsageRecord): Promise<void> {
    await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LESSON_SUMMARY_COLLECTIONS.AI_USAGE,
      ID.unique(),
      {
        ...payload,
        estimatedCost: String(payload.estimatedCost),
        createdAt: new Date().toISOString(),
      },
    );
  }

  async setStatus(
    lessonId: string,
    status: LessonSummaryStatus,
    failedStage?: LessonSummaryStage,
  ): Promise<void> {
    await this.updateLesson(lessonId, {
      status,
      summaryStatus: status,
      failedStage,
    });
  }

  private async uploadBuffer(
    lessonId: string,
    fileName: string,
    content: Buffer,
    artifactVersion: string,
  ): Promise<StoredAsset> {
    const path = `${lessonId}/${artifactVersion}/${fileName}`;
    const file = InputFile.fromBuffer(content, path);
    const uploaded = await this.appwrite.storage.createFile(
      LESSON_SUMMARY_BUCKET,
      ID.unique(),
      file,
    );

    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const url = `${endpoint}/storage/buckets/${LESSON_SUMMARY_BUCKET}/files/${uploaded.$id}/view?project=${projectId}`;

    return {
      fileId: uploaded.$id,
      path,
      url,
      artifactVersion,
    };
  }

  private mapLesson(doc: any): LessonSummaryRecord {
    return {
      lessonId: doc.lessonId || doc.$id,
      teacherId: doc.teacherId,
      videoUrl: doc.videoUrl,
      status: doc.status,
      summaryStatus: doc.summaryStatus,
      pdfUrl: doc.pdfUrl || undefined,
      htmlUrl: doc.htmlUrl || undefined,
      jsonUrl: doc.jsonUrl || undefined,
      createdAt: doc.createdAt || doc.$createdAt,
      updatedAt: doc.updatedAt || doc.$updatedAt,
      version: doc.version,
      failedStage: doc.failedStage || undefined,
      designVersion: doc.designVersion || 'v1',
      lastJobId: doc.lastJobId || undefined,
      latestArtifactVersion: doc.latestArtifactVersion || undefined,
    };
  }

  private mapJob(doc: any): AIJobRecord {
    return {
      jobId: doc.jobId || doc.$id,
      lessonId: doc.lessonId,
      status: doc.status,
      stage: doc.stage,
      retries: doc.retries || 0,
      errorMessage: doc.errorMessage || undefined,
      createdAt: doc.createdAt || doc.$createdAt,
      updatedAt: doc.updatedAt || doc.$updatedAt,
      requestHash: doc.requestHash || undefined,
      startedAt: doc.startedAt || undefined,
      finishedAt: doc.finishedAt || undefined,
    };
  }
}
