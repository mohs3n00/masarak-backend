import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ProfilingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceMonitor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request?.method;
    const url = request?.url || request?.originalUrl;

    const start = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - start;
        let payloadSizeBytes = 0;

        if (data) {
          try {
            const jsonStr =
              typeof data === 'string' ? data : JSON.stringify(data);
            payloadSizeBytes = Buffer.byteLength(jsonStr, 'utf8');
          } catch {
            // Ignore circular or non-stringifiable structures
          }
        }

        const payloadSizeKb = (payloadSizeBytes / 1024).toFixed(2);
        const timestamp = new Date().toISOString();

        const logMetadata = {
          route: url,
          method,
          durationMs: duration,
          payloadSizeBytes,
          timestamp,
        };

        // Performance Budget Rule 1: Execution Time > 1000 ms -> Error
        if (duration > 1000) {
          this.logger.error(
            `[PERF_ERROR] ${method} ${url} - Execution time ${duration}ms exceeded 1000ms budget | Payload: ${payloadSizeKb}KB`,
            logMetadata,
          );
        }
        // Performance Budget Rule 2: Execution Time > 300 ms -> Warning
        else if (duration > 300) {
          this.logger.warn(
            `[PERF_WARNING] ${method} ${url} - Execution time ${duration}ms exceeded 300ms budget | Payload: ${payloadSizeKb}KB`,
            logMetadata,
          );
        }

        // Performance Budget Rule 3: Payload Size > 300 KB (307,200 bytes) -> Warning
        if (payloadSizeBytes > 307200) {
          this.logger.warn(
            `[PERF_PAYLOAD_WARNING] ${method} ${url} - Response size ${payloadSizeKb}KB exceeded 300KB budget | Duration: ${duration}ms`,
            logMetadata,
          );
        }
      }),
    );
  }
}
