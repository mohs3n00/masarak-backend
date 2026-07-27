import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // COURSE BUILDER
  // ------------------------------------------------------
  async createCourse(data: Prisma.CourseUncheckedCreateInput) {
    return this.prisma.course.create({ data });
  }

  async findCourses(
    skip?: number,
    take?: number,
    filterOptions?: { grade?: string; preferredTeacherId?: string },
  ) {
    const where: Prisma.CourseWhereInput = {};
    if (filterOptions?.grade) {
      where.grades = { has: filterOptions.grade };
    }

    const courses = await this.prisma.course.findMany({
      skip,
      take,
      where,
      include: { instructors: true },
    });

    if (filterOptions?.preferredTeacherId) {
      courses.sort((a, b) => {
        const aHasTeacher = a.instructors.some(
          (i) => i.teacherId === filterOptions.preferredTeacherId,
        );
        const bHasTeacher = b.instructors.some(
          (i) => i.teacherId === filterOptions.preferredTeacherId,
        );
        if (aHasTeacher && !bHasTeacher) return -1;
        if (!aHasTeacher && bHasTeacher) return 1;
        return 0;
      });
    }

    return courses;
  }

  async getCourseById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        instructors: true,
        sections: {
          include: {
            lessons: {
              include: { videos: true, attachments: true, resources: true },
            },
          },
        },
        gallery: true,
        objectives: true,
        requirements: true,
        faqs: true,
      },
    });
  }

  async addInstructor(
    courseId: string,
    teacherId: string,
    isOwner: boolean = false,
  ) {
    return this.prisma.courseInstructor.create({
      data: { courseId, teacherId, isOwner },
    });
  }

  // ------------------------------------------------------
  // CONTENT MANAGEMENT
  // ------------------------------------------------------
  async createSection(data: Prisma.CourseSectionUncheckedCreateInput) {
    return this.prisma.courseSection.create({ data });
  }

  async createLesson(data: Prisma.LessonUncheckedCreateInput) {
    return this.prisma.lesson.create({ data });
  }

  async createLessonVideo(data: Prisma.LessonVideoUncheckedCreateInput) {
    return this.prisma.lessonVideo.create({ data });
  }

  async createLessonAttachment(
    data: Prisma.LessonAttachmentUncheckedCreateInput,
  ) {
    return this.prisma.lessonAttachment.create({ data });
  }

  // ------------------------------------------------------
  // LEARNING ENGINE & PROGRESS
  // ------------------------------------------------------
  async updateVideoProgress(
    userId: string,
    lessonVideoId: string,
    watchedSeconds: number,
    isCompleted: boolean,
  ) {
    return this.prisma.videoProgress.upsert({
      where: { userId_lessonVideoId: { userId, lessonVideoId } },
      update: { watchedSeconds, isCompleted, lastWatchedAt: new Date() },
      create: { userId, lessonVideoId, watchedSeconds, isCompleted },
    });
  }

  async incrementStudentWatchTime(userId: string, seconds: number) {
    return this.prisma.studentStatistics.upsert({
      where: { userId },
      update: { totalSecondsWatched: { increment: Math.floor(seconds) } },
      create: { userId, totalSecondsWatched: Math.floor(seconds) },
    });
  }

  async markLessonCompleted(userId: string, lessonId: string) {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { isCompleted: true, completedAt: new Date() },
      create: { userId, lessonId, isCompleted: true, completedAt: new Date() },
    });
  }

  async updateCourseProgress(
    userId: string,
    courseId: string,
    completionPct: number,
    isCompleted: boolean = false,
  ) {
    return this.prisma.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        completionPct,
        lastAccessedAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        userId,
        courseId,
        completionPct,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  async recalculateCourseProgress(userId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: {
        section: { courseId },
        NOT: {
          type: 'EXAM',
          examTemplate: {
            status: 'DRAFT',
          },
        },
      },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        isCompleted: true,
        lesson: {
          section: { courseId },
          NOT: {
            type: 'EXAM',
            examTemplate: {
              status: 'DRAFT',
            },
          },
        },
      },
    });

    const completionPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCompleted = completionPct === 100;

    return this.updateCourseProgress(userId, courseId, completionPct, isCompleted);
  }

  async getLessonVideoWithCourse(videoId: string) {
    return this.prisma.lessonVideo.findUnique({
      where: { id: videoId },
      include: { lesson: { include: { section: true } } },
    });
  }

  // ------------------------------------------------------
  // STUDENT INTERACTION
  // ------------------------------------------------------
  async addNote(
    userId: string,
    lessonId: string,
    content: string,
    videoTimestamp?: number,
  ) {
    return this.prisma.studentNote.create({
      data: { userId, lessonId, content, videoTimestamp },
    });
  }

  async addBookmark(
    userId: string,
    lessonId: string,
    videoTimestamp?: number,
    title?: string,
  ) {
    return this.prisma.lessonBookmark.create({
      data: { userId, lessonId, videoTimestamp, title },
    });
  }
}
