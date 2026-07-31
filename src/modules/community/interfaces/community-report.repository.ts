import { CommunityReportEntity } from '../entities';
import { PaginatedResult } from './community-post.repository';

export const COMMUNITY_REPORT_REPOSITORY = 'COMMUNITY_REPORT_REPOSITORY';

export interface ICommunityReportRepository {
  create(
    data: Omit<CommunityReportEntity, 'id'>,
  ): Promise<CommunityReportEntity>;
  findPending(
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<CommunityReportEntity>>;
  update(
    id: string,
    data: Partial<CommunityReportEntity>,
  ): Promise<CommunityReportEntity>;
}
