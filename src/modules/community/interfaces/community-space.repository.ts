import { CommunitySpaceEntity } from '../entities';

export const COMMUNITY_SPACE_REPOSITORY = 'COMMUNITY_SPACE_REPOSITORY';

export interface SpaceFilters {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ICommunitySpaceRepository {
  create(data: Omit<CommunitySpaceEntity, 'id'>): Promise<CommunitySpaceEntity>;
  findById(id: string): Promise<CommunitySpaceEntity | null>;
  findBySlug(slug: string): Promise<CommunitySpaceEntity | null>;
  findByType(type: string): Promise<CommunitySpaceEntity[]>;
  findByReference(
    type: string,
    referenceId: string,
  ): Promise<CommunitySpaceEntity | null>;
  findAll(): Promise<CommunitySpaceEntity[]>;
  findWithFilters(filters: SpaceFilters): Promise<CommunitySpaceEntity[]>;
  update(
    id: string,
    data: Partial<CommunitySpaceEntity>,
  ): Promise<CommunitySpaceEntity>;
  incrementMembersCount(id: string): Promise<void>;
  decrementMembersCount(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
