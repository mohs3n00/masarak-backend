import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EnrollmentStatus, CourseStatus } from '@prisma/client';

@Injectable()
export class StudentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [
      user,
      enrollments,
      statistics,
      streak,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, avatar: true,
          studentProfile: { select: { grade: true, track: true, academicYear: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { userId, status: EnrollmentStatus.ACTIVE },
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: {
            select: {
              id: true, title: true, slug: true, thumbnailUrl: true, grades: true,
              instructors: {
                include: { teacher: { include: { user: { select: { name: true } } } } },
                where: { isOwner: true },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.studentStatistics.findUnique({ where: { userId } }),
      this.prisma.studentStreak.findUnique({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, message: true, isRead: true, type: true, createdAt: true },
      }),
    ]);

    // Count course progress
    const progressList = await this.prisma.courseProgress.findMany({
      where: { userId },
      select: { courseId: true, completionPct: true, lastAccessedAt: true },
      orderBy: { lastAccessedAt: 'desc' },
    });

    const progressMap = new Map(progressList.map((p) => [p.courseId, p]));

    const enrolledCourses = enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      course: {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnailUrl: e.course.thumbnailUrl,
        grade: e.course.grades[0] || null,
        teacherName: e.course.instructors[0]?.teacher?.user?.name,
      },
      progress: progressMap.get(e.course.id) ?? { completionPct: 0 },
    }));

    return {
      user: {
        id: user?.id,
        name: user?.name,
        avatar: user?.avatar,
        grade: user?.studentProfile?.grade,
        track: user?.studentProfile?.track,
        academicYear: user?.studentProfile?.academicYear,
      },
      stats: {
        totalEnrollments: enrollments.length,
        completedCourses: statistics?.completedCourses ?? 0,
        completedLessons: statistics?.completedLessons ?? 0,
        studyHoursTotal: Math.floor((statistics?.totalSecondsWatched ?? 0) / 3600),
        streak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
      },
      enrolledCourses,
      recentNotifications,
    };
  }

  async getMyCourses(userId: string, opts: { take?: number; skip?: number }) {
    const { take = 20, skip = 0 } = opts;

    // Get student profile for grade-based filtering
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId, status: EnrollmentStatus.ACTIVE },
        skip,
        take,
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: {
            include: {
              instructors: {
                include: { teacher: { include: { user: { select: { name: true, avatar: true } } } } },
                where: { isOwner: true },
                take: 1,
              },
              _count: { select: { sections: true } },
            },
          },
        },
      }),
      this.prisma.enrollment.count({ where: { userId, status: EnrollmentStatus.ACTIVE } }),
    ]);

    const progressList = await this.prisma.courseProgress.findMany({
      where: { userId, courseId: { in: enrollments.map(e => e.course.id) } },
    });
    const progressMap = new Map(progressList.map(p => [p.courseId, p]));

    return {
      data: enrollments.map((e) => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolledAt,
        course: {
          id: e.course.id,
          title: e.course.title,
          slug: e.course.slug,
          thumbnailUrl: e.course.thumbnailUrl,
          price: e.course.price,
          grade: e.course.grades[0] || null,
          teacherName: e.course.instructors[0]?.teacher?.user?.name,
          teacherAvatar: e.course.instructors[0]?.teacher?.user?.avatar,
          sectionsCount: e.course._count.sections,
        },
        progress: {
          completionPct: progressMap.get(e.course.id)?.completionPct ?? 0,
          lastAccessedAt: progressMap.get(e.course.id)?.lastAccessedAt,
          completedAt: progressMap.get(e.course.id)?.completedAt,
        },
      })),
      total,
    };
  }

  async getAvailableCourses(userId: string, opts: { take?: number; skip?: number }) {
    const { take = 20, skip = 0 } = opts;

    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });

    const where: any = {
      status: CourseStatus.PUBLISHED,
    };

    if (profile?.grade) {
      const getGradeVariants = (grade: string): string[] => {
        if (!grade) return [];
        const normalized = grade.replace(/[أإآا]/g, 'ا').replace(/[ىي]/g, 'ي').trim();
        const set = new Set<string>([grade, normalized]);
        const knownVariants = [
          'الصف الأول الثانوي', 'الصف الاول الثانوي', 'الصف الأول الثانوى', 'الصف الاول الثانوى',
          'الصف الثاني الثانوي', 'الصف الثاني الثانوى', 'الصف الثانى الثانوي', 'الصف الثانى الثانوى',
          'الصف الثالث الثانوي', 'الصف الثالث الثانوى'
        ];
        for (const v of knownVariants) {
          if (v.replace(/[أإآا]/g, 'ا').replace(/[ىي]/g, 'ي') === normalized) {
            set.add(v);
          }
        }
        return Array.from(set);
      };

      const matchingGrades = getGradeVariants(profile.grade);
      where.OR = [
        { grades: { isEmpty: true } },
        { grades: { hasSome: matchingGrades } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          instructors: {
            include: { teacher: { include: { user: { select: { name: true, avatar: true } } } } },
            where: { isOwner: true },
            take: 1,
          },
          subject: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const enrolledIds = new Set(
      (await this.prisma.enrollment.findMany({
        where: { userId, status: EnrollmentStatus.ACTIVE },
        select: { courseId: true },
      })).map(e => e.courseId)
    );

    return {
      data: courses.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price,
        accessType: c.accessType,
        grade: c.grades[0] || null,
        category: c.subject?.name,
        teacherName: c.instructors[0]?.teacher?.user?.name,
        teacherAvatar: c.instructors[0]?.teacher?.user?.avatar,
        enrollmentCount: c._count.enrollments,
        isEnrolled: enrolledIds.has(c.id),
      })),
      total,
    };
  }

  async getNotifications(userId: string, opts: { take?: number; skip?: number }) {
    const { take = 20, skip = 0 } = opts;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, unreadCount };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }


  async getCourseWorkspace(userId: string, slug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        instructors: { where: { isOwner: true }, include: { teacher: { include: { user: { select: { id: true, name: true } } } } } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                videos: {
                  select: {
                    id: true,
                    duration: true,
                    thumbnailUrl: true,
                    provider: true,
                    // ❌ videoUrl intentionally excluded — served via /student/video/:id/stream
                  }
                },
                attachments: {
                  select: { id: true, fileName: true, fileType: true, sizeBytes: true, fileUrl: true }
                },
                resources: true,
                examTemplate: {
                  select: { status: true }
                },
                progress: { where: { userId } }
              }
            }
          }
        }
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const isOwner = course.instructors.some(i => i.teacher?.user?.id === userId);
    
    let isEnrolled = false;
    if (!isOwner && !isAdmin) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: course.id, status: 'ACTIVE' }
      });
      isEnrolled = !!enrollment;
    }

    if (!isOwner && !isAdmin && !isEnrolled) {
      throw new ForbiddenException('يجب استخدام كود خصم 100% من معلمك لفتح هذه الدورة لحين تفعيل بوابة الدفع الإلكتروني');
    }

    const userRating = await this.prisma.review.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: userId,
        },
      },
      select: {
        rating: true,
        comment: true,
      },
    });

    const filteredSections = course.sections.map(section => ({
      ...section,
      lessons: section.lessons.filter(lesson => {
        if (lesson.type === 'EXAM' && (lesson as any).examTemplate?.status === 'DRAFT') {
          return false;
        }
        return true;
      }),
    }));

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        teacherName: course.instructors[0]?.teacher?.user?.name,
        averageRating: course.averageRating,
        reviewCount: course.reviewCount,
      },
      sections: filteredSections,
      userRating: userRating || null,
    };
  }

  async getLessonNote(userId: string, lessonId: string) {
    return this.prisma.studentNote.findFirst({
      where: { userId, lessonId },
    });
  }

  async saveLessonNote(userId: string, lessonId: string, content: string) {
    const existing = await this.prisma.studentNote.findFirst({
      where: { userId, lessonId },
    });

    if (existing) {
      return this.prisma.studentNote.update({
        where: { id: existing.id },
        data: { content },
      });
    }

    return this.prisma.studentNote.create({
      data: {
        userId,
        lessonId,
        content,
      },
    });
  }

  async checkEnrollment(userId: string, courseIdInput: string) {
    const decodedInput = decodeURIComponent(courseIdInput);
    let targetCourseId = decodedInput;
    const courseObj = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: decodedInput },
          { slug: decodedInput },
        ],
      },
      select: { id: true },
    });

    if (courseObj) {
      targetCourseId = courseObj.id;
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: targetCourseId, status: EnrollmentStatus.ACTIVE },
    });
    return { isEnrolled: !!enrollment };
  }

  async rateCourse(userId: string, courseIdInput: string, rating: number, comment?: string) {
    let targetCourseId = courseIdInput;
    const courseObj = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: courseIdInput },
          { slug: courseIdInput },
        ],
      },
      select: { id: true },
    });

    if (courseObj) {
      targetCourseId = courseObj.id;
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: targetCourseId, status: EnrollmentStatus.ACTIVE },
    });
    if (!enrollment) {
      throw new ForbiddenException('يمكنك تقييم الكورس فقط بعد الاشتراك فيه');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('يجب أن يكون التقييم بين 1 و 5 نجوم');
    }

    const review = await this.prisma.review.upsert({
      where: {
        courseId_studentId: {
          courseId: targetCourseId,
          studentId: userId,
        },
      },
      update: {
        rating,
        comment,
      },
      create: {
        courseId: targetCourseId,
        studentId: userId,
        rating,
        comment,
      },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { courseId: targetCourseId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = aggregate._avg.rating || 0;
    const reviewCount = aggregate._count.rating || 0;

    await this.prisma.course.update({
      where: { id: targetCourseId },
      data: {
        averageRating,
        reviewCount,
      },
    });

    const ownerInstructor = await this.prisma.courseInstructor.findFirst({
      where: { courseId: targetCourseId, isOwner: true },
      include: { teacher: true },
    });

    if (ownerInstructor) {
      const teacherId = ownerInstructor.teacherId;
      const teacherCourses = await this.prisma.courseInstructor.findMany({
        where: { teacherId },
        select: { courseId: true },
      });
      const courseIds = teacherCourses.map((tc) => tc.courseId);

      const teacherAggregate = await this.prisma.review.aggregate({
        where: { courseId: { in: courseIds } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.teacherAnalytics.upsert({
        where: { teacherId },
        update: {
          averageRating: teacherAggregate._avg.rating || 0,
          totalReviews: teacherAggregate._count.rating || 0,
        },
        create: {
          teacherId,
          averageRating: teacherAggregate._avg.rating || 0,
          totalReviews: teacherAggregate._count.rating || 0,
        },
      });
    }

    return {
      success: true,
      review,
      averageRating,
      reviewCount,
      message: 'تم حفظ تقييمك بنجاح',
    };
  }

}

