import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TeacherExamService } from '../services/teacher-exam.service';

import { CreateOrUpdateExamDto } from '../dto/teacher-exam.dto';

@ApiTags('Teacher Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('teacher/courses/:courseId/lessons/:lessonId/exam')
export class TeacherExamController {
  constructor(private readonly teacherExamService: TeacherExamService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update exam for a lesson' })
  async createOrUpdateExam(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateOrUpdateExamDto,
  ) {
    return this.teacherExamService.createOrUpdateExam(userId, courseId, lessonId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get exam for a lesson' })
  async getExam(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    const exam = await this.teacherExamService.getExamForLesson(userId, courseId, lessonId);
    return exam || { notFound: true };
  }

  @Post('retake')
  @ApiOperation({ summary: 'Grant exam retake permission to a student' })
  async grantRetake(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body('studentId') studentId: string,
  ) {
    return this.teacherExamService.grantRetakePermission(userId, courseId, lessonId, studentId);
  }
}
