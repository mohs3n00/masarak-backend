/** Community comment entity — framework-agnostic domain object */
export class CommunityCommentEntity {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string | null;
  content: string;
  reactionsCount: number;
  repliesCount: number;
  deletedAt: string | null;
  editHistory: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(partial: Partial<CommunityCommentEntity>) {
    Object.assign(this, partial);
  }
}
