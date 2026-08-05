import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminAnalyticsService } from '../services/admin-analytics.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform overview metrics' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get platform activity metrics' })
  getActivity() {
    return this.analyticsService.getActivity();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get academic conversations metrics' })
  getConversations() {
    return this.analyticsService.getConversations();
  }

  @Get('community')
  @ApiOperation({ summary: 'Get community spaces metrics' })
  getCommunity() {
    return this.analyticsService.getCommunity();
  }

  @Get('learning')
  @ApiOperation({ summary: 'Get student learning metrics' })
  getLearning() {
    return this.analyticsService.getLearning();
  }
}
