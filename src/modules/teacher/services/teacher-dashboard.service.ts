import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CourseStatus, CourseVisibility, CourseAccessType, CourseType, Difficulty, ContentType } from '@prisma/client';
import { CleanupService } from '../../../shared/cloudinary/cleanup.service';
import { NotificationService } from '../../../shared/notifications/notification.service';

@Injectable()
export class TeacherDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cleanupService: CleanupService,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Resolve teacherProfileId from userId ───────────────────────────────
  private async getTeacherProfile(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: { subjects: true }
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');
    return profile;
  }

  // ── Dashboard Stats ────────────────────────────────────────────────────
  async getDashboardStats(userId: string) {
    const profile = await this.getTeacherProfile(userId);

    const [totalCourses, publishedCourses, totalStudents, wallet, analytics] = await Promise.all([
      this.prisma.courseInstructor.count({ where: { teacherId: profile.id } }),
      this.prisma.courseInstructor.count({
        where: {
          teacherId: profile.id,
          course: { status: CourseStatus.PUBLISHED },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          course: {
            instructors: { some: { teacherId: profile.id } },
          },
        },
      }),
      this.prisma.teacherWallet.findUnique({ where: { teacherId: profile.id } }),
      this.prisma.teacherAnalytics.findUnique({ where: { teacherId: profile.id } }),
    ]);

    return {
      totalCourses,
      publishedCourses,
      draftCourses: totalCourses - publishedCourses,
      totalStudents,
      averageRating: analytics?.averageRating ?? 0,
      totalReviews: analytics?.totalReviews ?? 0,
      walletBalance: wallet?.availableBalance ?? 0,
      totalEarned: wallet?.totalEarned ?? 0,
      currency: wallet?.currency ?? 'SAR',
      verificationStatus: profile.verificationStatus,
    };
  }

  // ── My Courses ─────────────────────────────────────────────────────────
  async getMyCourses(userId: string, opts: { take?: number; skip?: number; status?: string }) {
    const profile = await this.getTeacherProfile(userId);
    const { take = 20, skip = 0, status } = opts;

    const where: any = { teacherId: profile.id };
    if (status) where.course = { status };

    const instructorRows = await this.prisma.courseInstructor.findMany({
      where,
      skip,
      take,
      include: {
        course: {
          include: {
            subject: { select: { name: true } },
            _count: { select: { enrollments: true, sections: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.courseInstructor.count({ where });

    return {
      data: instructorRows.map((row) => ({
        id: row.course.id,
        title: row.course.title,
        slug: row.course.slug,
        thumbnailUrl: row.course.thumbnailUrl,
        price: row.course.price,
        status: row.course.status,
        visibility: row.course.visibility,
        grade: row.course.grades[0] || null,
        isOwner: row.isOwner,
        category: row.course.subject?.name,
        enrollmentCount: row.course._count.enrollments,
        sectionCount: row.course._count.sections,
        createdAt: row.course.createdAt,
        updatedAt: row.course.updatedAt,
      })),
      total,
    };
  }

  // ── Create Course ──────────────────────────────────────────────────────
  async createCourse(
    userId: string,
    dto: {
      title: string;
      description: string;
      grade?: string;
      grades?: string[];
      categoryId?: string;
      subjectId?: string;
      price?: number;
      originalPrice?: number;
      accessType?: CourseAccessType;
      type?: CourseType;
      difficulty?: Difficulty;
      thumbnailUrl?: string;
    },
  ) {
    const profile = await this.getTeacherProfile(userId);

    const slug = dto.title
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
      '-' + Date.now();

    // Link course to selected subject, or fallback to teacher's first subject.
    let assignedSubjectId = dto.subjectId || null;
    
    // Compatibility: if categoryId is sent, map it to subjectId if we can find a subject with that ID/slug/name
    if (!assignedSubjectId && dto.categoryId) {
      const subject = await this.prisma.subject.findFirst({
        where: {
          OR: [
            { id: dto.categoryId },
            { slug: dto.categoryId },
            { name: dto.categoryId },
          ]
        }
      });
      if (subject) {
        assignedSubjectId = subject.id;
      }
    }

    if (!assignedSubjectId && profile.subjects && profile.subjects.length > 0) {
      assignedSubjectId = profile.subjects[0].id;
    }

    // Combine grades array or fallback to grade string
    const courseGrades = dto.grades || (dto.grade ? [dto.grade] : []);

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug,
        grades: courseGrades,
        subjectId: assignedSubjectId,
        price: dto.price ?? 0,
        originalPrice: dto.originalPrice ?? null,
        accessType: dto.accessType ?? CourseAccessType.PAID,
        type: dto.type ?? CourseType.RECORDED,
        difficulty: dto.difficulty,
        thumbnailUrl: dto.thumbnailUrl,
        status: CourseStatus.PUBLISHED, // Auto publish for testing since no admin review loop
        isPublished: true, // Auto publish
        visibility: CourseVisibility.PUBLIC,
        instructors: {
          create: {
            teacherId: profile.id,
            isOwner: true,
          },
        },
      },
    });

    return course;
  }

  // ── Add Section ────────────────────────────────────────────────────────────
  async addSection(userId: string, courseId: string, title: string) {
    if (!title) throw new BadRequestException('Section title is required');

    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const lastSection = await this.prisma.courseSection.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });
    const order = lastSection ? lastSection.order + 1 : 0;

    return this.prisma.courseSection.create({
      data: {
        courseId,
        title,
        order,
      },
    });
  }

  // ── Delete Section ───────────────────────────────────────────────
  async deleteSection(userId: string, courseId: string, sectionId: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { lessons: { include: { attachments: true, videos: true } } }
    });

    if (!section) return;

    const urlsToDelete: (string | null)[] = [];
    for (const lesson of section.lessons) {
      for (const v of lesson.videos) urlsToDelete.push(v.videoUrl);
      for (const att of lesson.attachments) urlsToDelete.push(att.fileUrl);
    }

    const deleted = await this.prisma.courseSection.delete({
      where: { id: sectionId },
    });

    this.cleanupService.deleteFilesByUrls(urlsToDelete);
    return deleted;
  }

  // ── Rename Section ────────────────────────────────────────────────
  async renameSection(userId: string, courseId: string, sectionId: string, title: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    return this.prisma.courseSection.update({
      where: { id: sectionId },
      data: { title },
    });
  }

  // ── Delete Lesson ────────────────────────────────────────────────
  async deleteLesson(userId: string, courseId: string, lessonId: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { attachments: true, videos: true }
    });

    if (!lesson) return;

    const urlsToDelete: (string | null)[] = [];
    for (const v of lesson.videos) urlsToDelete.push(v.videoUrl);
    for (const att of lesson.attachments) urlsToDelete.push(att.fileUrl);

    const deleted = await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    this.cleanupService.deleteFilesByUrls(urlsToDelete);
    return deleted;
  }

  // ── Add Lesson ───────────────────────────────────────────────────────
  async addLesson(
    userId: string,
    courseId: string,
    dto: { 
      title: string; 
      description?: string; 
      videoUrl?: string; 
      sectionName?: string; 
      type?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      sizeBytes?: number;
    }
  ) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    // Find or create the default section
    let section = await this.prisma.courseSection.findFirst({
      where: { courseId, title: dto.sectionName || 'الدروس' },
    });
    if (!section) {
      section = await this.prisma.courseSection.create({
        data: {
          courseId,
          title: dto.sectionName || 'الدروس',
          order: 0,
        },
      });
    }

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { sectionId: section.id },
      orderBy: { order: 'desc' },
    });
    const order = lastLesson ? lastLesson.order + 1 : 0;

    const lessonType = (dto.type as ContentType) || ContentType.VIDEO;

    const lesson = await this.prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: dto.title,
        description: dto.description,
        type: lessonType,
        order,
      },
    });

    if (lessonType === ContentType.VIDEO && dto.videoUrl) {
      let videoDuration = 0;
      if (dto.videoUrl.includes('youtube.com') || dto.videoUrl.includes('youtu.be')) {
        try {
          const videoIdMatch = dto.videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
          if (videoIdMatch) {
            const res = await fetch(`https://www.youtube.com/watch?v=${videoIdMatch[1]}`);
            const text = await res.text();
            const match = text.match(/lengthSeconds.:.(\d+)./);
            if (match) videoDuration = parseInt(match[1], 10);
          }
        } catch (err) {
          // Fallback to 0 if parsing fails
        }
      }

      await this.prisma.lessonVideo.create({
        data: {
          lessonId: lesson.id,
          videoUrl: dto.videoUrl,
          duration: videoDuration,
          provider: 'YOUTUBE',
        },
      });
    } else if (lessonType === ContentType.PDF && dto.fileUrl && dto.fileName) {
      await this.prisma.lessonAttachment.create({
        data: {
          lessonId: lesson.id,
          fileName: dto.fileName,
          fileUrl: dto.fileUrl,
          fileType: dto.fileType || 'application/pdf',
          sizeBytes: dto.sizeBytes || 0,
        },
      });
    }

    return lesson;
  }

  // ── Add Lesson Attachment ─────────────────────────────────────────────
  async addLessonAttachment(userId: string, courseId: string, lessonId: string, dto: { fileName: string; fileUrl: string; fileType: string; sizeBytes: number }) {
    const profile = await this.getTeacherProfile(userId);
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, section: { courseId } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found in this course');

    return this.prisma.lessonAttachment.create({
      data: {
        lessonId: lesson.id,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        sizeBytes: dto.sizeBytes,
      },
    });
  }

  // ── Update Lesson ─────────────────────────────────────────────────────
  async updateLesson(
    userId: string,
    courseId: string,
    lessonId: string,
    dto: {
      title?: string;
      description?: string;
      videoUrl?: string;
      fileUrl?: string;
      fileName?: string;
    }
  ) {
    const profile = await this.getTeacherProfile(userId);
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, section: { courseId } },
      include: { videos: true, attachments: true }
    });
    if (!lesson) throw new NotFoundException('Lesson not found in this course');

    // Update basic info
    const updatedLesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title !== undefined ? dto.title : lesson.title,
        description: dto.description !== undefined ? dto.description : lesson.description,
      },
    });

    if (lesson.type === 'VIDEO') {
      if (dto.videoUrl !== undefined) {
        let videoDuration = 0;
        if (dto.videoUrl && (dto.videoUrl.includes('youtube.com') || dto.videoUrl.includes('youtu.be'))) {
          try {
            const videoIdMatch = dto.videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
            if (videoIdMatch) {
              const res = await fetch(`https://www.youtube.com/watch?v=${videoIdMatch[1]}`);
              const text = await res.text();
              const match = text.match(/lengthSeconds.:.(\d+)./);
              if (match) videoDuration = parseInt(match[1], 10);
            }
          } catch (err) {
            // keep 0
          }
        }

        const existingVideo = lesson.videos[0];
        if (existingVideo) {
          await this.prisma.lessonVideo.update({
            where: { id: existingVideo.id },
            data: {
              videoUrl: dto.videoUrl,
              duration: videoDuration,
            },
          });
        } else {
          await this.prisma.lessonVideo.create({
            data: {
              lessonId,
              videoUrl: dto.videoUrl,
              duration: videoDuration,
              provider: 'YOUTUBE',
            },
          });
        }
      }
    } else if (lesson.type === 'PDF') {
      if (dto.fileUrl !== undefined || dto.fileName !== undefined) {
        const existingAttachment = lesson.attachments[0];
        if (existingAttachment) {
          await this.prisma.lessonAttachment.update({
            where: { id: existingAttachment.id },
            data: {
              fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : existingAttachment.fileUrl,
              fileName: dto.fileName !== undefined ? dto.fileName : existingAttachment.fileName,
            },
          });
        } else {
          await this.prisma.lessonAttachment.create({
            data: {
              lessonId,
              fileUrl: dto.fileUrl || '',
              fileName: dto.fileName || 'document.pdf',
              fileType: 'application/pdf',
              sizeBytes: 0,
            },
          });
        }
      }
    }

    return updatedLesson;
  }

  // ── Update Course (with ownership check) ───────────────────────────────
  async updateCourse(userId: string, courseId: string, dto: any) {
    const profile = await this.getTeacherProfile(userId);

    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const updateData = { ...dto };
    if (updateData.grade) {
      updateData.grades = [updateData.grade];
      delete updateData.grade;
    }
    if (updateData.categoryId) {
      updateData.subjectId = updateData.categoryId;
      delete updateData.categoryId;
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });
  }

  // ── Submit Course for Review ───────────────────────────────────────────
  async submitForReview(userId: string, courseId: string) {
    const profile = await this.getTeacherProfile(userId);
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id, isOwner: true },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    // Prevent publishing an empty course
    const courseContent = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: { lessons: true },
        },
      },
    });

    if (!courseContent || courseContent.sections.length === 0) {
      throw new BadRequestException('Cannot publish a course without any sections.');
    }

    const hasLessons = courseContent.sections.some((s) => s.lessons.length > 0);
    if (!hasLessons) {
      throw new BadRequestException('Cannot publish a course without any lessons.');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED, isPublished: true },
    });
  }

  // ── My Students ────────────────────────────────────────────────────────
  async getStudentStatistics(userId: string, studentId: string) {
    const profile = await this.getTeacherProfile(userId);

    // Verify the student is enrolled in at least one of this teacher's courses
    const isEnrolled = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        status: 'ACTIVE',
        course: { instructors: { some: { teacherId: profile.id } } },
      },
    });

    if (!isEnrolled) {
      throw new ForbiddenException('يمكنك فقط عرض إحصائيات طلابك المشتركين في دوراتك.');
    }

    // Get statistics for the teacher's courses ONLY
    const progress = await this.prisma.videoProgress.findMany({
      where: {
        userId: studentId,
        video: { lesson: { section: { course: { instructors: { some: { teacherId: profile.id } } } } } }
      },
    });

    const lessonProgress = await this.prisma.lessonProgress.findMany({
      where: {
        userId: studentId,
        lesson: { section: { course: { instructors: { some: { teacherId: profile.id } } } } }
      }
    });

    const totalSecondsWatched = progress.reduce((acc, p) => acc + p.watchedSeconds, 0);
    const completedLessons = lessonProgress.filter(lp => lp.isCompleted).length;

    const lastLogin = await this.prisma.activityLog.findFirst({
      where: { userId: studentId, action: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      totalSecondsWatched,
      completedLessons,
      lastLoginAt: lastLogin?.createdAt || null,
    };
  }

  async getMyStudents(userId: string, opts: { take?: number; skip?: number }) {
    const profile = await this.getTeacherProfile(userId);
    const { take = 20, skip = 0 } = opts;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        course: {
          instructors: { some: { teacherId: profile.id } },
        },
        status: 'ACTIVE',
      },
      take,
      skip,
      include: {
        user: {
          select: {
            id: true, name: true, phone: true, avatar: true,
            studentProfile: { select: { grade: true, track: true } },
          },
        },
        course: { select: { id: true, title: true, accessType: true, price: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const total = await this.prisma.enrollment.count({
      where: {
        course: {
          instructors: { some: { teacherId: profile.id } },
        },
        status: 'ACTIVE',
      },
    });

    return {
      data: enrollments.map((e) => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolledAt,
        student: {
          id: e.user.id,
          name: e.user.name,
          phone: e.user.phone,
          avatar: e.user.avatar,
          grade: e.user.studentProfile?.grade,
          track: e.user.studentProfile?.track,
        },
        course: { 
          id: e.course.id, 
          title: e.course.title, 
          accessType: e.course.accessType, 
          price: e.course.price 
        },
      })),
      total,
    };
  }

  // ── Course Detail for editing ──────────────────────────────────────────
  async cancelStudentSubscription(userId: string, enrollmentId: string) {
    const profile = await this.getTeacherProfile(userId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { include: { instructors: true } } }
    });
    
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    
    const isOwner = enrollment.course.instructors.some(i => i.teacherId === profile.id);
    if (!isOwner) throw new ForbiddenException('You do not own this course');

    if (enrollment.course.accessType !== 'PAID') {
      throw new BadRequestException('Can only cancel subscriptions for paid courses');
    }

    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { success: true };
  }

  // ── Course Detail for editing ──────────────────────────────────────────
  async getCourseDetail(userId: string, courseId: string) {
    const profile = await this.getTeacherProfile(userId);
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: { 
            lessons: { 
              orderBy: { order: 'asc' },
              include: { videos: true, attachments: true }
            } 
          },
          orderBy: { order: 'asc' },
        },
        subject: true,
        objectives: true,
        requirements: true,
        faqs: true,
      },
    });

    if (!course) return null;
    const { subject, ...rest } = course as any;
    return {
      ...rest,
      subject,
      category: subject,
      grade: course.grades?.[0] || null,
    };
  }



  // ── Send Notifications to Students ──────────────────────────────────────
  async sendNotificationToStudents(userId: string, dto: { title: string; message: string }) {
    const profile = await this.getTeacherProfile(userId);
    
    // Find all distinct students enrolled in this teacher's courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        course: {
          instructors: { some: { teacherId: profile.id } },
        },
        status: 'ACTIVE',
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const studentIds = enrollments.map((e) => e.userId);

    if (studentIds.length > 0) {
      // 1. Save to DB for in-app notification list
      await this.prisma.notification.createMany({
        data: studentIds.map((id) => ({
          userId: id,
          title: dto.title,
          message: dto.message,
          type: 'SYSTEM',
        })),
      });

      // 2. Fetch FCM tokens from active sessions for each student
      const sessions = await this.prisma.session.findMany({
        where: {
          userId: { in: studentIds },
          fcmToken: { not: null },
          expiresAt: { gt: new Date() },
        },
        select: { userId: true, fcmToken: true },
      });

      const pushResults = await Promise.allSettled(
        sessions
          .filter((s) => s.fcmToken)
          .map((s) =>
            this.notificationService.sendPushNotification({
              userId: s.fcmToken!,
              title: dto.title,
              body: dto.message,
            }),
          ),
      );
      return { success: true, count: studentIds.length, pushResults };
    }

    return { success: true, count: 0, pushResults: [] };
  }

  // ── Exam Results ─────────────────────────────────────────────────────────
  async getLessonExamResults(userId: string, courseId: string, lessonId: string) {
    const profile = await this.getTeacherProfile(userId);
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacherId: profile.id },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const exam = await this.prisma.examTemplate.findUnique({
      where: { lessonId },
      include: {
        sessions: {
          include: {
            student: {
              select: { id: true, name: true, phone: true, avatar: true },
            },
          },
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!exam) return [];

    return exam.sessions;
  }

  async updateLessonDuration(userId: string, courseId: string, lessonId: string, duration: number) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('Course not found or access denied');

    const video = await this.prisma.lessonVideo.findFirst({
      where: { lessonId },
    });

    if (!video) throw new NotFoundException('Video lesson not found');

    if (duration > 0) {
      await this.prisma.lessonVideo.update({
        where: { id: video.id },
        data: { duration: Math.floor(duration) },
      });
    }

    return { success: true };
  }

  // ── Grant Exam Retake ─────────────────────────────────────────────────
  async grantExamRetake(userId: string, courseId: string, lessonId: string, studentId: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const exam = await this.prisma.examTemplate.findUnique({ where: { lessonId } });
    if (!exam) throw new NotFoundException('Exam not found for this lesson');

    // Remove any unused existing permission to avoid duplicates
    await this.prisma.examRetakePermission.deleteMany({
      where: { examId: exam.id, studentId, isUsed: false },
    });

    await this.prisma.examRetakePermission.create({
      data: {
        examId: exam.id,
        studentId,
        grantedBy: userId,
      },
    });

    return { success: true };
  }
}
// trigger restart
