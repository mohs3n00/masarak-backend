import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { TeacherAnalyticsController } from './controllers/teacher-analytics.controller';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { TeacherAnalyticsService } from './services/teacher-analytics.service';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [CommunityModule],
  controllers: [AdminAnalyticsController, TeacherAnalyticsController],
  providers: [AdminAnalyticsService, TeacherAnalyticsService],
  exports: [AdminAnalyticsService, TeacherAnalyticsService],
})
export class AnalyticsModule {}
