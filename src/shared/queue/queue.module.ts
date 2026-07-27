import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('queue.host'),
          port: configService.get<number>('queue.port'),
          password: configService.get<string>('queue.password') || undefined,
          tls: process.env.NODE_ENV === 'production' || configService.get<string>('queue.host')?.includes('upstash') ? { rejectUnauthorized: false } : undefined,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 50, 500);
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAIL,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATION,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.UPLOAD,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
