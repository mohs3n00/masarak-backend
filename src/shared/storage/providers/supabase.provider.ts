import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider, UploadOptions } from '../storage.interface';
import { StorageException } from '../exceptions/storage.exception';

@Injectable()
export class SupabaseProvider implements StorageProvider {
  private readonly logger = new Logger(SupabaseProvider.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('storage.supabaseUrl');
    const supabaseKey = this.configService.get<string>(
      'storage.supabaseServiceRoleKey',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase configuration missing, Storage will fail if SupabaseProvider is used.',
      );
    }

    this.supabase = createClient(supabaseUrl || '', supabaseKey || '');
  }

  async uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<{ url: string; key: string }> {
    try {
      const bucket = options?.folder || 'masarak-bucket';
      const key = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(key, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: publicUrlData.publicUrl,
        key: `${bucket}/${data.path}`,
      };
    } catch (error: any) {
      this.logger.error(`Supabase upload failed: ${error.message}`);
      throw new StorageException('Failed to upload file to Supabase', error);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const [bucket, ...pathParts] = key.split('/');
      const path = pathParts.join('/');

      const { error } = await this.supabase.storage.from(bucket).remove([path]);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to delete file from Supabase: ${error.message}`,
      );
      throw new StorageException('Failed to delete file from Supabase', error);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const [bucket, ...pathParts] = key.split('/');
      const path = pathParts.join('/');

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate signed URL from Supabase: ${error.message}`,
      );
      throw new StorageException('Failed to generate signed URL', error);
    }
  }
}
