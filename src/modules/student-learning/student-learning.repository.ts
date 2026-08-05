import { Injectable } from '@nestjs/common';
import { ID, Query } from 'node-appwrite';
import { AppwriteService } from '../../shared/appwrite/appwrite.service';

export const LEARNING_COLLECTIONS = {
  outputs: process.env.APPWRITE_AI_OUTPUTS_COLLECTION_ID || 'AIOutputs',
  materials: process.env.APPWRITE_LEARNING_MATERIALS_COLLECTION_ID || 'LearningMaterials',
  notes: process.env.APPWRITE_LEARNING_NOTES_COLLECTION_ID || 'LearningNotes',
  bookmarks: process.env.APPWRITE_LEARNING_BOOKMARKS_COLLECTION_ID || 'LearningBookmarks',
  progress: process.env.APPWRITE_LEARNING_PROGRESS_COLLECTION_ID || 'LearningProgress',
  usage: process.env.APPWRITE_LEARNING_AI_USAGE_COLLECTION_ID || 'LearningAIUsage',
} as const;

@Injectable()
export class StudentLearningRepository {
  constructor(private readonly appwrite: AppwriteService) {}

  async content(lessonId: string): Promise<unknown | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LEARNING_COLLECTIONS.outputs,
      [
        Query.equal('lessonId', lessonId),
        Query.equal('key', 'content'),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ],
    );
    try {
      return JSON.parse(result.documents[0]?.payloadJson || 'null');
    } catch {
      return null;
    }
  }

  async material(lessonId: string, type: string, version: string) {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      LEARNING_COLLECTIONS.materials,
      [
        Query.equal('lessonId', lessonId),
        Query.equal('type', type),
        Query.equal('contentVersion', version),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ],
    );
    try {
      return JSON.parse(result.documents[0]?.payloadJson || 'null');
    } catch {
      return null;
    }
  }

  async saveMaterial(
    lessonId: string,
    type: string,
    contentVersion: string,
    promptVersion: string,
    payload: unknown,
  ) {
    return this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      LEARNING_COLLECTIONS.materials,
      ID.unique(),
      { lessonId, type, contentVersion, promptVersion, payloadJson: JSON.stringify(payload), createdAt: new Date().toISOString() },
    );
  }

  async createUserRecord(collection: string, userId: string, lessonId: string, payload: Record<string, unknown>) {
    const now = new Date().toISOString();
    return this.appwrite.databases.createDocument(this.appwrite.databaseId, collection, ID.unique(), {
      userId, lessonId, ...payload, createdAt: now, updatedAt: now,
    });
  }

  async userRecords(collection: string, userId: string, lessonId: string) {
    return this.appwrite.databases.listDocuments(this.appwrite.databaseId, collection, [
      Query.equal('userId', userId), Query.equal('lessonId', lessonId), Query.orderDesc('updatedAt'),
    ]);
  }

  async saveProgress(userId: string, lessonId: string, percent: number, completed: boolean) {
    const existing = await this.userRecords(LEARNING_COLLECTIONS.progress, userId, lessonId);
    const patch = { percent, completed, updatedAt: new Date().toISOString() };
    return existing.documents[0]
      ? this.appwrite.databases.updateDocument(this.appwrite.databaseId, LEARNING_COLLECTIONS.progress, existing.documents[0].$id, patch)
      : this.createUserRecord(LEARNING_COLLECTIONS.progress, userId, lessonId, patch);
  }

  async usage(userId: string, lessonId: string, feature: string, promptVersion: string) {
    return this.appwrite.databases.createDocument(this.appwrite.databaseId, LEARNING_COLLECTIONS.usage, ID.unique(), {
      userId, lessonId, feature, promptVersion, createdAt: new Date().toISOString(),
    });
  }
}
