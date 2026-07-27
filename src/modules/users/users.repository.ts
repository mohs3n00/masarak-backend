import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, ActivityAction } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
        settings: true,
        preferences: true,
        privacySettings: true,
        notificationSettings: true,
        profileImages: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateMe(userId: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateSessionFcmToken(sessionId: string, fcmToken: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { fcmToken },
    });
  }

  async updateStudentProfile(
    userId: string,
    data: Prisma.StudentProfileUncheckedUpdateInput,
  ) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...(data as any),
      },
    });
  }

  async updateTeacherProfile(userId: string, data: any) {
    return this.prisma.teacherProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  async updateSettings(
    userId: string,
    data: Prisma.UserSettingsUncheckedUpdateInput,
  ) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...(data as any),
      },
    });
  }

  async updatePreferences(
    userId: string,
    data: Prisma.UserPreferencesUncheckedUpdateInput,
  ) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...(data as any),
      },
    });
  }

  async updatePrivacy(
    userId: string,
    data: Prisma.PrivacySettingsUncheckedUpdateInput,
  ) {
    return this.prisma.privacySettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...(data as any),
      },
    });
  }

  async updateNotifications(
    userId: string,
    data: Prisma.NotificationSettingsUncheckedUpdateInput,
  ) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...(data as any),
      },
    });
  }

  async getDevices(userId: string) {
    return this.prisma.device.findMany({ where: { userId } });
  }

  async removeDevice(userId: string, deviceId: string) {
    return this.prisma.device.deleteMany({
      where: { userId, id: deviceId },
    });
  }

  async logActivity(
    userId: string,
    action: ActivityAction,
    ipAddress?: string,
    userAgent?: string,
    details?: string,
  ) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action,
        ipAddress,
        userAgent,
        details,
      },
    });
  }

  async getActivity(userId: string, take: number = 20, skip: number = 0) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async addProfileImage(userId: string, url: string, publicId?: string) {
    // Demote current image
    await this.prisma.profileImage.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false },
    });
    return this.prisma.profileImage.create({
      data: {
        userId,
        url,
        publicId,
        isCurrent: true,
      },
    });
  }

  async removeProfileImage(userId: string) {
    const images = await this.prisma.profileImage.findMany({
      where: { userId, isCurrent: true },
    });
    if (images.length > 0) {
      await this.prisma.profileImage.updateMany({
        where: { id: { in: images.map((img) => img.id) } },
        data: { isCurrent: false },
      });
      return images[0];
    }
    return null;
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

  async searchUsers(query: string, skip: number = 0, take: number = 20) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });
  }

  async getNotifications(userId: string, take: number = 20, skip: number = 0) {
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, total, unreadCount, skip, take };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
