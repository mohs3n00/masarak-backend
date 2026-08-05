/** Community reaction entity */
export class CommunityReactionEntity {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment';
  type: string;
  createdAt: string;

  constructor(partial: Partial<CommunityReactionEntity>) {
    Object.assign(this, partial);
  }
}
