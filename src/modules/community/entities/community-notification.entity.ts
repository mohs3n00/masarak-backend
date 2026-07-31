/** Community notification entity — isolated from platform notifications */
export class CommunityNotificationEntity {
  id: string;
  userId: string;
  type: 'reply' | 'reaction' | 'mention' | 'pin' | 'answer';
  actorId: string;
  actorName: string;
  targetId: string;
  targetType: 'post' | 'comment';
  message: string;
  isRead: boolean;
  createdAt: string;

  constructor(partial: Partial<CommunityNotificationEntity>) {
    Object.assign(this, partial);
  }
}
