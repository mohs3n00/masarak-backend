import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TeacherStudioService } from './teacher-studio.service';

@ApiTags('Teacher Studio') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('teacher-studio')
export class TeacherStudioController {
  constructor(private readonly studio: TeacherStudioService) {}
  @Post('campaigns') create(@CurrentUser('id') teacherId: string, @Body() dto: CreateCampaignDto) { return this.studio.createCampaign(teacherId, dto); }
  @Get('campaigns') list(@CurrentUser('id') teacherId: string) { return this.studio.projects(teacherId); }
}
