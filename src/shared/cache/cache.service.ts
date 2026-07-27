import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CacheException } from './exceptions/cache.exception';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return this.cacheManager.get<T>(key);
    } catch (error: any) {
      this.logger.error(`Failed to get cache for key ${key}: ${error.message}`);
      throw new CacheException('Failed to get cache', error);
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      // NestJS cache-manager v5 sets TTL in milliseconds.
      if (ttl) {
        await this.cacheManager.set(key, value, ttl);
      } else {
        await this.cacheManager.set(key, value);
      }
    } catch (error: any) {
      this.logger.error(`Failed to set cache for key ${key}: ${error.message}`);
      throw new CacheException('Failed to set cache', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error: any) {
      this.logger.error(
        `Failed to delete cache for key ${key}: ${error.message}`,
      );
      throw new CacheException('Failed to delete cache', error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error: any) {
      this.logger.error(`Failed to reset cache: ${error.message}`);
      throw new CacheException('Failed to reset cache', error);
    }
  }
}
