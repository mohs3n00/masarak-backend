import { Injectable } from '@nestjs/common';
import { SendNotificationOptions } from './notification.interface';
import { DatabaseNotificationProvider } from './providers/database.provider';
import { FcmNotificationProvider } from './providers/fcm.provider';

@Injectable()
export class NotificationService {
  constructor(
    private readonly dbProvider: DatabaseNotificationProvider,
    private readonly fcmProvider: FcmNotificationProvider,
  ) {}

  async sendToDatabase(options: SendNotificationOptions): Promise<void> {
    return this.dbProvider.sendNotification(options);
  }

  async sendPushNotification(options: SendNotificationOptions): Promise<void> {
    return this.fcmProvider.sendNotification(options);
  }

  async sendAll(options: SendNotificationOptions): Promise<void> {
    await Promise.allSettled([
      this.sendToDatabase(options),
      this.sendPushNotification(options),
    ]);
  }
}
