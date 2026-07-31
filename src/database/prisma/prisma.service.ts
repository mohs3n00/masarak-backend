import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      new Logger('PgPool').error('Unexpected error on idle PostgreSQL client', err.stack);
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
  }
}
