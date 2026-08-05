import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MonitoringMiddleware } from './monitoring.middleware';
import { HealthController } from './health.controller';
import { AcademicConversationsModule } from '../academic-conversations/academic-conversations.module';

@Module({
  imports: [AcademicConversationsModule],
  controllers: [HealthController],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MonitoringMiddleware).forRoutes('*');
  }
}
