import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { COMMUNITY_SPACE_REPOSITORY } from '../interfaces';
import type { ICommunitySpaceRepository } from '../interfaces';

@Injectable()
export class CommunityMemberService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMMUNITY_SPACE_REPOSITORY)
    private readonly spaceRepository: ICommunitySpaceRepository,
  ) {}

  async joinSpace(spaceIdOrSlug: string, userId: string) {
    let space = await this.spaceRepository.findById(spaceIdOrSlug);
    if (!space) {
      space = await this.spaceRepository.findBySlug(spaceIdOrSlug);
    }
    if (!space) {
      throw new NotFoundException('Community space not found');
    }

    const spaceId = space.id;

    const existing = await this.prisma.communityMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (existing) {
      return existing; // idempotent join
    }

    const member = await this.prisma.communityMember.create({
      data: {
        spaceId,
        userId,
      },
    });

    // Increment count in Appwrite
    await this.spaceRepository.incrementMembersCount(spaceId);

    return member;
  }

  async leaveSpace(spaceIdOrSlug: string, userId: string) {
    let space = await this.spaceRepository.findById(spaceIdOrSlug);
    if (!space) {
      space = await this.spaceRepository.findBySlug(spaceIdOrSlug);
    }
    if (!space) {
      throw new NotFoundException('Community space not found');
    }

    const spaceId = space.id;

    const existing = await this.prisma.communityMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.communityMember.delete({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    // Decrement count in Appwrite
    await this.spaceRepository.decrementMembersCount(spaceId);

    return { success: true };
  }

  async getUserMemberships(userId: string): Promise<string[]> {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      select: { spaceId: true },
    });
    return memberships.map((m) => m.spaceId);
  }
}
