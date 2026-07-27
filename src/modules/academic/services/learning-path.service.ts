import { Injectable } from '@nestjs/common';
import { AcademicRepository } from '../academic.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LearningPathService {
  constructor(
    private readonly repo: AcademicRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createLearningPath(
    title: string,
    slug: string,
    description?: string,
    thumbnailUrl?: string,
  ) {
    const path = await this.repo.createLearningPath({
      title,
      slug,
      description,
      thumbnailUrl,
    });
    this.eventEmitter.emit('academic.learningPath.created', path);
    return path;
  }

  async getLearningPaths() {
    return this.repo.findLearningPaths();
  }

  async deleteLearningPath(id: string) {
    return this.repo.softDeleteLearningPath(id);
  }
}
