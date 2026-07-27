import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageService } from '../../shared/storage/storage.service';
import { ActivityAction } from '@prisma/client';
import {
  ProfileUpdatedEvent,
  SettingsChangedEvent,
  AvatarUpdatedEvent,
  AccountDeletedEvent,
} from './events/user-events';
import {
  UpdateUserDto,
  UpdateStudentProfileDto,
  UpdateTeacherProfileDto,
  UpdateSettingsDto,
  UpdateNotificationSettingsDto,
  UpdatePrivacySettingsDto,
  UpdatePreferencesDto,
} from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {}

  async getMe(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const updated = await this.repository.updateMe(userId, dto);
    this.eventEmitter.emit(
      'user.profile.updated',
      new ProfileUpdatedEvent(userId, dto),
    );
    await this.repository.logActivity(
      userId,
      ActivityAction.PROFILE_UPDATE,
      undefined,
      undefined,
      JSON.stringify(dto),
    );
    return updated;
  }

  async updateFcmToken(userId: string, sessionId: string, fcmToken: string) {
    return this.repository.updateSessionFcmToken(sessionId, fcmToken);
  }

  async updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
    const user = await this.repository.findById(userId);
    if (user?.studentProfile?.grade) {
      delete (dto as any).grade;
    }
    const updated = await this.repository.updateStudentProfile(userId, dto);
    this.eventEmitter.emit(
      'user.profile.updated',
      new ProfileUpdatedEvent(userId, dto),
    );
    await this.repository.logActivity(
      userId,
      ActivityAction.PROFILE_UPDATE,
      undefined,
      undefined,
      'Student Profile Updated',
    );
    return updated;
  }

  async updateTeacherProfile(userId: string, dto: UpdateTeacherProfileDto) {
    const { subjectIds, levelIds, ...rest } = dto;
    const updateData: any = { ...rest };
    if (subjectIds) {
      updateData.subjects = {
        set: subjectIds.map((id: string) => ({ id })),
      };
    }
    if (levelIds) {
      updateData.levels = {
        set: levelIds.map((id: string) => ({ id })),
      };
    }

    const updated = await this.repository.updateTeacherProfile(
      userId,
      updateData,
    );
    this.eventEmitter.emit(
      'user.profile.updated',
      new ProfileUpdatedEvent(userId, dto),
    );
    await this.repository.logActivity(
      userId,
      ActivityAction.PROFILE_UPDATE,
      undefined,
      undefined,
      'Teacher Profile Updated',
    );
    return updated;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const updated = await this.repository.updateSettings(userId, dto);
    this.eventEmitter.emit(
      'user.settings.changed',
      new SettingsChangedEvent(userId, 'GeneralSettings'),
    );
    return updated;
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const updated = await this.repository.updateNotifications(userId, dto);
    this.eventEmitter.emit(
      'user.settings.changed',
      new SettingsChangedEvent(userId, 'NotificationSettings'),
    );
    return updated;
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacySettingsDto) {
    const updated = await this.repository.updatePrivacy(userId, dto);
    this.eventEmitter.emit(
      'user.settings.changed',
      new SettingsChangedEvent(userId, 'PrivacySettings'),
    );
    return updated;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const updated = await this.repository.updatePreferences(userId, dto);
    this.eventEmitter.emit(
      'user.settings.changed',
      new SettingsChangedEvent(userId, 'Preferences'),
    );
    return updated;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const result = await this.storageService.uploadFile(file, {
      folder: 'avatars',
      publicId: userId,
    });

    await this.repository.addProfileImage(userId, result.url, result.key);
    await this.repository.updateMe(userId, { avatar: result.url });

    this.eventEmitter.emit(
      'user.avatar.updated',
      new AvatarUpdatedEvent(userId, result.url),
    );
    await this.repository.logActivity(userId, ActivityAction.AVATAR_UPDATE);

    return { avatar: result.url };
  }

  async removeAvatar(userId: string) {
    const removed = await this.repository.removeProfileImage(userId);
    if (removed && removed.publicId) {
      await this.storageService.deleteFile(removed.publicId);
    }
    await this.repository.updateMe(userId, { avatar: null });
    await this.repository.logActivity(
      userId,
      ActivityAction.AVATAR_UPDATE,
      undefined,
      undefined,
      'Avatar removed',
    );
    return { message: 'Avatar removed' };
  }

  async getDevices(userId: string) {
    return this.repository.getDevices(userId);
  }

  async removeDevice(userId: string, deviceId: string) {
    await this.repository.removeDevice(userId, deviceId);
    await this.repository.logActivity(
      userId,
      ActivityAction.DEVICE_CHANGE,
      undefined,
      undefined,
      `Device ${deviceId} removed`,
    );
    return { message: 'Device removed' };
  }

  async getActivity(userId: string, take?: number, skip?: number) {
    return this.repository.getActivity(userId, take, skip);
  }

  async searchUsers(query: string, skip?: number, take?: number) {
    return this.repository.searchUsers(query, skip, take);
  }

  async deleteAccount(userId: string) {
    await this.repository.deleteAccount(userId);
    this.eventEmitter.emit(
      'user.account.deleted',
      new AccountDeletedEvent(userId),
    );
    // Also delete avatar if any
    try {
      await this.storageService.deleteFile(`avatars/${userId}`);
    } catch {
      // ignore
    }
    return { message: 'Account deleted' };
  }

  async getNotifications(userId: string, take?: number, skip?: number) {
    return this.repository.getNotifications(userId, take, skip);
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.repository.markNotificationRead(userId, notificationId);
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.repository.markAllNotificationsRead(userId);
    return { success: true };
  }
}
