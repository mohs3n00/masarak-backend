import { CommunityReactionEntity } from '../entities';

export const COMMUNITY_REACTION_REPOSITORY = 'COMMUNITY_REACTION_REPOSITORY';

export interface ICommunityReactionRepository {
  create(
    data: Omit<CommunityReactionEntity, 'id'>,
  ): Promise<CommunityReactionEntity>;
  findByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: string,
  ): Promise<CommunityReactionEntity | null>;
  delete(id: string): Promise<void>;
  findByTarget(
    targetId: string,
    targetType: string,
  ): Promise<CommunityReactionEntity[]>;
}
