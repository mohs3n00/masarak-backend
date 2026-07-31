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
  private readonly logger = new Logger('Profiler');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request.method;
    const url = request.url;
    
    // Only profile API calls in development
    if (process.env.NODE_ENV === 'production' || !url.startsWith('/api')) {
      return next.handle();
    }

    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const time = Date.now() - now;
        let sizeKb = 0;
        
        if (data) {
          try {
            const jsonStr = JSON.stringify(data);
            sizeKb = Buffer.byteLength(jsonStr) / 1024;
          } catch (e) {
            // Ignore circular JSON or non-stringifiable
          }
        }

        const isSlow = time > 300;
        const isLarge = sizeKb > 200; // > 200KB

        const message = `${method} ${url} - ${time}ms - ${sizeKb.toFixed(2)}KB`;
        
        if (isSlow || isLarge) {
          this.logger.warn(`[PERF_WARNING] ${message}`);
        } else {
          this.logger.log(`[PERF] ${message}`);
        }
      }),
    );
  }
}
