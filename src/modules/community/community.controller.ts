import { Controller, Get, Post, Patch, Delete, Body, Query, DefaultValuePipe, ParseIntPipe, UseGuards, Param, Req } from '@nestjs/common';
import { CommunityFeedService } from './services/community-feed.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly feedService: CommunityFeedService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get community feed' })
  getFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.feedService.getFeed(page, limit);
  }

  @Post('posts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new post' })
  createPost(
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.feedService.createPost(userId, content);
  }

  @Post('posts/:id/like')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Like or unlike a post' })
  reactToPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.feedService.reactToPost(userId, postId);
  }

  @Post('posts/:id/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Comment on a post' })
  addComment(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body('content') content: string,
  ) {
    return this.feedService.addComment(userId, postId, content);
  }

  @Delete('posts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a post' })
  deletePost(
    @Req() req: any,
    @Param('id') postId: string,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.feedService.deletePost(userId, userRole, postId);
  }

  @Patch('posts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a post' })
  updatePost(
    @Req() req: any,
    @Param('id') postId: string,
    @Body('content') content: string,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.feedService.updatePost(userId, userRole, postId, content);
  }
}