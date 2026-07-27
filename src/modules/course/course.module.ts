import { Module } from '@nestjs/common';
import { CourseRepository } from './course.repository';
import { CourseBuilderService } from './services/course-builder.service';
import { CourseContentService } from './services/course-content.service';
import { LearningEngineService } from './services/learning-engine.service';
import { StudentInteractionService } from './services/student-interaction.service';

@Module({
  controllers: [],
  providers: [
    CourseRepository,
    CourseBuilderService,
    CourseContentService,
    LearningEngineService,
    StudentInteractionService,
  ],
  exports: [
    CourseRepository,
    CourseBuilderService,
    CourseContentService,
    LearningEngineService,
    StudentInteractionService,
  ],
})
export class CourseModule {}
