import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { PlatformBrandingService } from '../services/platform-branding.service';

@ApiTags('Public')
@Public()
@SkipThrottle()
@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformBrandingService: PlatformBrandingService,
  ) {}

  @Get('get-sections')
  async getSections() {
    return this.prisma.courseSection.findMany({ take: 5 });
  }

  @Get('test-delete-section/:id')
  async testDeleteSection(@Param('id') id: string) {
    try {
      const section = await this.prisma.courseSection.delete({
        where: { id }
      });
      return { success: true, section };
    } catch (e: any) {
      return { success: false, error: e.message, code: e.code };
    }
  }

  @Get('fix-db')
  async fixDb() {
    const users = await this.prisma.user.findMany();
    for (const user of users) {
      const fullName = [user.firstName, user.middleName, user.lastName, user.familyName].filter(Boolean).join(' ');
      if (user.name !== fullName) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { name: fullName }
        });
      }
    }

    const sessions = await this.prisma.examSession.findMany({
      where: { status: 'COMPLETED' },
    });

    for (const session of sessions) {
      if (session.score !== null && session.score <= 10) { 
        let percentage = session.score === 2 ? 100 : session.score === 1 ? 50 : 0;
        await this.prisma.examSession.update({
          where: { id: session.id },
          data: { score: percentage }
        });
      }
    }

    return { success: true, message: 'DB updated' };
  }


  // ── Published Courses ───────────────────────────────────────────────
  @Get('courses')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List published courses for public browsing' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category', required: false, description: 'Category (compatibility: mapped to subject) slug' })
  @ApiQuery({ name: 'subject', required: false, description: 'Subject slug' })
  @ApiQuery({ name: 'grade', required: false, description: 'Grade/level slug' })
  @ApiQuery({ name: 'sort', required: false, description: 'newest | rating | popular' })
  async getCourses(
    @CurrentUser() user: any,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('sort') sort?: string,
  ) {
    const where: any = { status: CourseStatus.PUBLISHED, isPublished: true };

    // Track whether student grade filter is applied (prevents ?grade= param bypass)
    let studentGradeApplied = false;

    if (user?.role === 'TEACHER') {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile) {
        where.instructors = { some: { teacherId: profile.id } };
      }
    } else if (user?.role === 'STUDENT') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile && profile.grade) {
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
        studentGradeApplied = true;
      }
    }

    if (q) {
      // Merge OR search with existing OR (student grade) or create fresh OR
      const searchOr = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
      if (where.OR) {
        // Wrap: (grade filter) AND (search match)
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }
    const selectedSubject = subject || category;
    if (selectedSubject) {
      where.subject = {
        OR: [
          { slug: selectedSubject },
          { id: selectedSubject }
        ]
      };
    }
    // Only apply ?grade= param for non-students or unauthenticated requests.
    // Authenticated students MUST be scoped to their registered grade only.
    if (grade && !studentGradeApplied) {
      const gradesToMatch = [grade];
      if (grade.endsWith('ي')) gradesToMatch.push(grade.replace(/ي$/, 'ى'));
      else if (grade.endsWith('ى')) gradesToMatch.push(grade.replace(/ى$/, 'ي'));
      where.grades = { hasSome: gradesToMatch };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'rating') orderBy = { averageRating: 'desc' };
    if (sort === 'popular') orderBy = { enrollments: { _count: 'desc' } };

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          instructors: {
            where: { isOwner: true },
            include: {
              teacher: {
                include: {
                  user: { select: { id: true, name: true, avatar: true } },
                },
              },
            },
          },
          _count: { select: { enrollments: true, sections: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: data.map((c: any) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price,
        originalPrice: c.originalPrice,
        accessType: c.accessType,
        grade: c.grades[0] || null,
        averageRating: c.averageRating,
        reviewCount: c.reviewCount,
        enrollmentCount: c._count.enrollments,
        lessonsCount: c._count.sections,
        category: c.subject ? { id: c.subject.id, name: c.subject.name, slug: c.subject.slug, icon: '📚' } : null,
        subject: c.subject,
        teacher: c.instructors[0]
          ? {
              id: c.instructors[0].teacher.user.id,
              name: c.instructors[0].teacher.user.name,
              avatar: c.instructors[0].teacher.user.avatar,
            }
          : null,
        createdAt: c.createdAt,
      })),
      total,
      take,
      skip,
    };
  }

  // ── Single Course ───────────────────────────────────────────────────
  @Get('courses/:slug')
  @ApiOperation({ summary: 'Get a single published course by slug' })
  async getCourse(@Param('slug') rawSlug: string) {
    const slug = decodeURIComponent(rawSlug);
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
          ...(slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? [{ id: slug }] : [])
        ],
        status: CourseStatus.PUBLISHED 
      },
      include: {
        subject: true,
        instructors: {
          include: {
            teacher: {
              include: {
                user: { select: { id: true, name: true, avatar: true, bio: true } },
                subjects: true,
              },
            },
          },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                isFreePreview: true,
                type: true,
                examTemplate: {
                  select: { status: true }
                }
              },
            },
          },
        },
        objectives: true,
        requirements: true,
        faqs: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    const { subject, sections, ...rest } = course as any;
    
    const filteredSections = sections.map((section: any) => ({
      ...section,
      lessons: section.lessons.filter((lesson: any) => {
        if (lesson.type === 'EXAM' && lesson.examTemplate?.status === 'DRAFT') {
          return false;
        }
        return true;
      }).map(({ examTemplate, ...lessonRest }: any) => lessonRest),
    }));

    return {
      ...rest,
      sections: filteredSections,
      subject,
      category: subject ? { id: subject.id, name: subject.name, slug: subject.slug, icon: '📚' } : null,
      grade: course.grades?.[0] || null,
    };
  }

  // ── Approved Teachers ───────────────────────────────────────────────
  @Get('teachers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List approved teachers for public browsing' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  async getTeachers(
    @CurrentUser() reqUser: any,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('q') q?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    let courseGradeFilter: any = null;
    if (reqUser?.role === 'STUDENT') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: reqUser.id }
      });
      if (profile && profile.grade) {
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
        courseGradeFilter = [
          { grades: { isEmpty: true } },
          { grades: { hasSome: matchingGrades } },
        ];
      }
    }

    const courseWhereClause: any = { status: CourseStatus.PUBLISHED, isPublished: true };
    if (courseGradeFilter) {
      courseWhereClause.OR = courseGradeFilter;
    }

    const where: any = {
      role: 'TEACHER',
      isActive: true,
      teacherProfile: { verificationStatus: 'APPROVED' },
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ];
    }
    
    // Filter by Subject ID using relations
    if (subjectId) {
      where.teacherProfile = {
        ...where.teacherProfile,
        OR: [
          // Teacher has directly assigned subject
          { subjects: { some: { id: subjectId } } },
          // OR Teacher has a published course in this subject
          {
            courseInstructors: {
              some: {
                course: {
                  subjectId: subjectId,
                  status: 'PUBLISHED'
                }
              }
            }
          }
        ]
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          teacherProfile: {
            include: {
              subjects: true,
              _count: { select: { courseInstructors: true } },
            },
          },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const dataWithStudentsCount = await Promise.all(
      data.map(async (u: any) => {
        const [studentsCount, coursesCount] = u.teacherProfile
          ? await Promise.all([
              this.prisma.enrollment.count({
                where: {
                  course: {
                    status: CourseStatus.PUBLISHED,
                    isPublished: true,
                    instructors: { some: { teacherId: u.teacherProfile.id } },
                  },
                },
              }),
              this.prisma.courseInstructor.count({
                where: {
                  teacherId: u.teacherProfile.id,
                  isOwner: true,
                  course: courseWhereClause,
                },
              }),
            ])
          : [0, 0];

        return {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          bio: u.bio,
          specializations: u.teacherProfile?.subjects?.map((s: any) => s.name) ?? [],
          coursesCount,
          studentsCount,
          createdAt: u.createdAt,
        };
      })
    );

    return {
      data: dataWithStudentsCount,
      total,
      take,
      skip,
    };
  }

  // ── Single Teacher ──────────────────────────────────────────────────
  @Get('teachers/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get teacher public profile with their courses' })
  async getTeacher(@CurrentUser() reqUser: any, @Param('id') id: string) {
    if (reqUser?.role === 'TEACHER') {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: reqUser.id }
      });
      if (reqUser.id !== id && teacherProfile?.id !== id) {
        throw new ForbiddenException('غير مسموح للمعلمين باستعراض حسابات أو كورسات المعلمين الآخرين');
      }
    }
    let courseGradeFilter: any = null;
    if (reqUser?.role === 'STUDENT') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: reqUser.id }
      });
      if (profile && profile.grade) {
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
        courseGradeFilter = [
          { grades: { isEmpty: true } },
          { grades: { hasSome: matchingGrades } },
        ];
      }
    }

    const courseWhereClause: any = { status: CourseStatus.PUBLISHED, isPublished: true };
    if (courseGradeFilter) {
      courseWhereClause.OR = courseGradeFilter;
    }

    const user = await this.prisma.user.findFirst({
      where: { id, role: 'TEACHER', isActive: true, teacherProfile: { verificationStatus: 'APPROVED' } },
      include: {
        teacherProfile: { 
          include: { 
            subjects: true,
            courseInstructors: {
              where: { isOwner: true, course: courseWhereClause },
              include: {
                course: {
                  include: {
                    subject: { select: { name: true } },
                    _count: { select: { enrollments: true } },
                  },
                },
              },
            },
          }
        },
      },
    });

    if (!user) throw new NotFoundException('Teacher not found');

    const allInstructors = (user as any).teacherProfile?.courseInstructors || [];
    const coursesCount = allInstructors.length;
    const studentsCount = allInstructors.reduce(
      (sum: number, ci: any) => sum + (ci.course?._count?.enrollments ?? 0),
      0
    );

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      specializations: (user as any).teacherProfile?.subjects?.map((s: any) => s.name) ?? [],
      coursesCount,
      studentsCount,
      courses: ((user as any).teacherProfile?.courseInstructors || [])
        .filter((i: any) => i.course)
        .map((i: any) => ({
          id: i.course!.id,
          title: i.course!.title,
          slug: i.course!.slug,
          thumbnailUrl: i.course!.thumbnailUrl,
          price: i.course!.price,
          originalPrice: i.course!.originalPrice,
          accessType: i.course!.accessType,
          category: i.course!.subject?.name,
          enrollmentCount: i.course!._count.enrollments,
          averageRating: i.course!.averageRating,
        })),
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all categories with published course counts (compatibility layer for subjects)' })
  async getCategories() {
    const subjects = await this.prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            courses: { where: { status: CourseStatus.PUBLISHED } },
          },
        },
      },
    });

    return subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      iconEmoji: '📚',
      color: '#4F46E5',
      coursesCount: s._count.courses,
    }));
  }

  // ── Subjects ────────────────────────────────────────────────────────
  @Get('subjects')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List all subjects' })
  async getSubjects(@CurrentUser() user?: any) {
    let courseFilter: any = { status: CourseStatus.PUBLISHED, isPublished: true };

    if (user?.role === 'TEACHER') {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile) {
        courseFilter.instructors = { some: { teacherId: profile.id } };
      }
    } else if (user?.role === 'STUDENT') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile && profile.grade) {
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
        courseFilter.OR = [
          { grades: { isEmpty: true } },
          { grades: { hasSome: matchingGrades } },
        ];
      }
    }

    const subjects = await this.prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            courses: { where: courseFilter },
          },
        },
      },
    });
    return subjects.map((s: any) => ({
      ...s,
      coursesCount: s._count.courses,
      courseCount: s._count.courses,
    }));
  }

  // ── Platform Stats ──────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get public platform statistics' })
  async getStats() {
    const [totalStudents, totalTeachers, totalCourses, totalCategories] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({
        where: { role: 'TEACHER', isActive: true, teacherProfile: { verificationStatus: 'APPROVED' } },
      }),
      this.prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.prisma.subject.count({ where: { deletedAt: null } }),
    ]);

    return { totalStudents, totalTeachers, totalCourses, totalCategories };
  }

  // ── Platform Branding ──────────────────────────────────────────────────────────
  @Get('platform-branding')
  @ApiOperation({ summary: 'Get enabled platform branding configurations' })
  async getPlatformBranding() {
    return this.platformBrandingService.getPublicConfig();
  }
}

