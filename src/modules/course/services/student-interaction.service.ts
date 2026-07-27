import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../course.repository';

@Injectable()
export class StudentInteractionService {
  constructor(private readonly repo: CourseRepository) {}

  async addNoteToLesson(
    userId: string,
    lessonId: string,
    content: string,
    videoTimestamp?: number,
  ) {
    return this.repo.addNote(userId, lessonId, content, videoTimestamp);
  }

  async bookmarkLesson(
    userId: string,
    lessonId: string,
    videoTimestamp?: number,
    title?: string,
  ) {
    return this.repo.addBookmark(userId, lessonId, videoTimestamp, title);
  }
}
