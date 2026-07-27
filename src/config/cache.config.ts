import { registerAs } from '@nestjs/config';

export const cacheConfig = registerAs('cache', () => ({
  host: (process.env.REDIS_HOST || 'localhost').replace(/^https?:\/\//, ''),
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
}));
