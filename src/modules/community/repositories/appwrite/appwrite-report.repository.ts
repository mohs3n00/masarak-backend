import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunityReportRepository } from '../../interfaces';
import { PaginatedResult } from '../../interfaces/community-post.repository';
import { CommunityReportEntity } from '../../entities';
import {
  COMMUNITY_COLLECTIONS,
  COMMUNITY_DEFAULTS,
} from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteReportRepository implements ICommunityReportRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.REPORTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityReportEntity, 'id'>,
  ): Promise<CommunityReportEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      { ...data, status: 'pending', createdAt: new Date().toISOString() },
    );
    return this.mapToEntity(doc);
  }

  async findPending(
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityReportEntity>> {
    const safeLimit = Math.min(
      limit || COMMUNITY_DEFAULTS.PAGE_SIZE,
      COMMUNITY_DEFAULTS.MAX_PAGE_SIZE,
    );
    const queries: string[] = [
      Query.equal('status', 'pending'),
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

  async update(
    id: string,
    data: Partial<CommunityReportEntity>,
  ): Promise<CommunityReportEntity> {
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;
    const doc = await this.appwrite.databases.updateDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
      updateData,
    );
    return this.mapToEntity(doc);
  }

  private mapToEntity(doc: any): CommunityReportEntity {
    return new CommunityReportEntity({
      id: doc.$id,
      reporterId: doc.reporterId,
      targetId: doc.targetId,
      targetType: doc.targetType,
      reason: doc.reason,
      description: doc.description || null,
      status: doc.status,
      reviewedBy: doc.reviewedBy || null,
      resolvedAt: doc.resolvedAt || null,
      createdAt: doc.createdAt || doc.$createdAt,
    });
  }
}
