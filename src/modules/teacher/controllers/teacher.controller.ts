import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TeacherApprovedGuard } from '../../../common/guards/teacher-approved.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { TeacherDashboardService } from '../services/teacher-dashboard.service';
import { CreateCourseDto, AddLessonDto, UpdateLessonDto, AddAttachmentDto, NotificationDto } from '../dto/course.dto';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherDashboardService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get teacher dashboard statistics' })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.teacherService.getDashboardStats(userId);
  }

  // ── Courses ─────────────────────────────────────────────────────────────
  @Get('courses')
  @ApiOperation({ summary: 'Get my courses' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getMyCourses(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('status') status?: string,
  ) {
    return this.teacherService.getMyCourses(userId, { take, skip, status });
  }

  @Post('courses')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course' })
  createCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.teacherService.createCourse(userId, dto);
  }


  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course detail for editing' })
  getCourseDetail(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
  ) {
    return this.teacherService.getCourseDetail(userId, courseId);
  }

  @Post('courses/:id/sections')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new section to a course' })
  addSection(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Body('title') title: string,
  ) {
    return this.teacherService.addSection(userId, courseId, title);
  }

  @Delete('courses/:id/sections/:sectionId')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a section from a course' })
  deleteSection(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.teacherService.deleteSection(userId, courseId, sectionId);
  }

  @Patch('courses/:id/sections/:sectionId')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a section' })
  renameSection(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body('title') title: string,
  ) {
    return this.teacherService.renameSection(userId, courseId, sectionId, title);
  }

  @Post('courses/:id/lessons')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a video lesson to a course' })
  addLesson(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Body() dto: AddLessonDto,
  ) {
    return this.teacherService.addLesson(userId, courseId, dto);
  }

  @Patch('courses/:id/lessons/:lessonId/duration')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update video duration if missing' })
  updateLessonDuration(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body('duration') duration: number,
  ) {
    return this.teacherService.updateLessonDuration(userId, courseId, lessonId, duration);
  }

  @Patch('courses/:id/lessons/:lessonId')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a lesson in a course' })
  updateLesson(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.teacherService.updateLesson(userId, courseId, lessonId, dto);
  }

  @Delete('courses/:id/lessons/:lessonId')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lesson from a course' })
  deleteLesson(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.teacherService.deleteLesson(userId, courseId, lessonId);
  }

  @Post('courses/:id/lessons/:lessonId/attachments')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an attachment to a lesson' })
  addLessonAttachment(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: AddAttachmentDto,
  ) {
    return this.teacherService.addLessonAttachment(userId, courseId, lessonId, dto);
  }

  @Patch('courses/:id')
  @UseGuards(TeacherApprovedGuard)
  @ApiOperation({ summary: 'Update a course (owner only)' })
  updateCourse(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Body() dto: Partial<CreateCourseDto>,
  ) {
    return this.teacherService.updateCourse(userId, courseId, dto);
  }

  @Post('courses/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit course for admin review' })
  submitForReview(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
  ) {
    return this.teacherService.submitForReview(userId, courseId);
  }

  // ── Students ─────────────────────────────────────────────────────────────
  @Get('students')
  @ApiOperation({ summary: 'Get students enrolled in my courses' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  getMyStudents(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.teacherService.getMyStudents(userId, { take, skip });
  }

  @Get('students/:studentId/statistics')
  @ApiOperation({ summary: 'Get statistics for a specific student (limited to teacher courses)' })
  getStudentStatistics(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.teacherService.getStudentStatistics(userId, studentId);
  }

  @Delete('enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Cancel a student subscription from a paid course' })
  cancelStudentSubscription(
    @CurrentUser('id') userId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.teacherService.cancelStudentSubscription(userId, enrollmentId);
  }
  @Get('courses/:id/lessons/:lessonId/results')
  @ApiOperation({ summary: 'Get exam results for a lesson' })
  getLessonExamResults(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.teacherService.getLessonExamResults(userId, courseId, lessonId);
  }

  @Post('courses/:id/lessons/:lessonId/exam/retake')
  @UseGuards(TeacherApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant a student permission to retake an exam' })
  grantExamRetake(
    @CurrentUser('id') userId: string,
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body('studentId') studentId: string,
  ) {
    return this.teacherService.grantExamRetake(userId, courseId, lessonId, studentId);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification to all my students' })
  sendNotification(
    @CurrentUser('id') userId: string,
    @Body() dto: NotificationDto
  ) {
    return this.teacherService.sendNotificationToStudents(userId, dto);
  }
}
