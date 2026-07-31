import { CommunityNotificationEntity } from '../entities';
import { PaginatedResult } from './community-post.repository';

export const COMMUNITY_NOTIFICATION_REPOSITORY =
  'COMMUNITY_NOTIFICATION_REPOSITORY';

export interface ICommunityNotificationRepository {
  create(
    data: Omit<CommunityNotificationEntity, 'id'>,
  ): Promise<CommunityNotificationEntity>;
  findByUser(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityNotificationEntity>>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  countUnread(userId: string): Promise<number>;
}
