import { Provider } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get<string>('storage.cloudinaryCloudName') || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: configService.get<string>('storage.cloudinaryApiKey') || process.env.CLOUDINARY_API_KEY,
      api_secret: configService.get<string>('storage.cloudinaryApiSecret') || process.env.CLOUDINARY_API_SECRET,
    });
  },
};
