/** Community report entity */
export class CommunityReportEntity {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'post' | 'comment';
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;

  constructor(partial: Partial<CommunityReportEntity>) {
    Object.assign(this, partial);
  }
}
