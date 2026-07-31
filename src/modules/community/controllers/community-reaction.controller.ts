import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityReactionService } from '../services';
import { ToggleReactionDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Community Reactions')
@Controller('community/reactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityReactionController {
  constructor(private readonly reactionService: CommunityReactionService) {}

  @Post(':targetType/:targetId')
  @ApiOperation({ summary: 'Toggle reaction on post or comment' })
  async toggleReaction(
    @Param('targetType') targetType: 'post' | 'comment',
    @Param('targetId') targetId: string,
    @CurrentUser() user: any,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionService.toggleReaction(targetId, targetType, user, dto);
  }

  @Get(':targetType/:targetId')
  @ApiOperation({ summary: 'Get reactions for a target' })
  async getReactions(
    @Param('targetType') targetType: 'post' | 'comment',
    @Param('targetId') targetId: string,
  ) {
    return this.reactionService.getReactions(targetId, targetType);
  }
}
