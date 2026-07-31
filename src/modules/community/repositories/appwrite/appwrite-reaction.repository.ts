import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunityReactionRepository } from '../../interfaces';
import { CommunityReactionEntity } from '../../entities';
import { COMMUNITY_COLLECTIONS } from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteReactionRepository implements ICommunityReactionRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.REACTIONS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityReactionEntity, 'id'>,
  ): Promise<CommunityReactionEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      { ...data, createdAt: new Date().toISOString() },
    );
    return this.mapToEntity(doc);
  }

  async findByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: string,
  ): Promise<CommunityReactionEntity | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('userId', userId),
        Query.equal('targetId', targetId),
        Query.equal('targetType', targetType),
        Query.limit(1),
      ],
    );
    return result.documents.length > 0
      ? this.mapToEntity(result.documents[0])
      : null;
  }

  async delete(id: string): Promise<void> {
    await this.appwrite.databases.deleteDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
    );
  }

  async findByTarget(
    targetId: string,
    targetType: string,
  ): Promise<CommunityReactionEntity[]> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('targetId', targetId),
        Query.equal('targetType', targetType),
        Query.limit(100),
      ],
    );
    return result.documents.map((doc) => this.mapToEntity(doc));
  }

  private mapToEntity(doc: any): CommunityReactionEntity {
    return new CommunityReactionEntity({
      id: doc.$id,
      userId: doc.userId,
      targetId: doc.targetId,
      targetType: doc.targetType,
      type: doc.type,
      createdAt: doc.createdAt || doc.$createdAt,
    });
  }
}
