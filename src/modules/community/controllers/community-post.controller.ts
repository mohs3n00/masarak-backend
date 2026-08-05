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
import { CommunityPostService } from '../services';
import { CreatePostDto, UpdatePostDto, FeedQueryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Community Posts')
@Controller('community/posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityPostController {
  constructor(private readonly postService: CommunityPostService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async create(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.postService.create(user, dto);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get post feed' })
  async getFeed(@Query() query: FeedQueryDto) {
    return this.postService.findFeed(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts (e.g., for deduplication)' })
  async search(
    @Query('q') q: string,
    @Query('spaceId') spaceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postService.search(q, spaceId, undefined, limit ? parseInt(limit, 10) : 10);
  }

  @Get('bookmarks/me')
  @ApiOperation({ summary: 'Get saved posts for current user' })
  async getBookmarks(@CurrentUser() user: any) {
    return this.postService.getBookmarks(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  async getById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(id, user, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postService.delete(id, user);
  }

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Bookmark a post' })
  async bookmark(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postService.bookmark(id, user);
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Unbookmark a post' })
  async unbookmark(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postService.unbookmark(id, user);
  }
}
