/** Community attachment entity */
export class CommunityAttachmentEntity {
  id: string;
  postId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  type: 'image' | 'pdf' | 'document';
  createdAt: string;

  constructor(partial: Partial<CommunityAttachmentEntity>) {
    Object.assign(this, partial);
  }
}
