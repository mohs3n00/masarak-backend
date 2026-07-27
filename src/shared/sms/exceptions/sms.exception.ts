import { HttpException, HttpStatus } from '@nestjs/common';

export class SmsException extends HttpException {
  constructor(message: string, errorDetails?: any) {
    super(
      {
        code: 'SMS_ERROR',
        message,
        details: errorDetails,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
