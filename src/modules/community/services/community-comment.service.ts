import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  type ICommunityCommentRepository,
  COMMUNITY_COMMENT_REPOSITORY,
} from '../interfaces';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { CommunityCommentEntity } from '../entities';

@Injectable()
export class CommunityCommentService {
  constructor(
    @Inject(COMMUNITY_COMMENT_REPOSITORY)
    private readonly commentRepository: ICommunityCommentRepository,
  ) {}

  async create(
    postId: string,
    user: any,
    dto: CreateCommentDto,
  ): Promise<CommunityCommentEntity> {
    const isTeacher = user.role === 'TEACHER';
    return this.commentRepository.create({
      postId,
      parentId: dto.parentId || null,
      authorId: user.id,
      authorName: dto.authorName || user.name || user.email || 'User',
      authorRole: dto.authorRole || user.role || 'STUDENT',
      authorAvatar: user.avatarUrl || null,
      content: dto.content,
      isAccepted: false,
      isTeacherAnswer: isTeacher,
      reactionsCount: 0,
      repliesCount: 0,
      deletedAt: null,
      editHistory: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async findByPost(postId: string, cursor?: string, limit?: string) {
    return this.commentRepository.findByPost(
      postId,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  async findReplies(parentId: string, cursor?: string, limit?: string) {
    return this.commentRepository.findReplies(
      parentId,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  async findById(id: string): Promise<CommunityCommentEntity> {
    const comment = await this.commentRepository.findById(id);
    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async markAccepted(id: string, user: any): Promise<CommunityCommentEntity> {
    const comment = await this.findById(id);
    return this.commentRepository.update(id, {
      isAccepted: true,
    });
  }

  async update(
    id: string,
    user: any,
    dto: UpdateCommentDto,
  ): Promise<CommunityCommentEntity> {
    const comment = await this.findById(id);

    if (
      comment.authorId !== user.id &&
      !['ADMIN', 'SUPER_ADMIN'].some((r) => user.role?.includes(r))
    ) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.commentRepository.update(id, dto);
  }

  async delete(id: string, user: any): Promise<void> {
    const comment = await this.findById(id);

    if (
      comment.authorId !== user.id &&
      !['ADMIN', 'SUPER_ADMIN'].some((r) => user.role?.includes(r))
    ) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.softDelete(id);
  }
}
