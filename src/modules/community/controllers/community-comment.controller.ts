import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityCommentService } from '../services';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Community Comments')
@Controller('community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityCommentController {
  constructor(private readonly commentService: CommunityCommentService) {}

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  async create(
    @Param('postId') postId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(postId, user, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  async getByPost(
    @Param('postId') postId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentService.findByPost(postId, cursor, limit);
  }

  @Get('comments/:parentId/replies')
  @ApiOperation({ summary: 'Get replies for a comment' })
  async getReplies(
    @Param('parentId') parentId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentService.findReplies(parentId, cursor, limit);
  }

  @Put('comments/:id')
  @ApiOperation({ summary: 'Update a comment' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, user, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentService.delete(id, user);
  }
}
