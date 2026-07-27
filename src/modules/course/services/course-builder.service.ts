import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../course.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CourseBuilderService {
  constructor(
    private readonly repo: CourseRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCourse(
    title: string,
    slug: string,
    description: string,
    price: number,
  ) {
    const course = await this.repo.createCourse({
      title,
      slug,
      description,
      price,
    });
    this.eventEmitter.emit('course.created', course);
    return course;
  }

  async addInstructor(
    courseId: string,
    teacherId: string,
    isOwner: boolean = false,
  ) {
    return this.repo.addInstructor(courseId, teacherId, isOwner);
  }

  async getCourses(
    skip?: number,
    take?: number,
    filterOptions?: { grade?: string; preferredTeacherId?: string },
  ) {
    return this.repo.findCourses(skip, take, filterOptions);
  }

  async getCourseDetails(id: string) {
    return this.repo.getCourseById(id);
  }
}
