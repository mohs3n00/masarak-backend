import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateLessonSummaryDto } from './dto/create-lesson-summary.dto';
import { RetryLessonSummaryDto } from './dto/retry-lesson-summary.dto';
import { LessonSummaryService } from './services/lesson-summary.service';

@ApiTags('Lesson Summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lesson-summaries')
export class LessonSummaryController {
  constructor(private readonly lessonSummaryService: LessonSummaryService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Create or reuse lesson AI summary and generate PDF',
  })
  async create(
    @CurrentUser('id') teacherId: string,
    @Body() dto: CreateLessonSummaryDto,
  ) {
    return this.lessonSummaryService.start(teacherId, dto);
  }

  @Post(':lessonId/retry')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Retry pipeline from failed stage or from a specified stage',
  })
  async retry(
    @CurrentUser('id') teacherId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: RetryLessonSummaryDto,
  ) {
    return this.lessonSummaryService.retry(teacherId, lessonId, dto);
  }

  @Get(':lessonId')
  @ApiOperation({
    summary: 'Get lesson summary status and generated file URLs',
  })
  async getByLessonId(@Param('lessonId') lessonId: string) {
    return this.lessonSummaryService.getByLessonId(lessonId);
  }
}
