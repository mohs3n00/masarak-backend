import { Module } from '@nestjs/common';
import { StudentLearningController } from './student-learning.controller';
import { StudentLearningRepository } from './student-learning.repository';
import { StudentLearningService } from './student-learning.service';
import { LessonSummaryModule } from '../lesson-summary/lesson-summary.module';

@Module({ imports: [LessonSummaryModule], controllers: [StudentLearningController], providers: [StudentLearningRepository, StudentLearningService] })
export class StudentLearningModule {}
