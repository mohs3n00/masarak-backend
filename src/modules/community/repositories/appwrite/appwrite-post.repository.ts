import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import {
  ICommunityPostRepository,
  PaginatedResult,
  FeedQuery,
} from '../../interfaces';
import { CommunityPostEntity } from '../../entities';
import {
  COMMUNITY_COLLECTIONS,
  COMMUNITY_DEFAULTS,
} from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwritePostRepository implements ICommunityPostRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.POSTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityPostEntity, 'id'>,
  ): Promise<CommunityPostEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      {
        ...data,
        tags: data.tags || [],
        reactionsCount: data.reactionsCount || 0,
        commentsCount: data.commentsCount || 0,
        isPinned: data.isPinned || false,
        isQuestion: data.isQuestion || false,
        isAnswered: data.isAnswered || false,
        isAnnouncement: data.isAnnouncement || false,
        status: data.status || 'published',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      },
    );
    return this.mapToEntity(doc);
  }

  async findById(id: string): Promise<CommunityPostEntity | null> {
    try {
      const doc = await this.appwrite.databases.getDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
      );
      return this.mapToEntity(doc);
    } catch {
      return null;
    }
  }

  async findFeed(
    query: FeedQuery,
  ): Promise<PaginatedResult<CommunityPostEntity>> {
    const limit = Math.min(
      query.limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );
    const queries: string[] = [
      Query.equal('status', 'published'),
      Query.isNull('deletedAt'),
      Query.orderDesc('createdAt'),
      Query.limit(limit + 1), // fetch one extra to determine if there's a next page
    ];

    if (query.spaceId) queries.push(Query.equal('spaceId', query.spaceId));
    if (query.authorId) queries.push(Query.equal('authorId', query.authorId));
    if (query.isQuestion !== undefined)
      queries.push(Query.equal('isQuestion', query.isQuestion));
    if (query.isPinned !== undefined)
      queries.push(Query.equal('isPinned', query.isPinned));
    if (query.isAnnouncement !== undefined)
      queries.push(Query.equal('isAnnouncement', query.isAnnouncement));
    if (query.cursor) queries.push(Query.cursorAfter(query.cursor));

    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      queries,
    );

    const hasMore = result.documents.length > limit;
    const documents = hasMore
      ? result.documents.slice(0, limit)
      : result.documents;
    const nextCursor = hasMore ? documents[documents.length - 1].$id : null;

    return {
      data: documents.map((doc) => this.mapToEntity(doc)),
      total: result.total,
      cursor: nextCursor,
    };
  }

  async update(
    id: string,
    data: Partial<CommunityPostEntity>,
  ): Promise<CommunityPostEntity> {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    delete updateData.id;

    const doc = await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      updateData,
    );
    return this.mapToEntity(doc);
  }

  async softDelete(id: string): Promise<void> {
    await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.appwrite.databases.deleteDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
    );
  }

  async incrementCount(
    id: string,
    field: 'reactionsCount' | 'commentsCount',
    delta: number,
  ): Promise<void> {
    const post = await this.findById(id);
    if (!post) return;
    const currentValue = post[field] || 0;
    await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      { [field]: Math.max(0, currentValue + delta) },
    );
  }

  async search(
    query: string,
    spaceId?: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityPostEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );
    const queries: string[] = [
      Query.search('content', query),
      Query.equal('status', 'published'),
      Query.isNull('deletedAt'),
      Query.limit(safeLimit + 1),
    ];

    if (spaceId) queries.push(Query.equal('spaceId', spaceId));
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

  private mapToEntity(doc: any): CommunityPostEntity {
    return new CommunityPostEntity({
      id: doc.$id,
      spaceId: doc.spaceId,
      authorId: doc.authorId,
      authorName: doc.authorName,
      authorRole: doc.authorRole,
      authorAvatar: doc.authorAvatar || null,
      content: doc.content,
      status: doc.status,
      isPinned: doc.isPinned || false,
      isQuestion: doc.isQuestion || false,
      isAnswered: doc.isAnswered || false,
      isAnnouncement: doc.isAnnouncement || false,
      reactionsCount: doc.reactionsCount || 0,
      commentsCount: doc.commentsCount || 0,
      tags: doc.tags || [],
      deletedAt: doc.deletedAt || null,
      editHistory: doc.editHistory || null,
      aiMetadata: doc.aiMetadata || null,
      createdAt: doc.createdAt || doc.$createdAt,
      updatedAt: doc.updatedAt || doc.$updatedAt,
    });
  }
}
