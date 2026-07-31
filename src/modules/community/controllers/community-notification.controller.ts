import { Controller, Get, Put, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityNotificationService } from '../services';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Community Notifications')
@Controller('community/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityNotificationController {
  constructor(
    private readonly notificationService: CommunityNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get community notifications' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getUserNotifications(
      user.id as string,
      cursor,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread community notifications count' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.id as string);
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.id as string);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
}
