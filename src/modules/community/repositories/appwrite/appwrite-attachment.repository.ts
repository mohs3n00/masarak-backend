import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunityAttachmentRepository } from '../../interfaces';
import { CommunityAttachmentEntity } from '../../entities';
import { COMMUNITY_COLLECTIONS } from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

@Injectable()
export class AppwriteAttachmentRepository implements ICommunityAttachmentRepository {
  private get collectionId() {
    return COMMUNITY_COLLECTIONS.ATTACHMENTS;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunityAttachmentEntity, 'id'>,
  ): Promise<CommunityAttachmentEntity> {
    const doc = await this.appwrite.databases.createDocument(
      this.appwrite.databaseId,
      this.collectionId,
      ID.unique(),
      { ...data, createdAt: new Date().toISOString() },
    );
    return this.mapToEntity(doc);
  }

  async findByPost(postId: string): Promise<CommunityAttachmentEntity[]> {
    const result = await this.appwrite.databases.listDocuments(
      this.appwrite.databaseId,
      this.collectionId,
      [Query.equal('postId', postId), Query.limit(50)],
    );
    return result.documents.map((doc) => this.mapToEntity(doc));
  }

  async delete(id: string): Promise<void> {
    await this.appwrite.databases.deleteDocument(
      this.appwrite.databaseId,
      this.collectionId,
      id,
    );
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.appwrite.storage.deleteFile(this.appwrite.bucketId, fileId);
    } catch {
      // File may already be deleted
    }
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ fileId: string; url: string }> {
    const inputFile = InputFile.fromBuffer(file.buffer, file.originalname);
    const result = await this.appwrite.storage.createFile(
      this.appwrite.bucketId,
      ID.unique(),
      inputFile,
    );

    const endpoint =
      process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const url = `${endpoint}/storage/buckets/${this.appwrite.bucketId}/files/${result.$id}/view?project=${projectId}`;

    return { fileId: result.$id, url };
  }

  private mapToEntity(doc: any): CommunityAttachmentEntity {
    return new CommunityAttachmentEntity({
      id: doc.$id,
      postId: doc.postId,
      fileId: doc.fileId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      url: doc.url,
      type: doc.type,
      createdAt: doc.createdAt || doc.$createdAt,
    });
  }
}
