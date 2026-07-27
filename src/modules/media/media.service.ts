import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  constructor() {}

  async processUpload(file: Express.Multer.File, userId: string) {
    // In production, uploads to S3/Cloudinary, then saves to Prisma `MediaAsset` for userId.
    return {
      url: 'https://cdn.masarak.com/placeholder.png',
      size: file.size,
      userId,
    };
  }
}
