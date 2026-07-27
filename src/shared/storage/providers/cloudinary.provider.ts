import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, UploadOptions } from '../storage.interface';
import { StorageException } from '../exceptions/storage.exception';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('storage.cloudinaryCloudName'),
      api_key: this.configService.get<string>('storage.cloudinaryApiKey'),
      api_secret: this.configService.get<string>('storage.cloudinaryApiSecret'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<{ url: string; key: string }> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || 'masarak',
          resource_type: options?.resourceType || 'auto',
          public_id: options?.publicId,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(
              new StorageException(
                'Failed to upload file to Cloudinary',
                error,
              ),
            );
          }
          if (!result) {
            return reject(
              new StorageException('Unknown error during Cloudinary upload'),
            );
          }
          resolve({
            url: result.secure_url,
            key: result.public_id,
          });
        },
      );

      // Write buffer to the upload stream
      upload.end(file.buffer);
    });
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(key);
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(
          `Cloudinary destroy returned: ${result.result} for key ${key}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to delete file from Cloudinary: ${error.message}`,
      );
      throw new StorageException(
        'Failed to delete file from Cloudinary',
        error,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Cloudinary URLs are generally public or signed at generation.
    // We can generate a timed URL if we use strictly private resources, but typically we return the raw url for public ones.
    // A simplified placeholder implementation:
    return cloudinary.url(key, { secure: true, sign_url: true });
  }
}
