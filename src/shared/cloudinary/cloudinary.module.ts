import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

import { CleanupService } from './cleanup.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService, CleanupService],
  exports: [CloudinaryProvider, CloudinaryService, CleanupService],
})
export class CloudinaryModule {}
