import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AppwritePostRepository.name);

  private get collectionId() {
    return COMMUNITY_COLLECTIONS.POSTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityPostEntity, 'id'>,
  ): Promise<CommunityPostEntity> {
    const metaObj = {
      postType: data.postType,
      acceptedCommentId: data.acceptedCommentId,
    };

    const fullPayload: any = {
      spaceId: data.spaceId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorRole: data.authorRole,
      authorAvatar: data.authorAvatar || null,
      content: data.content,
      tags: data.tags || [],
      reactionsCount: data.reactionsCount || 0,
      commentsCount: data.commentsCount || 0,
      isPinned: data.isPinned || false,
      isQuestion: data.isQuestion || false,
      isAnswered: data.isAnswered || false,
      isAnnouncement: data.isAnnouncement || false,
      status: data.status || 'published',
      aiMetadata: JSON.stringify(metaObj),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    try {
      const doc = await this.appwrite.databases.createDocument(
        this.appwrite.databaseId,
        this.collectionId,
        ID.unique(),
        fullPayload,
      );
      return this.mapToEntity(doc);
    } catch (err: any) {
      this.logger.warn(`Post create error, trying fallback: ${err.message}`);
      const basePayload: any = {
        spaceId: data.spaceId,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole,
        content: data.content,
        status: data.status || 'published',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        aiMetadata: JSON.stringify(metaObj),
      };

      const doc = await this.appwrite.databases.createDocument(
        this.appwrite.databaseId,
        this.collectionId,
        ID.unique(),
        basePayload,
      );
      return this.mapToEntity(doc);
    }
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

    try {
      const queries: string[] = [Query.limit(limit + 1)];
      if (query.spaceId) queries.push(Query.equal('spaceId', query.spaceId));

      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        queries,
      );

      const documents = result.documents.filter((d: any) => !d.deletedAt);
      const hasMore = documents.length > limit;
      const sliced = hasMore ? documents.slice(0, limit) : documents;

      return {
        data: sliced.map((doc) => this.mapToEntity(doc)),
        total: result.total,
        cursor: hasMore ? sliced[sliced.length - 1].$id : null,
      };
    } catch (err) {
      this.logger.warn(`findFeed query failed: ${err}`);
      return { data: [], total: 0, cursor: null };
    }
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

    try {
      const doc = await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        updateData,
      );
      return this.mapToEntity(doc);
    } catch {
      const post = await this.findById(id);
      if (!post) throw new Error('Post not found');
      return post;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        {
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );
    } catch (err) {
      this.logger.error(`Soft delete post ${id} failed: ${err}`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    try {
      await this.appwrite.databases.deleteDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
      );
    } catch (err) {
      this.logger.error(`Hard delete post ${id} failed: ${err}`);
    }
  }

  async incrementCount(
    id: string,
    field: 'reactionsCount' | 'commentsCount',
    delta: number,
  ): Promise<void> {
    const post = await this.findById(id);
    if (!post) return;
    const currentValue = (post as any)[field] || 0;
    try {
      await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        { [field]: Math.max(0, currentValue + delta) },
      );
    } catch {}
  }

  async search(
    query: string,
    spaceId?: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityPostEntity>> {
    const feed = await this.findFeed({ spaceId, limit: limit || 50 });
    const s = query.toLowerCase();
    const filtered = feed.data.filter((p) => p.content.toLowerCase().includes(s));
    return {
      data: filtered,
      total: filtered.length,
      cursor: null,
    };
  }

  private mapToEntity(doc: any): CommunityPostEntity {
    let parsedMeta: any = {};
    if (doc.aiMetadata) {
      try {
        parsedMeta = typeof doc.aiMetadata === 'string' ? JSON.parse(doc.aiMetadata) : doc.aiMetadata;
      } catch {}
    }

    return new CommunityPostEntity({
      id: doc.$id,
      spaceId: doc.spaceId,
      authorId: doc.authorId,
      authorName: doc.authorName,
      authorRole: doc.authorRole,
      authorAvatar: doc.authorAvatar || null,
      content: doc.content,
      postType: doc.postType || parsedMeta.postType || (doc.isQuestion ? 'QUESTION' : 'DISCUSSION'),
      acceptedCommentId: doc.acceptedCommentId || parsedMeta.acceptedCommentId || null,
      status: doc.status || 'published',
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
