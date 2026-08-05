import { Module } from '@nestjs/common';

import {
  COMMUNITY_POST_REPOSITORY,
  COMMUNITY_COMMENT_REPOSITORY,
  COMMUNITY_REACTION_REPOSITORY,
  COMMUNITY_SPACE_REPOSITORY,
  COMMUNITY_ATTACHMENT_REPOSITORY,
  COMMUNITY_REPORT_REPOSITORY,
  COMMUNITY_NOTIFICATION_REPOSITORY,
} from './interfaces';

import {
  AppwritePostRepository,
  AppwriteCommentRepository,
  AppwriteReactionRepository,
  AppwriteSpaceRepository,
  AppwriteAttachmentRepository,
  AppwriteReportRepository,
  AppwriteNotificationRepository,
} from './repositories/appwrite';

import {
  CommunityPostService,
  CommunityCommentService,
  CommunityReactionService,
  CommunitySpaceService,
  CommunityAttachmentService,
  CommunitySearchService,
  CommunityNotificationService,
  CommunityMemberService,
} from './services';

import { CommunitySeedingService } from './services/community-seeding.service';

import {
  CommunityPostController,
  CommunityCommentController,
  CommunityReactionController,
  CommunitySpaceController,
  CommunityAttachmentController,
  CommunitySearchController,
  CommunityNotificationController,
  CommunityMemberController,
} from './controllers';

import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // AppwriteModule is global
  controllers: [
    CommunitySpaceController,
    CommunityPostController,
    CommunityCommentController,
    CommunityReactionController,
    CommunityAttachmentController,
    CommunitySearchController,
    CommunityNotificationController,
    CommunityMemberController,
  ],
  providers: [
    // Repository Bindings
    {
      provide: COMMUNITY_POST_REPOSITORY,
      useClass: AppwritePostRepository,
    },
    {
      provide: COMMUNITY_COMMENT_REPOSITORY,
      useClass: AppwriteCommentRepository,
    },
    {
      provide: COMMUNITY_REACTION_REPOSITORY,
      useClass: AppwriteReactionRepository,
    },
    {
      provide: COMMUNITY_SPACE_REPOSITORY,
      useClass: AppwriteSpaceRepository,
    },
    {
      provide: COMMUNITY_ATTACHMENT_REPOSITORY,
      useClass: AppwriteAttachmentRepository,
    },
    {
      provide: COMMUNITY_REPORT_REPOSITORY,
      useClass: AppwriteReportRepository,
    },
    {
      provide: COMMUNITY_NOTIFICATION_REPOSITORY,
      useClass: AppwriteNotificationRepository,
    },

    // Services
    CommunityPostService,
    CommunityCommentService,
    CommunityReactionService,
    CommunitySpaceService,
    CommunityAttachmentService,
    CommunitySearchService,
    CommunityNotificationService,
    CommunitySeedingService,
    CommunityMemberService,
  ],
  exports: [
    CommunityPostService,
    CommunityCommentService,
    CommunityReactionService,
    CommunitySpaceService,
    CommunityAttachmentService,
    CommunitySearchService,
    CommunityNotificationService,
    CommunitySeedingService,
  ],
})
export class CommunityModule {}
