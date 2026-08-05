import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const connectionString =
      configService.get<string>('database.url') || process.env.DATABASE_URL;
    const max =
      configService.get<number>('database.poolMax') ||
      parseInt(process.env.DATABASE_POOL_MAX || '10', 10);
    const connectionTimeoutMillis =
      configService.get<number>('database.poolTimeout') ||
      parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000', 10);
    const idleTimeoutMillis =
      configService.get<number>('database.poolIdleTimeout') ||
      parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000', 10);

    const pool = new Pool({
      connectionString,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });

    pool.on('error', (err) => {
      new Logger('PgPool').error(
        'Unexpected error on idle PostgreSQL client',
        err.stack,
      );
    });

    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    this.pool = pool;

    // Slow query logging for queries exceeding 100ms
    (this as any).$on('query', (e: any) => {
      if (e.duration >= 100) {
        const rawQuery = e.query || '';
        const opMatch = rawQuery.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH)/i);
        const operation = opMatch ? opMatch[1].toUpperCase() : 'QUERY';

        this.logger.warn(
          `Slow Query Detected [${e.duration}ms] -> Operation: ${operation}`,
          {
            operation,
            durationMs: e.duration,
            querySample: rawQuery.substring(0, 150),
          },
        );
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL connection pool closed cleanly');
    }
  }
}
