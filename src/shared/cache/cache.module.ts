import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore, redisInsStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('cache.host');
        const port = configService.get<number>('cache.port');
        const password = configService.get<string>('cache.password');

        let store;
        try {
          const { createClient } = require('redis');
          const client = createClient({
            socket: {
              host,
              port,
              tls: process.env.NODE_ENV === 'production' || host?.includes('upstash'),
              reconnectStrategy: (retries: number) => {
                if (retries > 3) {
                  return new Error('Redis connection failed');
                }
                return Math.min(retries * 50, 500);
              }
            },
            password: password || undefined,
          });
          client.on('error', (err: any) => console.log('Redis Client Error:', err.message));
          await client.connect();
          store = redisInsStore(client, { ttl: 60000 });
        } catch (e) {
          console.log('Falling back to memory cache due to redis error:', e.message);
          store = 'memory';
        }

        return {
          store: store,
          ttl: 60000, // 60 seconds default
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class GlobalCacheModule {}
