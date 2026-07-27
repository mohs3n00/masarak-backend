import { HttpException, HttpStatus } from '@nestjs/common';

export class NotificationException extends HttpException {
  constructor(message: string, errorDetails?: any) {
    super(
      {
        code: 'NOTIFICATION_ERROR',
        message,
        details: errorDetails,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
