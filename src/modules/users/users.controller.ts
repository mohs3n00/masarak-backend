import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UpdateUserDto,
  UpdateStudentProfileDto,
  UpdateTeacherProfileDto,
  UpdateSettingsDto,
  UpdateNotificationSettingsDto,
  UpdatePrivacySettingsDto,
  UpdatePreferencesDto,
} from './dto/update-user.dto';

@ApiTags('Users & Identity')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user data with all relations' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update basic user info (name, bio)' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own account' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  @Post('me/fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  async updateFcmToken(
    @CurrentUser('id') userId: string,
    @CurrentUser('sessionId') sessionId: string,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.usersService.updateFcmToken(userId, sessionId, fcmToken);
  }

  @Patch('profile/student')
  @ApiOperation({ summary: 'Update student profile details' })
  async updateStudentProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.usersService.updateStudentProfile(userId, dto);
  }

  @Patch('profile/teacher')
  @ApiOperation({ summary: 'Update teacher profile details' })
  async updateTeacherProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTeacherProfileDto,
  ) {
    return this.usersService.updateTeacherProfile(userId, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings (alias for GET /me)' })
  async getSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId); // the getMe fetches settings too
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update generic user settings' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, dto);
  }

  @Patch('settings/notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotifications(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(userId, dto);
  }

  @Patch('settings/privacy')
  @ApiOperation({ summary: 'Update privacy settings' })
  async updatePrivacy(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePrivacySettingsDto,
  ) {
    return this.usersService.updatePrivacySettings(userId, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update timezone, language, theme' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, dto);
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload new avatar' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Delete current avatar' })
  async deleteAvatar(@CurrentUser('id') userId: string) {
    return this.usersService.removeAvatar(userId);
  }

  @Get('devices')
  @ApiOperation({ summary: 'List all active devices' })
  async getDevices(@CurrentUser('id') userId: string) {
    return this.usersService.getDevices(userId);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Remove a specific device' })
  async removeDevice(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.usersService.removeDevice(userId, deviceId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get user activity log' })
  async getActivity(
    @CurrentUser('id') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.usersService.getActivity(
      userId,
      take ? parseInt(take, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.usersService.getNotifications(
      userId,
      take ? parseInt(take, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@CurrentUser('id') userId: string) {
    return this.usersService.markAllNotificationsRead(userId);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markNotificationRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.usersService.markNotificationRead(userId, notificationId);
  }
}
