import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
  poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  poolTimeout: parseInt(
    process.env.DATABASE_POOL_TIMEOUT ||
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT ||
      '10000',
    10,
  ),
  poolIdleTimeout: parseInt(
    process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000',
    10,
  ),
}));
