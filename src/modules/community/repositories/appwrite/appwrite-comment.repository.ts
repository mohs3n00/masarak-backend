import { Injectable, Logger } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunityCommentRepository } from '../../interfaces';
import { PaginatedResult } from '../../interfaces/community-post.repository';
import { CommunityCommentEntity } from '../../entities';
import {
  COMMUNITY_COLLECTIONS,
  COMMUNITY_DEFAULTS,
} from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteCommentRepository implements ICommunityCommentRepository {
  private readonly logger = new Logger(AppwriteCommentRepository.name);

  private get collectionId() {
    return COMMUNITY_COLLECTIONS.COMMENTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityCommentEntity, 'id'>,
  ): Promise<CommunityCommentEntity> {
    const metaObj = {
      isAccepted: data.isAccepted,
      isTeacherAnswer: data.isTeacherAnswer,
    };

    const fullPayload: any = {
      postId: data.postId,
      parentId: data.parentId || null,
      authorId: data.authorId,
      authorName: data.authorName,
      authorRole: data.authorRole,
      authorAvatar: data.authorAvatar || null,
      content: data.content,
      reactionsCount: 0,
      repliesCount: 0,
      editHistory: JSON.stringify(metaObj),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      this.logger.warn(`Comment create fallback triggered: ${err.message}`);
      const basePayload: any = {
        postId: data.postId,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole,
        content: data.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  async findById(id: string): Promise<CommunityCommentEntity | null> {
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

  async findByPost(
    postId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityCommentEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );

    try {
      const queries: string[] = [
        Query.equal('postId', postId),
        Query.limit(safeLimit + 1),
      ];

      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        queries,
      );

      const documents = result.documents.filter((d: any) => !d.deletedAt);
      const hasMore = documents.length > safeLimit;
      const sliced = hasMore ? documents.slice(0, safeLimit) : documents;

      return {
        data: sliced.map((doc) => this.mapToEntity(doc)),
        total: result.total,
        cursor: hasMore ? sliced[sliced.length - 1].$id : null,
      };
    } catch (err) {
      this.logger.warn(`findByPost query failed: ${err}`);
      return { data: [], total: 0, cursor: null };
    }
  }

  async findReplies(
    parentId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityCommentEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );

    try {
      const queries: string[] = [
        Query.equal('parentId', parentId),
        Query.limit(safeLimit + 1),
      ];

      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        queries,
      );

      const documents = result.documents.filter((d: any) => !d.deletedAt);
      const hasMore = documents.length > safeLimit;
      const sliced = hasMore ? documents.slice(0, safeLimit) : documents;

      return {
        data: sliced.map((doc) => this.mapToEntity(doc)),
        total: result.total,
        cursor: hasMore ? sliced[sliced.length - 1].$id : null,
      };
    } catch {
      return { data: [], total: 0, cursor: null };
    }
  }

  async update(
    id: string,
    data: Partial<CommunityCommentEntity>,
  ): Promise<CommunityCommentEntity> {
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
      const comment = await this.findById(id);
      if (!comment) throw new Error('Comment not found');
      return comment;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        { deletedAt: new Date().toISOString() },
      );
    } catch (err) {
      this.logger.error(`Soft delete comment ${id} failed: ${err}`);
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
      this.logger.error(`Hard delete comment ${id} failed: ${err}`);
    }
  }

  async incrementCount(
    id: string,
    field: 'reactionsCount' | 'repliesCount',
    delta: number,
  ): Promise<void> {
    const comment = await this.findById(id);
    if (!comment) return;
    const currentValue = (comment as any)[field] || 0;
    try {
      await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        { [field]: Math.max(0, currentValue + delta) },
      );
    } catch {}
  }

  private mapToEntity(doc: any): CommunityCommentEntity {
    let parsedMeta: any = {};
    if (doc.editHistory) {
      try {
        parsedMeta = typeof doc.editHistory === 'string' ? JSON.parse(doc.editHistory) : doc.editHistory;
      } catch {}
    }

    return new CommunityCommentEntity({
      id: doc.$id,
      postId: doc.postId,
      parentId: doc.parentId || null,
      authorId: doc.authorId,
      authorName: doc.authorName,
      authorRole: doc.authorRole,
      authorAvatar: doc.authorAvatar || null,
      content: doc.content,
      isAccepted: doc.isAccepted || parsedMeta.isAccepted || false,
      isTeacherAnswer: doc.isTeacherAnswer || parsedMeta.isTeacherAnswer || false,
      reactionsCount: doc.reactionsCount || 0,
      repliesCount: doc.repliesCount || 0,
      deletedAt: doc.deletedAt || null,
      editHistory: doc.editHistory || null,
      createdAt: doc.createdAt || doc.$createdAt,
      updatedAt: doc.updatedAt || doc.$updatedAt,
    });
  }
}
