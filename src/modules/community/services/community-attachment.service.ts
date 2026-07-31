import { Injectable, Inject } from '@nestjs/common';
import {
  type ICommunityAttachmentRepository,
  COMMUNITY_ATTACHMENT_REPOSITORY,
} from '../interfaces';

@Injectable()
export class CommunityAttachmentService {
  constructor(
    @Inject(COMMUNITY_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ICommunityAttachmentRepository,
  ) {}

  async uploadForPost(postId: string, file: Express.Multer.File) {
    // Note: the Appwrite implementation of uploadFile internally uploads to storage
    const uploadResult = await this.attachmentRepository.uploadFile(file);

    const type = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype === 'application/pdf'
        ? 'pdf'
        : 'document';

    return this.attachmentRepository.create({
      postId,
      fileId: uploadResult.fileId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: uploadResult.url,
      type,
      createdAt: new Date().toISOString(),
    });
  }

  async getAttachmentsForPost(postId: string) {
    return this.attachmentRepository.findByPost(postId);
  }

  async delete(id: string) {
    // Ideally we should fetch to get fileId and delete from storage too.
    // For now we assume the repository handles the DB deletion.
    await this.attachmentRepository.delete(id);
  }
}
