import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  type ICommunitySpaceRepository,
  type ICommunityAttachmentRepository,
  COMMUNITY_SPACE_REPOSITORY,
  COMMUNITY_ATTACHMENT_REPOSITORY,
  SpaceFilters,
} from '../interfaces';
import { CreateSpaceDto, UpdateSpaceStatusDto } from '../dto';

@Injectable()
export class CommunitySpaceService {
  constructor(
    @Inject(COMMUNITY_SPACE_REPOSITORY)
    private readonly spaceRepository: ICommunitySpaceRepository,
    @Inject(COMMUNITY_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ICommunityAttachmentRepository,
  ) {}

  async create(dto: CreateSpaceDto, user?: { id: string; name?: string; role?: string }) {
    let slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!slug) {
      slug = `community-${Date.now()}`;
    }

    // Check if slug exists, append timestamp if duplicate
    const existing = await this.spaceRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const communityId = `MSC-${randomCode}`;

    // Admin/Official & Default communities are auto APPROVED. Student/Teacher communities require PENDING_REVIEW.
    const isAutoApproved =
      dto.type === 'DEFAULT_ACADEMIC' ||
      dto.type === 'OFFICIAL' ||
      user?.role === 'ADMIN' ||
      user?.role === 'SUPER_ADMIN';

    const status = isAutoApproved ? 'APPROVED' : 'PENDING_REVIEW';

    return this.spaceRepository.create({
      communityId,
      type: (dto.type || 'STUDENT') as any,
      category: (dto.category || 'EDUCATION') as any,
      referenceId: dto.referenceId || null,
      name: dto.name,
      description: dto.description || null,
      slug,
      avatarUrl: dto.avatarUrl || null,
      coverUrl: dto.coverUrl || null,
      tags: dto.tags || [],
      rules: dto.rules || null,
      visibility: (dto.visibility || 'PUBLIC') as any,
      gradeLevel: dto.gradeLevel || null,
      subject: dto.subject || null,
      language: dto.language || null,
      school: dto.school || null,
      university: dto.university || null,
      status,
      isArchived: false,
      membersCount: 1,
      postsCount: 0,
      onlineCount: 1,
      createdById: user?.id || null,
      createdByName: user?.name || null,
      createdAt: new Date().toISOString(),
      metadata: null,
    });
  }

  async findAll() {
    return this.spaceRepository.findAll();
  }

  async discover(user?: { id: string; gradeLevel?: number; subjects?: string[] }) {
    const all = await this.spaceRepository.findAll();
    // Filter out archived or unapproved spaces
    const activeSpaces = all.filter((s) => !s.isArchived && s.status === 'APPROVED');

    // 1. For You: Match gradeLevel and subjects
    let forYou = [...activeSpaces];
    if (user?.gradeLevel) {
      forYou = forYou.sort((a, b) => {
        const matchA = a.gradeLevel === user.gradeLevel ? 1 : 0;
        const matchB = b.gradeLevel === user.gradeLevel ? 1 : 0;
        return matchB - matchA;
      });
    }
    forYou = forYou.slice(0, 10);

    // 2. Most Discussed (Most Active): Sorted by commentsPerPostRatio
    const mostDiscussed = [...activeSpaces].sort((a, b) => {
      const ratioA = (a as any).commentsPerPostRatio || 0;
      const ratioB = (b as any).commentsPerPostRatio || 0;
      return ratioB - ratioA;
    }).slice(0, 10);

    // 3. Trending: Sorted by weeklyActivityScore (fallback to postsCount)
    const trending = [...activeSpaces].sort((a, b) => {
      const scoreA = (a as any).weeklyActivityScore || a.postsCount;
      const scoreB = (b as any).weeklyActivityScore || b.postsCount;
      return scoreB - scoreA;
    }).slice(0, 10);

    // 4. Highest Growth: Sorted by newMembersWeekly (fallback to membersCount)
    const highestGrowth = [...activeSpaces].sort((a, b) => {
      const growthA = (a as any).newMembersWeekly || a.membersCount;
      const growthB = (b as any).newMembersWeekly || b.membersCount;
      return growthB - growthA;
    }).slice(0, 10);

    // 5. New: Sorted by createdAt
    const newCommunities = [...activeSpaces].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }).slice(0, 10);

    // 6. Recommended Teachers: type === 'TEACHER'
    const recommendedTeachers = activeSpaces
      .filter((s) => s.type === 'TEACHER')
      .sort((a, b) => b.membersCount - a.membersCount)
      .slice(0, 10);

    return {
      trending,
      forYou,
      new: newCommunities,
      highestGrowth,
      mostDiscussed,
      recommendedTeachers,
    };
  }

  async findWithFilters(filters: SpaceFilters) {
    return this.spaceRepository.findWithFilters(filters);
  }

  async findByType(type: string) {
    return this.spaceRepository.findByType(type);
  }

  async findById(id: string) {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new NotFoundException('Community not found');
    }
    return space;
  }

  async findBySlug(slug: string) {
    const space = await this.spaceRepository.findBySlug(slug);
    if (!space) {
      throw new NotFoundException('Community not found');
    }
    return space;
  }

  async updateStatus(id: string, dto: UpdateSpaceStatusDto) {
    const space = await this.findById(id);
    return this.spaceRepository.update(space.id, {
      status: dto.status as any,
    });
  }

  async delete(id: string) {
    const space = await this.findById(id);
    return this.spaceRepository.delete(space.id);
  }

  async updateSpaceImage(
    id: string,
    field: 'coverUrl' | 'avatarUrl',
    file: Express.Multer.File,
  ) {
    const space = await this.findById(id);
    const { url } = await this.attachmentRepository.uploadFile(file);
    return this.spaceRepository.update(space.id, {
      [field]: url,
    });
  }

  async updateImages(id: string, data: { coverUrl?: string; avatarUrl?: string }) {
    const space = await this.findById(id);
    return this.spaceRepository.update(space.id, data);
  }
}
