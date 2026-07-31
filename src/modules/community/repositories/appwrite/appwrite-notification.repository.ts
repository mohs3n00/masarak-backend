import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunityNotificationRepository } from '../../interfaces';
import { PaginatedResult } from '../../interfaces/community-post.repository';
import { CommunityNotificationEntity } from '../../entities';
import {
  COMMUNITY_COLLECTIONS,
  COMMUNITY_DEFAULTS,
} from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteNotificationRepository implements ICommunityNotificationRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.NOTIFICATIONS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityNotificationEntity, 'id'>,
  ): Promise<CommunityNotificationEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      { ...data, isRead: false, createdAt: new Date().toISOString() },
    );
    return this.mapToEntity(doc);
  }

  async findByUser(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityNotificationEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );
    const queries: string[] = [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(safeLimit + 1),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      queries,
    );

    const hasMore = result.documents.length > safeLimit;
    const documents = hasMore
      ? result.documents.slice(0, safeLimit)
      : result.documents;

    return {
      data: documents.map((doc) => this.mapToEntity(doc)),
      total: result.total,
      cursor: hasMore ? documents[documents.length - 1].$id : null,
    };
  }

  async markAsRead(id: string): Promise<void> {
    await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('userId', userId),
        Query.equal('isRead', false),
        Query.limit(100),
      ],
    );
    await Promise.allSettled(
      result.documents.map((doc) =>
        this.appwrite.databases.updateDocument(
          this.appwrite.databaseId,
          this.collectionId,
          doc.$id,
          { isRead: true },
        ),
      ),
    );
  }

  async countUnread(userId: string): Promise<number> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('userId', userId),
        Query.equal('isRead', false),
        Query.limit(0),
      ],
    );
    return result.total;
  }

  private mapToEntity(doc: any): CommunityNotificationEntity {
    return new CommunityNotificationEntity({
      id: doc.$id,
      userId: doc.userId,
      type: doc.type,
      actorId: doc.actorId,
      actorName: doc.actorName,
      targetId: doc.targetId,
      targetType: doc.targetType,
      message: doc.message,
      isRead: doc.isRead || false,
      createdAt: doc.createdAt || doc.$createdAt,
    });
  }
}
