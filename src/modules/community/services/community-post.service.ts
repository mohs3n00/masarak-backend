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

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CommunityPostService {
  constructor(
    @Inject(COMMUNITY_POST_REPOSITORY)
    private readonly postRepository: ICommunityPostRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(user: any, dto: CreatePostDto): Promise<CommunityPostEntity> {
    const isQuestion = dto.isQuestion || dto.postType === 'QUESTION';
    const postType = dto.postType || (isQuestion ? 'QUESTION' : 'DISCUSSION');

    return this.postRepository.create({
      spaceId: dto.spaceId,
      authorId: user.id,
      authorName: dto.authorName || user.name || user.email || 'User',
      authorRole: dto.authorRole || user.role || 'STUDENT',
      authorAvatar: user.avatarUrl || null,
      content: dto.content,
      postType: postType as any,
      acceptedCommentId: null,
      tags: dto.tags || [],
      status: dto.status || 'published',
      isQuestion,
      isPinned: false,
      isAnswered: false,
      isAnnouncement: postType === 'ANNOUNCEMENT',
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

  async search(query: string, spaceId?: string, cursor?: string, limit?: number) {
    if (!query || query.trim().length < 3) {
      return { data: [], total: 0, cursor: null };
    }
    return this.postRepository.search(query, spaceId, cursor, limit);
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

  async bookmark(postId: string, user: any) {
    const post = await this.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.communityBookmark.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });

    if (existing) return existing;

    return this.prisma.communityBookmark.create({
      data: {
        userId: user.id,
        postId,
      },
    });
  }

  async unbookmark(postId: string, user: any) {
    try {
      await this.prisma.communityBookmark.delete({
        where: { userId_postId: { userId: user.id, postId } },
      });
    } catch {
      // Ignore if not found
    }
    return { success: true };
  }

  async getBookmarks(user: any) {
    const bookmarks = await this.prisma.communityBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const posts = await Promise.all(
      bookmarks.map(async (b) => {
        try {
          return await this.findById(b.postId);
        } catch {
          return null;
        }
      })
    );

    return posts.filter(Boolean);
  }
}
