import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { IsString, IsOptional } from 'class-validator';

export class CreatePlaybackSessionDto {
  @IsString()
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  deviceToken?: string;

  @IsString()
  @IsOptional()
  originalMediaUrl?: string;
}

@ApiTags('Media Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('playback-session')
  @ApiOperation({ summary: 'Generate secure video playback session with forensic watermark data' })
  async createPlaybackSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePlaybackSessionDto,
  ) {
    return this.mediaService.createPlaybackSession(userId, dto.lessonId, dto.courseId, dto.originalMediaUrl);
  }

  @Get('session')
  @ApiOperation({ summary: 'Get current forensic watermark session for user' })
  async getSession(
    @CurrentUser('id') userId: string,
    @Query('lessonId') lessonId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.mediaService.createPlaybackSession(userId, lessonId, courseId);
  }
}
