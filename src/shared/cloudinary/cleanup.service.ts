import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { extractPublicIdFromUrl } from './cloudinary.utils';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Deletes a file from Cloudinary given its URL.
   */
  async deleteFileByUrl(url: string | null | undefined): Promise<void> {
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) return;

    try {
      await this.cloudinaryService.deleteFile(publicId);
      this.logger.log(`Deleted Cloudinary resource: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Cloudinary resource: ${publicId}`, error);
      // We swallow the error so that if Cloudinary deletion fails, 
      // it doesn't break the database deletion cascade.
    }
  }

  /**
   * Deletes multiple files from Cloudinary given their URLs.
   */
  async deleteFilesByUrls(urls: (string | null | undefined)[]): Promise<void> {
    const validUrls = urls.filter(Boolean);
    if (validUrls.length === 0) return;

    // Run deletions in parallel without throwing errors to prevent blocking DB cascades
    await Promise.allSettled(
      validUrls.map((url) => this.deleteFileByUrl(url))
    );
  }
}
