import { Injectable, Inject } from '@nestjs/common';
import {
  type ICommunityNotificationRepository,
  COMMUNITY_NOTIFICATION_REPOSITORY,
} from '../interfaces';

@Injectable()
export class CommunityNotificationService {
  constructor(
    @Inject(COMMUNITY_NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: ICommunityNotificationRepository,
  ) {}

  async getUserNotifications(userId: string, cursor?: string, limit?: string) {
    return this.notificationRepository.findByUser(
      userId,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  async getUnreadCount(userId: string) {
    return { count: await this.notificationRepository.countUnread(userId) };
  }

  async markAsRead(id: string) {
    await this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.markAllAsRead(userId);
  }
}
