import { HttpException, HttpStatus } from '@nestjs/common';

export class CacheException extends HttpException {
  constructor(message: string, errorDetails?: any) {
    super(
      {
        code: 'CACHE_ERROR',
        message,
        details: errorDetails,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
