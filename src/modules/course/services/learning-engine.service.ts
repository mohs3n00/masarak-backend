import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../course.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LearningEngineService {
  constructor(
    private readonly repo: CourseRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async syncVideoProgress(
    userId: string,
    videoId: string,
    deltaSeconds: number,
    currentPosition: number,
    isCompleted: boolean,
  ) {
    if (deltaSeconds > 0) {
      await this.repo.incrementStudentWatchTime(userId, deltaSeconds);
    }
    const progress = await this.repo.updateVideoProgress(
      userId,
      videoId,
      currentPosition,
      isCompleted,
    );
    
    if (isCompleted) {
      const video = await this.repo.getLessonVideoWithCourse(videoId);
      if (video) {
        await this.completeLesson(userId, video.lessonId, video.lesson.section.courseId);
      }
    }
    return progress;
  }

  async completeLesson(userId: string, lessonId: string, courseId: string) {
    const progress = await this.repo.markLessonCompleted(userId, lessonId);
    await this.repo.recalculateCourseProgress(userId, courseId);
    this.eventEmitter.emit('course.lesson.completed', {
      userId,
      lessonId,
      courseId,
    });
    return progress;
  }
}
