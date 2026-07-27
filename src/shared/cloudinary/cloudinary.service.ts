import { Injectable, Logger } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadFile(
    filePath: string,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      return await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
      });
    } catch (error) {
      this.logger.error('Failed to upload file to Cloudinary', error);
      throw error;
    }
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from Cloudinary (ID: ${publicId})`,
        error,
      );
      throw error;
    }
  }
}
