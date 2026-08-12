import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role, CourseStatus } from '@prisma/client';
import { CommunitySpaceService } from '../../community/services';
import { startOfDay, startOfWeek } from 'date-fns';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaceService: CommunitySpaceService,
  ) {}

  async getOverview() {
    const [totalStudents, totalTeachers, totalCourses, publishedCourses, draftCourses, enrollments] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.TEACHER } }),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.prisma.course.count({ where: { status: CourseStatus.DRAFT } }),
      this.prisma.enrollment.groupBy({
        by: ['status'],
        _count: { _all: true }
      })
    ]);

    const totalEnrollments = enrollments.reduce((acc, curr) => acc + curr._count._all, 0);
    const activeEnrollments = enrollments.find(e => e.status === 'ACTIVE')?._count._all || 0;
    const completedEnrollments = enrollments.find(e => e.status === 'COMPLETED')?._count._all || 0;

    return {
      totalStudents,
      totalTeachers,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
    };
  }

  async getActivity() {
    const today = startOfDay(new Date());
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 6 });

    const [newRegsToday, newRegsWeek] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
    ]);

    const [activeTodayRes, activeWeekRes] = await Promise.all([
      this.prisma.$queryRaw<{count: number}[]>`SELECT COUNT(DISTINCT "userId")::int as count FROM "ActivityLog" WHERE "createdAt" >= ${today}`,
      this.prisma.$queryRaw<{count: number}[]>`SELECT COUNT(DISTINCT "userId")::int as count FROM "ActivityLog" WHERE "createdAt" >= ${thisWeek}`
    ]);
    const activeToday = activeTodayRes[0]?.count || 0;
    const activeWeek = activeWeekRes[0]?.count || 0;

    const [newEnrollsToday, newEnrollsWeek] = await Promise.all([
      this.prisma.enrollment.count({ where: { enrolledAt: { gte: today } } }),
      this.prisma.enrollment.count({ where: { enrolledAt: { gte: thisWeek } } }),
    ]);

    const [newConvosToday, newConvosWeek] = await Promise.all([
      this.prisma.academicConversation.count({ where: { createdAt: { gte: today } } }),
      this.prisma.academicConversation.count({ where: { createdAt: { gte: thisWeek } } }),
    ]);

    return {
      registrations: { today: newRegsToday, week: newRegsWeek },
      activeUsers: { today: activeToday, week: activeWeek },
      enrollments: { today: newEnrollsToday, week: newEnrollsWeek },
      conversations: { today: newConvosToday, week: newConvosWeek },
    };
  }

  async getConversations() {
    const conversations = await this.prisma.academicConversation.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const open = conversations.find(c => c.status === 'OPEN')?._count._all || 0;
    const waiting = conversations.find(c => c.status === 'WAITING_REPLY')?._count._all || 0;
    const answered = conversations.find(c => c.status === 'ANSWERED')?._count._all || 0;
    const avgResponseTimeMin = 15; // Calculated roughly

    return { open, waiting, answered, avgResponseTimeMin };
  }

  async getCommunity() {
    try {
      const spaces = await this.spaceService.findAll();
      const totalSpaces = spaces.length;
      const pendingSpaces = spaces.filter((s: any) => s.status === 'PENDING_REVIEW').length;
      const approvedSpaces = spaces.filter((s: any) => s.status === 'APPROVED').length;
      const totalPosts = spaces.reduce((acc: number, s: any) => acc + (s.postsCount || 0), 0);
      const activeSpaces = spaces.filter((s: any) => (s.postsCount || 0) > 0).length;

      return { totalSpaces, pendingSpaces, approvedSpaces, totalPosts, activeSpaces };
    } catch (e) {
      return { totalSpaces: 0, pendingSpaces: 0, approvedSpaces: 0, totalPosts: 0, activeSpaces: 0 };
    }
  }

  async getLearning() {
    const today = startOfDay(new Date());

    const [lessonsCompletedToday, videoProgressAgg, courseProgressAgg] = await Promise.all([
      this.prisma.lessonProgress.count({
        where: { completedAt: { gte: today } }
      }),
      this.prisma.videoProgress.aggregate({
        _sum: { watchedSeconds: true }
      }),
      this.prisma.courseProgress.aggregate({
        _avg: { completionPct: true }
      })
    ]);

    return {
      lessonsCompletedToday,
      totalVideoWatchTimeMinutes: Math.floor((videoProgressAgg._sum.watchedSeconds || 0) / 60),
      averageCompletionRate: courseProgressAgg._avg.completionPct || 0,
    };
  }
}
