import { Injectable, Inject } from '@nestjs/common';
import {
  COMMUNITY_REACTION_REPOSITORY,
  COMMUNITY_POST_REPOSITORY,
  COMMUNITY_COMMENT_REPOSITORY,
  type ICommunityReactionRepository,
  type ICommunityPostRepository,
  type ICommunityCommentRepository,
} from '../interfaces';
import { ToggleReactionDto } from '../dto';

@Injectable()
export class CommunityReactionService {
  constructor(
    @Inject(COMMUNITY_REACTION_REPOSITORY)
    private readonly reactionRepository: ICommunityReactionRepository,
    @Inject(COMMUNITY_POST_REPOSITORY)
    private readonly postRepository: ICommunityPostRepository,
    @Inject(COMMUNITY_COMMENT_REPOSITORY)
    private readonly commentRepository: ICommunityCommentRepository,
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
        await this.updateReactionCount(targetId, targetType, -1);
        return { action: 'removed', type: null };
      } else {
        // Switch reaction type (count remains the same)
        await this.reactionRepository.delete(existing.id);
        await this.reactionRepository.create({
          userId: user.id,
          targetId,
          targetType,
          type: dto.type,
          createdAt: new Date().toISOString(),
        });
        return { action: 'changed', type: dto.type };
      }
    }

    await this.reactionRepository.create({
      userId: user.id,
      targetId,
      targetType,
      type: dto.type,
      createdAt: new Date().toISOString(),
    });

    await this.updateReactionCount(targetId, targetType, 1);

    return { action: 'added', type: dto.type };
  }

  private async updateReactionCount(targetId: string, targetType: 'post' | 'comment', delta: number) {
    try {
      if (targetType === 'post') {
        await this.postRepository.incrementCount(targetId, 'reactionsCount', delta);
      } else if (targetType === 'comment') {
        await this.commentRepository.incrementCount(targetId, 'reactionsCount', delta);
      }
    } catch (err) {
      console.error('[CommunityReactionService] Failed to update reaction count:', err);
    }
  }

  async getReactions(targetId: string, targetType: 'post' | 'comment') {
    return this.reactionRepository.findByTarget(targetId, targetType);
  }
}

