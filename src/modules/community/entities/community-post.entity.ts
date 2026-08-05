import { PostType } from '../constants/community.constants';

/** Community post entity — framework-agnostic domain object */
export class CommunityPostEntity {
  id: string;
  spaceId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string | null;
  content: string;
  postType: PostType;
  acceptedCommentId?: string | null;
  status: 'published' | 'draft' | 'archived' | 'moderated';
  isPinned: boolean;
  isQuestion: boolean;
  isAnswered: boolean;
  isAnnouncement: boolean;
  reactionsCount: number;
  commentsCount: number;
  tags: string[];
  deletedAt: string | null;
  editHistory: string | null;
  aiMetadata: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(partial: Partial<CommunityPostEntity>) {
    Object.assign(this, partial);
    this.postType = partial.postType || 'DISCUSSION';
  }
}
