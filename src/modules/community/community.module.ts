import { Module } from '@nestjs/common';
import { CommunityFeedService } from './services/community-feed.service';
import { CommunityRepository } from './community.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CommunityController } from './community.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityController],
  providers: [CommunityFeedService, CommunityRepository],
  exports: [CommunityFeedService],
})
export class CommunityModule {}
