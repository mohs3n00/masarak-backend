import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunitySpaceRepository } from '../../interfaces';
import { CommunitySpaceEntity } from '../../entities';
import { COMMUNITY_COLLECTIONS } from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteSpaceRepository implements ICommunitySpaceRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.SPACES;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunitySpaceEntity, 'id'>,
  ): Promise<CommunitySpaceEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      { ...data, createdAt: new Date().toISOString() },
    );
    return this.mapToEntity(doc);
  }

  async findById(id: string): Promise<CommunitySpaceEntity | null> {
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

  async findByType(type: string): Promise<CommunitySpaceEntity[]> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('type', type),
        Query.equal('isArchived', false),
        Query.limit(100),
      ],
    );
    return result.documents.map((doc) => this.mapToEntity(doc));
  }

  async findByReference(
    type: string,
    referenceId: string,
  ): Promise<CommunitySpaceEntity | null> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [
        Query.equal('type', type),
        Query.equal('referenceId', referenceId),
        Query.limit(1),
      ],
    );
    return result.documents.length > 0
      ? this.mapToEntity(result.documents[0])
      : null;
  }

  async findAll(): Promise<CommunitySpaceEntity[]> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [Query.equal('isArchived', false), Query.limit(100)],
    );
    return result.documents.map((doc) => this.mapToEntity(doc));
  }

  async update(
    id: string,
    data: Partial<CommunitySpaceEntity>,
  ): Promise<CommunitySpaceEntity> {
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

  async delete(id: string): Promise<void> {
    await this.appwrite.databases.deleteDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
    );
  }

  private mapToEntity(doc: any): CommunitySpaceEntity {
    return new CommunitySpaceEntity({
      id: doc.$id,
      type: doc.type,
      referenceId: doc.referenceId || null,
      name: doc.name,
      description: doc.description || null,
      slug: doc.slug,
      isArchived: doc.isArchived || false,
      createdAt: doc.createdAt || doc.$createdAt,
      metadata: doc.metadata || null,
    });
  }
}
