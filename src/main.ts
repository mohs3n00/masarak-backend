import { NestFactory, HttpAdapterHost, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  HttpStatus,
  Logger as NestLogger,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ProfilingInterceptor } from './common/interceptors/profiling.interceptor';

async function bootstrap() {
  const processLogger = new NestLogger('ProcessHandler');

  // Process-level exception & rejection handling
  process.on('uncaughtException', (error: Error) => {
    processLogger.error(`[Process] Uncaught Exception: ${error.message}`, {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  });

  process.on('unhandledRejection', (reason: any) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    processLogger.error(`[Process] Unhandled Promise Rejection: ${message}`, {
      timestamp: new Date().toISOString(),
      reason: message,
      stack,
    });
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. Logger configuration
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const corsOrigin = configService.get<string[]>('app.corsOrigin') || [];
  app.enableShutdownHooks();
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'ready', 'api/health', 'api/ready'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '1'],
  });

  // 2. Security Middleware & Body Parser Limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // 3. Global Pipes & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.useGlobalInterceptors(
    new ProfilingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector))
  );

  // 4. Global Exception Filter
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // 5. Swagger (development/staging only — disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const options = new DocumentBuilder()
      .setTitle('Masarak API')
      .setDescription('The Masarak Enterprise E-Learning API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`Application is running on port ${port}`, 'Bootstrap');
}
bootstrap().catch((err) => {
  console.error('Failed to bootstrap application:', err?.message || err);
  process.exit(1);
});
