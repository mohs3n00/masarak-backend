import { Module } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { StudentDashboardService } from './services/student-dashboard.service';
import { StudentAnalyticsService } from './services/student-analytics.service';
import { StudentController } from './controllers/student.controller';
import { CheckoutController } from './controllers/checkout.controller';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [CourseModule],
  controllers: [StudentController, CheckoutController],
  providers: [
    StudentRepository,
    StudentDashboardService,
    StudentAnalyticsService,
    PrismaService,
  ],
  exports: [
    StudentRepository,
    StudentDashboardService,
    StudentAnalyticsService,
  ],
})
export class StudentModule {}
