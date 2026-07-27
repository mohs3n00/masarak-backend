import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../course.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentType } from '@prisma/client';

@Injectable()
export class CourseContentService {
  constructor(
    private readonly repo: CourseRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSection(courseId: string, title: string, order: number) {
    return this.repo.createSection({ courseId, title, order });
  }

  async createLesson(
    sectionId: string,
    title: string,
    type: ContentType,
    description?: string,
    order: number = 0,
  ) {
    return this.repo.createLesson({
      sectionId,
      title,
      type,
      description,
      order,
    });
  }

  async addVideoToLesson(
    lessonId: string,
    videoUrl: string,
    duration: number,
    provider: any,
  ) {
    return this.repo.createLessonVideo({
      lessonId,
      videoUrl,
      duration,
      provider,
    });
  }
}
