import { Module } from '@nestjs/common';
import { ExamController } from './controllers/exam.controller';
import { ExamService } from './services/exam.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [PrismaModule, CourseModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
