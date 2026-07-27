import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role, CourseStatus } from '@prisma/client';
import { CleanupService } from '../../../shared/cloudinary/cleanup.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cleanupService: CleanupService,
  ) {}

  async getPlatformStats() {
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      pendingTeachers,
      totalOrders,
      totalEnrollments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.TEACHER } }),
      this.prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.prisma.teacherProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.order.count(),
      this.prisma.enrollment.count(),
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalCourses,
      pendingTeachers,
      totalOrders,
      totalEnrollments,
    };
  }

  async getTeachers(opts: { take?: number; skip?: number; status?: string; search?: string }) {
    const { take = 20, skip = 0, status, search } = opts;

    const where: any = { role: Role.TEACHER };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          teacherProfile: {
            include: { subjects: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Filter by verification status after join (since it's on teacherProfile)
    const filtered = status
      ? data.filter((u) => u.teacherProfile?.verificationStatus === status.toUpperCase())
      : data;

    return {
      data: filtered.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        avatar: u.avatar,
        isActive: u.isActive,
        createdAt: u.createdAt,
        verificationStatus: u.teacherProfile?.verificationStatus ?? 'PENDING',
        teachingSubjects: u.teacherProfile?.subjects?.map(s => s.name) ?? [],
        nationalId: u.teacherProfile?.nationalId,
      })),
      total,
      take,
      skip,
    };
  }

  async approveTeacher(teacherId: string) {
    return this.prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: { verificationStatus: 'APPROVED' },
    });
  }

  async rejectTeacher(teacherId: string) {
    return this.prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: { verificationStatus: 'REJECTED' },
    });
  }

  async getStudents(opts: { take?: number; skip?: number; search?: string }) {
    const { take = 20, skip = 0, search } = opts;

    const where: any = { role: Role.STUDENT };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          studentProfile: true,
          enrollments: { select: { id: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        isActive: u.isActive,
        lockedUntil: u.lockedUntil,
        failedLoginAttempts: u.failedLoginAttempts,
        createdAt: u.createdAt,
        grade: u.studentProfile?.grade,
        track: u.studentProfile?.track,
        enrollmentCount: u.enrollments.length,
      })),
      total,
      take,
      skip,
    };
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async activateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async deleteUser(userId: string) {
    // 1. Pre-fetch related resources to clean up Cloudinary
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: {
          include: {
            courseInstructors: {
              include: {
                course: {
                  include: {
                    sections: {
                      include: {
                        lessons: {
                          include: { attachments: true, videos: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        submissions: true,
      }
    });

    if (!user) return;

    const urlsToDelete: (string | null)[] = [];
    urlsToDelete.push(user.avatar);

    if (user.teacherProfile) {
      for (const ci of user.teacherProfile.courseInstructors) {
        urlsToDelete.push(ci.course.thumbnailUrl);
        for (const section of ci.course.sections) {
          for (const lesson of section.lessons) {
            for (const v of lesson.videos) urlsToDelete.push(v.videoUrl);
            for (const att of lesson.attachments) urlsToDelete.push(att.fileUrl);
          }
        }
      }
    }

    if (user.submissions) {
      for (const sub of user.submissions) urlsToDelete.push(sub.fileUrl);
    }

    // 2. Delete the user (cascades all DB records)
    const deletedUser = await this.prisma.user.delete({
      where: { id: userId },
    });

    // 3. Delete from Cloudinary asynchronously to avoid blocking the response
    this.cleanupService.deleteFilesByUrls(urlsToDelete);

    return deletedUser;
  }

  async getCourses(opts: { take?: number; skip?: number; status?: string; search?: string }) {
    const { take = 20, skip = 0, status, search } = opts;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          instructors: {
            include: { teacher: { include: { user: { select: { name: true } } } } },
            where: { isOwner: true },
          },
          subject: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price,
        status: c.status,
        visibility: c.visibility,
        accessType: c.accessType,
        grade: c.grades[0] || null,
        createdAt: c.createdAt,
        category: c.subject?.name,
        ownerName: c.instructors[0]?.teacher?.user?.name,
        teacherName: c.instructors[0]?.teacher?.user?.name,
        enrollmentCount: c._count.enrollments,
        averageRating: c.averageRating,
      })),
      total,
      take,
      skip,
    };
  }

  async publishCourse(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED, isPublished: true },
    });
  }

  async unpublishCourse(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.DRAFT, isPublished: false },
    });
  }

  async deleteCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: { include: { attachments: true, videos: true } }
          }
        }
      }
    });

    if (!course) return;

    const urlsToDelete: (string | null)[] = [];
    urlsToDelete.push(course.thumbnailUrl);
    
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        for (const v of lesson.videos) urlsToDelete.push(v.videoUrl);
        for (const att of lesson.attachments) urlsToDelete.push(att.fileUrl);
      }
    }

    const deleted = await this.prisma.course.delete({
      where: { id: courseId },
    });

    this.cleanupService.deleteFilesByUrls(urlsToDelete);

    return deleted;
  }

  async getCourseBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        subject: true,
        sections: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        instructors: {
          include: {
            teacher: {
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
          },
        },
        _count: {
          select: { enrollments: true, reviews: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const { subject, ...rest } = course as any;
    return {
      ...rest,
      subject,
      category: subject,
      grade: course.grades?.[0] || null,
    };
  }

  // ── Notifications ───────────────────────────────────────────────────────
  async sendNotification(dto: {
    target: 'ALL' | 'STUDENTS' | 'TEACHERS' | string;
    title: string;
    message: string;
  }) {
    let userIds: string[] = [];

    if (dto.target === 'ALL') {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u) => u.id);
    } else if (dto.target === 'STUDENTS') {
      const users = await this.prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
      userIds = users.map((u) => u.id);
    } else if (dto.target === 'TEACHERS') {
      const users = await this.prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true } });
      userIds = users.map((u) => u.id);
    } else {
      // specific user id
      userIds = [dto.target];
    }

    if (userIds.length > 0) {
      await this.prisma.notification.createMany({
        data: userIds.map((id) => ({
          userId: id,
          title: dto.title,
          message: dto.message,
          type: 'SYSTEM',
        })),
      });
    }

    return { success: true, count: userIds.length };
  }

  // ── Coupons ────────────────────────────────────────────────────────

  async getCoupons(take: number, skip: number) {
    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        take,
        skip,
        orderBy: { validFrom: 'desc' },
        include: { course: { select: { id: true, title: true } } },
      }),
      this.prisma.coupon.count(),
    ]);
    return { data, total, page: Math.floor(skip / take) + 1, limit: take };
  }

  async createCoupon(dto: any) {
    // Check if code exists
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() }
    });

    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        maxUses: dto.maxUses || null,
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        courseId: dto.courseId || null,
      }
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  async unlockUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    return { success: true, message: 'Account unlocked successfully' };
  }
}
