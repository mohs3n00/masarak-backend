import { Injectable } from '@nestjs/common';
import { CommunityRepository } from '../community.repository';

@Injectable()
export class CommunityFeedService {
  constructor(private readonly repo: CommunityRepository) {}

  async getTrendingPosts() {
    return this.repo.getFeed(1, 20); // Basic feed logic
  }

  async getFeed(page: number, limit: number) {
    return this.repo.getFeed(page, limit);
  }

  async createPost(authorId: string, content: string) {
    return this.repo.createPost({ authorId, content });
  }

  async reactToPost(userId: string, postId: string) {
    return this.repo.reactToPost(userId, postId);
  }

  async addComment(userId: string, postId: string, content: string) {
    return this.repo.addComment(userId, postId, content);
  }

  async updatePost(userId: string, userRole: string, postId: string, content: string) {
    const post = await this.repo.getPostById(postId);
    if (!post) throw new Error('Post not found');

    if (post.authorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new Error('Forbidden: You can only edit your own posts');
    }

    return this.repo.updatePost(postId, content);
  }

  async deletePost(userId: string, userRole: string, postId: string) {
    const post = await this.repo.getPostById(postId);
    if (!post) throw new Error('Post not found');

    if (post.authorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new Error('Forbidden: You can only delete your own posts');
    }

    return this.repo.deletePost(postId);
  }
}
