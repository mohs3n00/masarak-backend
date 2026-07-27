import {
  Controller, Get, Post, Patch, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
  ForbiddenException, NotFoundException, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { StudentDashboardService } from '../services/student-dashboard.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LearningEngineService } from '../../course/services/learning-engine.service';
import { EnrollmentStatus } from '@prisma/client';
import { SyncProgressBatchDto } from '../dto/sync-progress.dto';

@ApiTags('Student')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentDashboardService,
    private readonly prisma: PrismaService,
    private readonly learningEngineService: LearningEngineService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard data' })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.studentService.getDashboard(userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get my enrolled courses' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  getMyCourses(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.studentService.getMyCourses(userId, { take, skip });
  }

  @Get('courses/:courseId/check-enrollment')
  @ApiOperation({ summary: 'Check if student is enrolled in a course' })
  checkEnrollment(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.studentService.checkEnrollment(userId, courseId);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Get available (grade-filtered) courses' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  getAvailableCourses(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.studentService.getAvailableCourses(userId, { take, skip });
  }

  @Get('courses/:slug/workspace')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get course learning workspace content' })
  getCourseWorkspace(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.studentService.getCourseWorkspace(userId, slug);
  }

  @Get('lessons/:lessonId/note')
  @ApiOperation({ summary: 'Get student note for a lesson' })
  getLessonNote(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.studentService.getLessonNote(userId, lessonId);
  }

  @Post('lessons/:lessonId/note')
  @ApiOperation({ summary: 'Save student note for a lesson' })
  saveLessonNote(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
    @Body('content') content: string,
  ) {
    return this.studentService.saveLessonNote(userId, lessonId, content);
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  async markLessonCompleted(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.learningEngineService.completeLesson(userId, lessonId, lesson.section.courseId);
    return { success: true, message: 'Lesson marked as completed' };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.studentService.getNotifications(userId, { take, skip });
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.studentService.markNotificationRead(userId, notificationId);
  }

  /**
   * سيكيوريتي: إرجاع video URL فقط للمشترك المفعّل - لا يظهر في الـ workspace response
   */
  @Get('video/:videoId/stream')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get video stream URL (requires enrollment)' })
  async getVideoStream(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('videoId') videoId: string,
  ) {
    // جلب بيانات الفيديو مع بيانات الدرس والكورس
    const video = await this.prisma.lessonVideo.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: {
            section: {
              include: { course: true }
            }
          }
        }
      }
    });

    if (!video) throw new NotFoundException('Video not found');

    const courseId = video.lesson.section.courseId;
    const course = video.lesson.section.course;

    // تحقق من اشتراك أو ملكية الكورس أو إذا كان الدرس مجاني (Free Preview)
    const isFreePreview = video.lesson.isFreePreview;

    const isOwner = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId }, isOwner: true }
    });

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isAdmin && !isOwner && !isFreePreview) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId, status: EnrollmentStatus.ACTIVE }
      });

      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled to access this video');
      }

      // تحقق من انتهاء الاشتراك
      if (enrollment.validUntil && new Date() > enrollment.validUntil) {
        throw new ForbiddenException('Your subscription has expired');
      }
    }

    // إرجاع الرابط فقط للطالب المشترك
    return {
      videoUrl: video.videoUrl,
      duration: video.duration,
      provider: video.provider,
      thumbnailUrl: video.thumbnailUrl,
    };
  }

  @Patch('video/:videoId/duration')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Silently update video duration if it is currently 0' })
  async updateVideoDuration(
    @Param('videoId') videoId: string,
    @Body('duration') duration: number,
  ) {
    if (!duration || duration <= 0) return { success: false };
    
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video || video.duration > 0) return { success: false }; // Only update if currently 0
    
    await this.prisma.lessonVideo.update({
      where: { id: videoId },
      data: { duration: Math.floor(duration) }
    });
    return { success: true };
  }

  @Post('courses/:courseId/rate')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Rate an enrolled course' })
  async rateCourse(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    return this.studentService.rateCourse(userId, courseId, rating, comment);
  }

  @Post('progress/sync')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sync batched video progress (client-side aggregation)' })
  async syncProgressBatch(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncProgressBatchDto,
  ) {
    // Process each progress update
    for (const update of dto.progress) {
      if (update.deltaSeconds > 0 || update.isCompleted !== undefined) {
        // We call the existing learning engine service to handle database logic
        await this.learningEngineService.syncVideoProgress(userId, update.videoId, update.deltaSeconds, update.currentPosition || 0, update.isCompleted || false);
      }
    }
    return { success: true, syncedCount: dto.progress.length };
  }
}

