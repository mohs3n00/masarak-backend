import { Injectable } from '@nestjs/common';
import { StudentRepository } from '../student.repository';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class StudentAnalyticsService {
  constructor(private readonly repo: StudentRepository) {}

  @OnEvent('course.lesson.completed')
  async handleLessonCompleted(payload: { userId: string; lessonId: string }) {
    await this.repo.incrementCompletedLessons(payload.userId);
  }

  @OnEvent('student.session.ended')
  async handleSessionEnded(payload: {
    sessionId: string;
    userId: string;
    endTime: Date;
    duration: number;
  }) {
    await this.repo.endLearningSession(
      payload.sessionId,
      payload.endTime,
      payload.duration,
    );
    await this.repo.incrementWatchTime(payload.userId, payload.duration);
    // Evaluate streaks logic here...
  }
}
