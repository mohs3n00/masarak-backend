import { Injectable, Inject } from '@nestjs/common';
import type { StorageProvider } from './storage.interface';
import { UploadOptions } from './storage.interface';
import { StorageException } from './exceptions/storage.exception';

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: StorageProvider,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new StorageException('File is missing');
    }
    return this.storageProvider.uploadFile(file, options);
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      throw new StorageException('File key is missing');
    }
    return this.storageProvider.deleteFile(key);
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    if (!key) {
      throw new StorageException('File key is missing');
    }
    return this.storageProvider.getSignedUrl(key, expiresIn);
  }
}
