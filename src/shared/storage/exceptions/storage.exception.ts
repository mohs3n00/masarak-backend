import { HttpException, HttpStatus } from '@nestjs/common';

export class StorageException extends HttpException {
  constructor(message: string, errorDetails?: any) {
    super(
      {
        code: 'STORAGE_ERROR',
        message,
        details: errorDetails,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
