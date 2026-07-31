import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { AcademicConversationsService } from './academic-conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-conversations')
export class AcademicConversationsController {
  constructor(private readonly service: AcademicConversationsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateConversationDto) {
    return this.service.createConversation(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.getConversations(req.user.id, req.user.role, query);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.getConversation(id, req.user.id, req.user.role);
  }

  @Post(':id/messages')
  sendMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteConversation(id, req.user.id, req.user.role);
  }
}
