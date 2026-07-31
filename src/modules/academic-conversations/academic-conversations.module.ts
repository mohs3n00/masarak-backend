import { Module } from '@nestjs/common';
import { AcademicConversationsService } from './academic-conversations.service';
import { AcademicConversationsController } from './academic-conversations.controller';
import { AcademicConversationsGateway } from './academic-conversations.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AcademicConversationsService, AcademicConversationsGateway],
  controllers: [AcademicConversationsController],
})
export class AcademicConversationsModule {}
