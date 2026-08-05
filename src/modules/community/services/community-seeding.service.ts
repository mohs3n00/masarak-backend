import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import {
  type ICommunitySpaceRepository,
  COMMUNITY_SPACE_REPOSITORY,
} from '../interfaces';
import { DEFAULT_SUBJECT_COMMUNITIES } from '../constants/community.constants';

@Injectable()
export class CommunitySeedingService implements OnModuleInit {
  private readonly logger = new Logger(CommunitySeedingService.name);

  constructor(
    @Inject(COMMUNITY_SPACE_REPOSITORY)
    private readonly spaceRepository: ICommunitySpaceRepository,
  ) {}

  async onModuleInit() {
    try {
      // Disabled auto-seeding as per user requirements
      // await this.seedDefaultCommunities();
    } catch (err) {
      this.logger.warn(`Failed to seed default communities on startup: ${err}`);
    }
  }

  async seedDefaultCommunities(): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const item of DEFAULT_SUBJECT_COMMUNITIES) {
      const found = await this.spaceRepository.findBySlug(item.slug);
      if (!found) {
        // Generate random 5 char uppercase code for Community ID
        const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const communityId = `MSC-${randomCode}`;

        await this.spaceRepository.create({
          communityId,
          type: 'DEFAULT_ACADEMIC',
          category: item.category as any,
          gradeLevel: item.gradeLevel || null,
          referenceId: null,
          name: item.name,
          description: `المجتمع الأكاديمي الرسمي لمادة ${item.name} على منصة مسارك.`,
          slug: item.slug,
          avatarUrl: null,
          coverUrl: null,
          tags: [item.nameEn, item.name, 'مسارك'],
          rules: '1. الاحترام المتبادل بين جميع الطلاب والمعلمين.\n2. عدم نشر إعلانات أو محتوى خارج نطاق المادة.\n3. الالتزام بالآداب العامة.',
          visibility: 'PUBLIC',
          status: 'APPROVED',
          isArchived: false,
          membersCount: 0, // No real members yet
          postsCount: 0,
          onlineCount: 0,
          createdById: 'SYSTEM',
          createdByName: 'Masarak Platform',
          createdAt: new Date().toISOString(),
          metadata: JSON.stringify({ icon: item.icon, nameEn: item.nameEn }),
        });
        created++;
      } else {
        existing++;
      }
    }

    this.logger.log(`Default Communities Seeded: ${created} created, ${existing} already exist.`);
    return { created, existing };
  }
}
