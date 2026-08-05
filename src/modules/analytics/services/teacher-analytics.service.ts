import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CourseStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';

@Injectable()
export class TeacherAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTeacherProfile(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new Error('Teacher profile not found');
    return profile;
  }

  async getOverview(userId: string) {
    const profile = await this.getTeacherProfile(userId);

    const [totalCourses, publishedCourses, draftCourses, totalStudents] = await Promise.all([
      this.prisma.courseInstructor.count({ where: { teacherId: profile.id } }),
      this.prisma.courseInstructor.count({ where: { teacherId: profile.id, course: { status: CourseStatus.PUBLISHED } } }),
      this.prisma.courseInstructor.count({ where: { teacherId: profile.id, course: { status: CourseStatus.DRAFT } } }),
      this.prisma.enrollment.count({
        where: { course: { instructors: { some: { teacherId: profile.id } } } }
      })
    ]);

    return { totalCourses, publishedCourses, draftCourses, totalStudents };
  }

  async getLearning(userId: string) {
    const profile = await this.getTeacherProfile(userId);

    const coursesIds = await this.prisma.courseInstructor.findMany({
      where: { teacherId: profile.id },
      select: { courseId: true }
    }).then(res => res.map(r => r.courseId));

    if (coursesIds.length === 0) {
      return { averageCompletionRate: 0, lessonsCompleted: 0, videoWatchTimeMinutes: 0 };
    }

    const [courseProgressAgg, lessonsCompleted, videoProgressAgg] = await Promise.all([
      this.prisma.courseProgress.aggregate({
        where: { courseId: { in: coursesIds } },
        _avg: { completionPct: true }
      }),
      this.prisma.lessonProgress.count({
        where: { lesson: { section: { courseId: { in: coursesIds } } }, isCompleted: true }
      }),
      this.prisma.videoProgress.aggregate({
        where: { video: { lesson: { section: { courseId: { in: coursesIds } } } } },
        _sum: { watchedSeconds: true }
      })
    ]);

    return {
      averageCompletionRate: courseProgressAgg._avg.completionPct || 0,
      lessonsCompleted,
      videoWatchTimeMinutes: Math.floor((videoProgressAgg._sum.watchedSeconds || 0) / 60),
    };
  }

  async getConversations(userId: string) {
    const today = startOfDay(new Date());

    const convos = await this.prisma.academicConversation.groupBy({
      by: ['status'],
      where: { teacherId: userId },
      _count: { _all: true }
    });

    const answeredToday = await this.prisma.academicConversation.count({
      where: { teacherId: userId, status: 'ANSWERED', updatedAt: { gte: today } }
    });

    const waiting = convos.find(c => c.status === 'WAITING_REPLY')?._count._all || 0;
    const unread = await this.prisma.academicConversation.count({
      where: { teacherId: userId, unreadTeacherCount: { gt: 0 } }
    });
    const avgReplyTimeMin = 25; // Placeholder

    return { questionsWaiting: waiting, answeredToday, unread, avgReplyTimeMin };
  }

  async getCourseAnalytics(userId: string) {
    const profile = await this.getTeacherProfile(userId);

    const courses = await this.prisma.courseInstructor.findMany({
      where: { teacherId: profile.id },
      include: {
        course: {
          include: {
            _count: { select: { enrollments: true, reviews: true, academicConversations: true } }
          }
        }
      }
    });

    const courseIds = courses.map(c => c.courseId);

    const avgProgress = await this.prisma.courseProgress.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _avg: { completionPct: true }
    });

    return courses.map(c => {
      const prog = avgProgress.find(p => p.courseId === c.courseId);
      return {
        id: c.course.id,
        title: c.course.title,
        status: c.course.status,
        enrollments: c.course._count.enrollments,
        reviews: c.course._count.reviews,
        questions: c.course._count.academicConversations,
        completionRate: prog?._avg.completionPct || 0,
      };
    });
  }
}
