import { Module } from '@nestjs/common';
import { TeacherRepository } from './teacher.repository';
import { TeacherDashboardService } from './services/teacher-dashboard.service';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherCouponsController } from './controllers/teacher-coupons.controller';
import { TeacherExamController } from './controllers/teacher-exam.controller';
import { TeacherExamService } from './services/teacher-exam.service';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { NotificationModule } from '../../shared/notifications/notification.module';
import { LessonSummaryModule } from '../lesson-summary/lesson-summary.module';

@Module({
  imports: [CloudinaryModule, NotificationModule, LessonSummaryModule],
  controllers: [
    TeacherController,
    TeacherCouponsController,
    TeacherExamController,
  ],
  providers: [TeacherRepository, TeacherDashboardService, TeacherExamService],
  exports: [TeacherRepository],
})
export class TeacherModule {}
