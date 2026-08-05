import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { TeacherAnalyticsService } from '../services/teacher-analytics.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Teacher Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('teacher/analytics')
export class TeacherAnalyticsController {
  constructor(private readonly analyticsService: TeacherAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get teacher overview metrics' })
  getOverview(@CurrentUser('id') userId: string) {
    return this.analyticsService.getOverview(userId);
  }

  @Get('learning')
  @ApiOperation({ summary: 'Get student learning metrics for teacher courses' })
  getLearning(@CurrentUser('id') userId: string) {
    return this.analyticsService.getLearning(userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get teacher conversations metrics' })
  getConversations(@CurrentUser('id') userId: string) {
    return this.analyticsService.getConversations(userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get analytics per course' })
  getCourseAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getCourseAnalytics(userId);
  }
}
