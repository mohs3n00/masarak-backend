import { Injectable, Inject } from '@nestjs/common';
import {
  type ICommunityReactionRepository,
  COMMUNITY_REACTION_REPOSITORY,
} from '../interfaces';
import { ToggleReactionDto } from '../dto';

@Injectable()
export class CommunityReactionService {
  constructor(
    @Inject(COMMUNITY_REACTION_REPOSITORY)
    private readonly reactionRepository: ICommunityReactionRepository,
  ) {}

  async toggleReaction(
    targetId: string,
    targetType: 'post' | 'comment',
    user: any,
    dto: ToggleReactionDto,
  ) {
    const existing = await this.reactionRepository.findByUserAndTarget(
      user.id as string,
      targetId,
      targetType,
    );

    if (existing) {
      if (existing.type === dto.type) {
        // Toggle off
        await this.reactionRepository.delete(existing.id);
        return { action: 'removed' };
      } else {
        // We only support one reaction per user per target, so we would normally update.
        // For simplicity, we delete the old one and create a new one.
        await this.reactionRepository.delete(existing.id);
        await this.reactionRepository.create({
          userId: user.id,
          targetId,
          targetType,
          type: dto.type,
          createdAt: new Date().toISOString(),
        });
        return { action: 'changed' };
      }
    }

    await this.reactionRepository.create({
      userId: user.id,
      targetId,
      targetType,
      type: dto.type,
      createdAt: new Date().toISOString(),
    });

    return { action: 'added' };
  }

  async getReactions(targetId: string, targetType: 'post' | 'comment') {
    return this.reactionRepository.findByTarget(targetId, targetType);
  }
}
