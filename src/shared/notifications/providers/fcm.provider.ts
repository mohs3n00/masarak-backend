import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  NotificationProvider,
  SendNotificationOptions,
} from '../notification.interface';

@Injectable()
export class FcmNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(FcmNotificationProvider.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async sendNotification(options: SendNotificationOptions): Promise<void> {
    try {
      // Note: The userId here would be resolved to an FCM device token in a real business module.
      // For abstraction purposes, we assume `userId` is the token or we handle token resolution at a higher level.
      // In this infrastructure code, we'll try to send assuming userId is the token for simplicity,
      // or we just log it until the business layer provides exact tokens.
      const messaging = this.firebaseService.getMessaging();

      const message = {
        token: options.userId, // This should be a valid FCM token.
        notification: {
          title: options.title,
          body: options.body,
        },
        data: options.data,
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'masarak_alerts_v3',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
          headers: {
            'apns-priority': '10',
          },
        },
      };

      await messaging.send(message);
      this.logger.log(
        `[FCM Notification sent] to ${options.userId}: ${options.title}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send FCM notification: ${error.message}`);
      throw error;
    }
  }
}
