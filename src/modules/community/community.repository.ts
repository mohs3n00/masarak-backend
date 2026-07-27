import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CommunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(data: any) {
    return this.prisma.communityPost.create({ data });
  }

  async updatePost(postId: string, content: string) {
    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { content },
    });
  }

  async getFeed(page: number, limit: number) {
    return this.prisma.communityPost.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { 
        author: true, 
        _count: {
          select: { comments: true, reactions: true }
        },
        reactions: {
          select: { userId: true, type: true }
        },
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'asc' }
        }
      },
    });
  }

  async reactToPost(userId: string, postId: string) {
    const existing = await this.prisma.communityReaction.findFirst({
      where: {
        userId,
        postId,
        commentId: null,
      }
    });

    if (existing) {
      await this.prisma.communityReaction.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.communityReaction.create({
      data: {
        userId,
        postId,
        type: 'LIKE',
        commentId: null,
      }
    });
    return { liked: true };
  }

  async addComment(userId: string, postId: string, content: string) {
    return this.prisma.communityComment.create({
      data: {
        authorId: userId,
        postId,
        content
      },
      include: { author: true }
    });
  }

  async getPostById(postId: string) {
    return this.prisma.communityPost.findUnique({ where: { id: postId } });
  }

  async deletePost(postId: string) {
    return this.prisma.communityPost.delete({ where: { id: postId } });
  }
}
