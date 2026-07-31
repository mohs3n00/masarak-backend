import { CommunityCommentEntity } from '../entities';
import { PaginatedResult } from './community-post.repository';

export const COMMUNITY_COMMENT_REPOSITORY = 'COMMUNITY_COMMENT_REPOSITORY';

export interface ICommunityCommentRepository {
  create(
    data: Omit<CommunityCommentEntity, 'id'>,
  ): Promise<CommunityCommentEntity>;
  findById(id: string): Promise<CommunityCommentEntity | null>;
  findByPost(
    postId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityCommentEntity>>;
  findReplies(
    parentId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityCommentEntity>>;
  update(
    id: string,
    data: Partial<CommunityCommentEntity>,
  ): Promise<CommunityCommentEntity>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  incrementCount(
    id: string,
    field: 'reactionsCount' | 'repliesCount',
    delta: number,
  ): Promise<void>;
}
