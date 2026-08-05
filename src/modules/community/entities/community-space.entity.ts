import {
  CommunityType,
  CommunityCategory,
  CommunityVisibility,
  CommunityStatus,
} from '../constants/community.constants';

/** Community space entity — framework-agnostic domain object */
export class CommunitySpaceEntity {
  id: string;
  communityId: string; // Human readable identity (e.g., MSC-28AF4)
  type: CommunityType;
  category: CommunityCategory;
  parentSlug?: string | null;
  gradeLevel?: number | null;
  subject?: string | null;
  language?: string | null;
  school?: string | null;
  university?: string | null;
  courseId?: string | null;
  referenceId: string | null;
  name: string;
  description: string | null;
  slug: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  tags: string[];
  rules: string | null;
  visibility: CommunityVisibility;
  status: CommunityStatus;
  isArchived: boolean;
  membersCount: number;
  postsCount: number;
  onlineCount: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  metadata: string | null;
  weeklyActivityScore?: number;
  newMembersWeekly?: number;
  commentsPerPostRatio?: number;

  constructor(partial: Partial<CommunitySpaceEntity>) {
    Object.assign(this, partial);
    this.tags = partial.tags || [];
    this.membersCount = partial.membersCount !== undefined && partial.membersCount !== null ? partial.membersCount : 0;
    this.postsCount = partial.postsCount || 0;
    this.onlineCount = partial.onlineCount || 0;
    this.weeklyActivityScore = partial.weeklyActivityScore || 0;
    this.newMembersWeekly = partial.newMembersWeekly || 0;
    this.commentsPerPostRatio = partial.commentsPerPostRatio || 0;
  }
}
