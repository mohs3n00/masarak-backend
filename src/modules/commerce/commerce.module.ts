import { Module } from '@nestjs/common';
import { CommerceRepository } from './commerce.repository';
import { AccessService } from './services/access.service';

@Module({
  providers: [CommerceRepository, AccessService],
  exports: [CommerceRepository, AccessService],
})
export class CommerceModule {}
