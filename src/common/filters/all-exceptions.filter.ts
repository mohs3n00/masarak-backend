import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'Internal server error';
    let details = undefined;

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      if (typeof response === 'object') {
        errorCode = response.errorCode || response.error || response.code || 'API_ERROR';
        errorMessage = response.message || exception.message;

        // Handle class-validator validation errors
        if (
          httpStatus === HttpStatus.UNPROCESSABLE_ENTITY ||
          httpStatus === HttpStatus.BAD_REQUEST
        ) {
          if (Array.isArray(response.message)) {
            errorCode = 'VALIDATION_ERROR';
            errorMessage = 'Validation failed';
            details = response.message;
          }
        }
      } else {
        errorMessage = exception.message;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    // ✅ تنقية البيانات الحساسة قبل الـ logging
    const sanitizedBody = this.sanitizeBody(request.body);

    // Log the error (sanitized)
    const errorLog = {
      method: request.method,
      url: request.url,
      body: sanitizedBody,
      statusCode: httpStatus,
      errorCode,
      errorMessage,
      details,
      // لا نطبع stack trace في production
      ...(process.env.NODE_ENV !== 'production' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    if (httpStatus >= 500) {
      this.logger.error(`[${request.method}] ${request.url} - ${errorMessage}`, errorLog);
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${errorMessage}`, errorLog);
    }

    const responseBody = {
      success: false,
      error: {
        code: errorCode,
        // في production: لا نكشف رسائل الخطأ الداخلية للـ 500
        message: httpStatus >= 500 && process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : errorMessage,
        ...(details && { details }),
        ...(exception instanceof HttpException && typeof exception.getResponse() === 'object' && (exception.getResponse() as any).userId ? { userId: (exception.getResponse() as any).userId } : {})
      },
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  /**
   * إزالة البيانات الحساسة من body قبل الـ logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const SENSITIVE_FIELDS = [
      'password', 'oldPassword', 'newPassword', 'confirmPassword',
      'token', 'accessToken', 'refreshToken', 'secret', 'apiKey',
      'authorization', 'creditCard', 'cvv', 'pin',
    ];

    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
