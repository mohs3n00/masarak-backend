import { CommunityAttachmentEntity } from '../entities';

export const COMMUNITY_ATTACHMENT_REPOSITORY =
  'COMMUNITY_ATTACHMENT_REPOSITORY';

export interface ICommunityAttachmentRepository {
  create(
    data: Omit<CommunityAttachmentEntity, 'id'>,
  ): Promise<CommunityAttachmentEntity>;
  findByPost(postId: string): Promise<CommunityAttachmentEntity[]>;
  delete(id: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
  uploadFile(
    file: Express.Multer.File,
  ): Promise<{ fileId: string; url: string }>;
}
