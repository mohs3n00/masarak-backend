import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  type ICommunityPostRepository,
  COMMUNITY_POST_REPOSITORY,
} from '../interfaces';
import { CreatePostDto, UpdatePostDto, FeedQueryDto } from '../dto';
import { CommunityPostEntity } from '../entities';

@Injectable()
export class CommunityPostService {
  constructor(
    @Inject(COMMUNITY_POST_REPOSITORY)
    private readonly postRepository: ICommunityPostRepository,
  ) {}

  async create(user: any, dto: CreatePostDto): Promise<CommunityPostEntity> {
    return this.postRepository.create({
      spaceId: dto.spaceId,
      authorId: user.id,
      authorName: user.name || user.email || 'User',
      authorRole: user.role || 'STUDENT',
      authorAvatar: user.avatarUrl || null,
      content: dto.content,
      tags: dto.tags || [],
      status: dto.status || 'published',
      isQuestion: dto.isQuestion || false,
      isPinned: false,
      isAnswered: false,
      isAnnouncement: false,
      reactionsCount: 0,
      commentsCount: 0,
      deletedAt: null,
      editHistory: null,
      aiMetadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async findFeed(query: FeedQueryDto) {
    return this.postRepository.findFeed({
      spaceId: query.spaceId,
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  async findById(id: string): Promise<CommunityPostEntity> {
    const post = await this.postRepository.findById(id);
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async update(
    id: string,
    user: any,
    dto: UpdatePostDto,
  ): Promise<CommunityPostEntity> {
    const post = await this.findById(id);

    if (
      post.authorId !== user.id &&
      !['ADMIN', 'SUPER_ADMIN'].some((r) => user.role?.includes(r))
    ) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updated = await this.postRepository.update(id, dto);
    return updated;
  }

  async delete(id: string, user: any): Promise<void> {
    const post = await this.findById(id);

    if (
      post.authorId !== user.id &&
      !['ADMIN', 'SUPER_ADMIN'].some((r) => user.role?.includes(r))
    ) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepository.softDelete(id);
  }
}
