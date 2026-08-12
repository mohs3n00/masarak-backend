import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role, CourseStatus } from '@prisma/client';
import { CleanupService } from '../../../shared/cloudinary/cleanup.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '../../../shared/cache/cache.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 32768,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cleanupService: CleanupService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
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
      this.prisma.teacherProfile.count({
        where: { verificationStatus: 'PENDING' },
      }),
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

  async getTeachers(opts: {
    take?: number;
    skip?: number;
    status?: string;
    search?: string;
  }) {
    const { take = 20, skip = 0, status, search } = opts;

    const where: any = { role: Role.TEACHER };
    if (status) {
      where.teacherProfile = { verificationStatus: status.toUpperCase() };
    }
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

    return {
      data: data.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        avatar: u.avatar,
        isActive: u.isActive,
        createdAt: u.createdAt,
        verificationStatus: u.teacherProfile?.verificationStatus ?? 'PENDING',
        teachingSubjects: u.teacherProfile?.subjects?.map((s) => s.name) ?? [],
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
        parentPhone: u.studentProfile?.parentPhone,
        enrollmentCount: u.enrollments.length,
      })),
      total,
      take,
      skip,
    };
  }

  async suspendUser(userId: string) {
    await this.cacheService.del(`auth_user:${userId}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async activateUser(userId: string) {
    await this.cacheService.del(`auth_user:${userId}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async deleteUser(userId: string, transferToTeacherId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: {
          include: {
            courseInstructors: true,
          },
        },
      },
    });

    if (!user) return;
    await this.cacheService.del(`auth_user:${userId}`);

    // Handle Teacher constraints
    if (user.role === Role.TEACHER && user.teacherProfile) {
      const hasCourses = user.teacherProfile.courseInstructors.length > 0;

      if (hasCourses) {
        if (!transferToTeacherId) {
          throw new BadRequestException(
            'Cannot delete a teacher who owns courses. Provide a transferToTeacherId to transfer ownership.',
          );
        }

        // Verify the new teacher exists
        const newTeacher = await this.prisma.user.findUnique({
          where: { id: transferToTeacherId },
          include: { teacherProfile: true },
        });

        if (
          !newTeacher ||
          newTeacher.role !== Role.TEACHER ||
          !newTeacher.teacherProfile
        ) {
          throw new BadRequestException('Invalid transferToTeacherId provided.');
        }
      }
    }

    // Execute in a single transaction
    await this.prisma.$transaction(async (tx) => {
      // Transfer courses if needed
      if (
        user.role === Role.TEACHER &&
        user.teacherProfile &&
        transferToTeacherId
      ) {
        const courseIds = user.teacherProfile.courseInstructors.map(
          (ci) => ci.courseId,
        );

        const newTeacherProfileId = await tx.teacherProfile
          .findUnique({ where: { userId: transferToTeacherId } })
          .then((p) => p?.id);

        if (courseIds.length > 0 && newTeacherProfileId) {
          // Delete old instructor records for this teacher
          await tx.courseInstructor.deleteMany({
            where: {
              teacherId: user.teacherProfile.id,
              courseId: { in: courseIds },
            },
          });

          // Insert new instructor records (using upsert or createMany depending on uniqueness)
          // To be safe, we'll create them one by one or ignore duplicates.
          for (const courseId of courseIds) {
            const existing = await tx.courseInstructor.findUnique({
              where: {
                courseId_teacherId: {
                  courseId,
                  teacherId: newTeacherProfileId,
                },
              },
            });
            if (!existing) {
              await tx.courseInstructor.create({
                data: {
                  courseId,
                  teacherId: newTeacherProfileId,
                  isOwner: true, // assume owner if they were transferred
                },
              });
            }
          }
        }
      }

      // Delete the user (cascades all DB records)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // Notify gateways to disconnect the user
    this.eventEmitter.emit('user.account.deleted', { userId });

    // Try to cleanup their avatar asynchronously
    if (user.avatar) {
      this.cleanupService.deleteFilesByUrls([user.avatar]);
    }

    return { message: 'User deleted successfully' };
  }

  async updateUserAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatar && user.avatar !== avatarUrl) {
      this.cleanupService.deleteFilesByUrls([user.avatar]);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    await this.cacheService.del(`auth_user:${userId}`);
    return updated;
  }

  async getCourses(opts: {
    take?: number;
    skip?: number;
    status?: string;
    search?: string;
  }) {
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
            include: {
              teacher: { include: { user: { select: { name: true } } } },
            },
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
            lessons: { include: { attachments: true, videos: true } },
          },
        },
      },
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
        OR: [{ slug: slug }, { id: slug }],
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
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
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
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    target: 'ALL' | 'STUDENTS' | 'TEACHERS' | string;
    title: string;
    message: string;
  }) {
    let totalCount = 0;

    if (dto.target === 'ALL' || dto.target === 'STUDENTS' || dto.target === 'TEACHERS') {
      let whereClause: any = {};
      if (dto.target === 'STUDENTS') whereClause = { role: Role.STUDENT };
      else if (dto.target === 'TEACHERS') whereClause = { role: Role.TEACHER };

      let lastId: string | undefined = undefined;
      const BATCH_SIZE = 5000;

      while (true) {
        const users: { id: string }[] = await this.prisma.user.findMany({
          where: whereClause,
          select: { id: true },
          take: BATCH_SIZE,
          skip: lastId ? 1 : 0,
          cursor: lastId ? { id: lastId } : undefined,
          orderBy: { id: 'asc' },
        });

        if (users.length === 0) break;

        await this.prisma.notification.createMany({
          data: users.map((u: any) => ({
            userId: u.id,
            title: dto.title,
            message: dto.message,
            type: 'SYSTEM',
          })),
        });

        totalCount += users.length;
        lastId = users[users.length - 1].id;
      }
    } else {
      await this.prisma.notification.create({
        data: {
          userId: dto.target,
          title: dto.title,
          message: dto.message,
          type: 'SYSTEM',
        },
      });
      totalCount = 1;
    }

    return { success: true, count: totalCount };
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
      where: { code: dto.code.toUpperCase() },
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
      },
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

  async resetUserPassword(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Generate a strong, readable random password
    const base = crypto.randomBytes(4).toString('hex').toLowerCase();
    const newPassword = `M@${base}X9`;

    const hashedPassword = await argon2.hash(newPassword, ARGON2_OPTIONS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all existing sessions for security
    const sessions = await this.prisma.session.findMany({ where: { userId }, select: { id: true } });
    if (sessions.length > 0) {
      await this.prisma.session.deleteMany({ where: { userId } });
      for (const session of sessions) {
        await this.cacheService.del(`auth_session:${session.id}`);
      }
    }

    return { newPassword };
  }
}
