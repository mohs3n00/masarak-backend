import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MonitoringMiddleware } from './monitoring.middleware';

@Module({
  providers: [],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MonitoringMiddleware).forRoutes('*');
  }
}
