import { Injectable } from '@nestjs/common';
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
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.COMMENTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityCommentEntity, 'id'>,
  ): Promise<CommunityCommentEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      {
        ...data,
        reactionsCount: 0,
        repliesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
    return this.mapToEntity(doc);
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
    const queries: string[] = [
      Query.equal('postId', postId),
      Query.isNull('parentId'),
      Query.isNull('deletedAt'),
      Query.orderAsc('createdAt'),
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

  async findReplies(
    parentId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityCommentEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );
    const queries: string[] = [
      Query.equal('parentId', parentId),
      Query.isNull('deletedAt'),
      Query.orderAsc('createdAt'),
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

  async update(
    id: string,
    data: Partial<CommunityCommentEntity>,
  ): Promise<CommunityCommentEntity> {
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
      { deletedAt: new Date().toISOString() },
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
    field: 'reactionsCount' | 'repliesCount',
    delta: number,
  ): Promise<void> {
    const comment = await this.findById(id);
    if (!comment) return;
    const currentValue = comment[field] || 0;
    await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      { [field]: Math.max(0, currentValue + delta) },
    );
  }

  private mapToEntity(doc: any): CommunityCommentEntity {
    return new CommunityCommentEntity({
      id: doc.$id,
      postId: doc.postId,
      parentId: doc.parentId || null,
      authorId: doc.authorId,
      authorName: doc.authorName,
      authorRole: doc.authorRole,
      authorAvatar: doc.authorAvatar || null,
      content: doc.content,
      reactionsCount: doc.reactionsCount || 0,
      repliesCount: doc.repliesCount || 0,
      deletedAt: doc.deletedAt || null,
      editHistory: doc.editHistory || null,
      createdAt: doc.createdAt || doc.$createdAt,
      updatedAt: doc.updatedAt || doc.$updatedAt,
    });
  }
}
