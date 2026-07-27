import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  NotificationProvider,
  SendNotificationOptions,
} from '../notification.interface';
import { NotificationException } from '../exceptions/notification.exception';

@Injectable()
export class DatabaseNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(DatabaseNotificationProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendNotification(options: SendNotificationOptions): Promise<void> {
    try {
      // Assuming a generic Notification model in Prisma will be added later.
      // For now, this is an abstraction ready to be wired to the exact schema.
      /*
      await this.prisma.notification.create({
        data: {
          userId: options.userId,
          title: options.title,
          body: options.body,
          type: options.type || 'INFO',
          data: options.data || {},
        },
      });
      */
      this.logger.log(
        `[DB Notification saved] to ${options.userId}: ${options.title}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to save notification to DB: ${error.message}`);
      throw new NotificationException('Failed to save notification', error);
    }
  }
}
