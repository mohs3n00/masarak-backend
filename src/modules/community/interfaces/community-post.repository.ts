import { CommunityPostEntity } from '../entities';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  cursor: string | null;
}

export interface FeedQuery {
  spaceId?: string;
  authorId?: string;
  status?: string;
  isQuestion?: boolean;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  cursor?: string;
  limit?: number;
}

export const COMMUNITY_POST_REPOSITORY = 'COMMUNITY_POST_REPOSITORY';

export interface ICommunityPostRepository {
  create(data: Omit<CommunityPostEntity, 'id'>): Promise<CommunityPostEntity>;
  findById(id: string): Promise<CommunityPostEntity | null>;
  findFeed(query: FeedQuery): Promise<PaginatedResult<CommunityPostEntity>>;
  update(
    id: string,
    data: Partial<CommunityPostEntity>,
  ): Promise<CommunityPostEntity>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  incrementCount(
    id: string,
    field: 'reactionsCount' | 'commentsCount',
    delta: number,
  ): Promise<void>;
  search(
    query: string,
    spaceId?: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityPostEntity>>;
}
