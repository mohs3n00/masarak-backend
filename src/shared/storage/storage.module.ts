import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { CloudinaryProvider } from './providers/cloudinary.provider';

@Global()
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        // You can make this conditional based on a config flag (e.g. storage.activeProvider)
        // Defaulting to Cloudinary for demonstration.
        return new CloudinaryProvider(configService);
      },
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
