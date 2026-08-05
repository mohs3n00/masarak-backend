import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import {
  appConfig,
  authConfig,
  databaseConfig,
  storageConfig,
  cacheConfig,
  firebaseConfig,
  queueConfig,
  smsConfig,
  appwriteConfig,
  lessonSummaryConfig,
  teacherStudioConfig,
} from './config';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AcademicModule } from './modules/academic/academic.module';
import { CourseModule } from './modules/course/course.module';
import { StudentModule } from './modules/student/student.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommunityModule } from './modules/community/community.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MediaModule } from './modules/media/media.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExamModule } from './modules/exam/exam.module';
import { FirebaseModule } from './modules/firebase/firebase.module';

// Shared Infrastructure Modules
import { StorageModule } from './shared/storage/storage.module';
import { AppwriteModule } from './shared/appwrite/appwrite.module';
import { SmsModule } from './shared/sms/sms.module';
import { NotificationModule } from './shared/notifications/notification.module';
import { QueueModule } from './shared/queue/queue.module';
import { GlobalCacheModule } from './shared/cache/cache.module';
import { EmailModule } from './modules/email/email.module';
import { VerificationModule } from './modules/verification/verification.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AcademicConversationsModule } from './modules/academic-conversations/academic-conversations.module';
import { LessonSummaryModule } from './modules/lesson-summary/lesson-summary.module';
import { MediaExtractionModule } from './modules/media-extraction/media-extraction.module';
import { StudentLearningModule } from './modules/student-learning/student-learning.module';
import { TeacherStudioModule } from './modules/teacher-studio/teacher-studio.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: process.env.NODE_ENV
        ? `.env.${process.env.NODE_ENV}`
        : '.env.development',
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        storageConfig,
        cacheConfig,
        firebaseConfig,
        queueConfig,
        smsConfig,
        appwriteConfig,
        lessonSummaryConfig,
        teacherStudioConfig,
      ],
    }),

    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('auth.throttle.ttl') || 60000,
          limit: configService.get<number>('auth.throttle.limit') || 10,
        },
      ],
    }),

    // Database
    PrismaModule,

    // Shared Infrastructure Modules
    AppwriteModule,
    StorageModule,
    SmsModule,
    NotificationModule,
    QueueModule,
    GlobalCacheModule,
    EventEmitterModule.forRoot(),

    // Business Modules
    FirebaseModule,
    AuthModule,
    UsersModule,
    AcademicModule,
    CourseModule,
    StudentModule,
    CommerceModule,
    TeacherModule,
    AdminModule,
    CommunityModule,
    SearchModule,
    AnalyticsModule,
    MediaModule,
    MonitoringModule,
    UploadModule,
    ExamModule,
    EmailModule,
    VerificationModule,
    PaymentsModule,
    AcademicConversationsModule,
    MediaExtractionModule,
    LessonSummaryModule,
    StudentLearningModule,
    TeacherStudioModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
