import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamService } from '../services/exam.service';
import { StartExamSessionDto, AutoSaveSessionDto, SubmitExamSessionDto } from '../dto/exam.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get exam details for a lesson' })
  async getExamByLesson(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.examService.getExamDetailsByLesson(userId, lessonId);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a new exam session or resume an existing one' })
  startSession(
    @CurrentUser('id') userId: string,
    @Body() dto: StartExamSessionDto,
  ) {
    return this.examService.startSession(userId, dto);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto save answers during the exam' })
  autoSave(
    @CurrentUser('id') userId: string,
    @Body() dto: AutoSaveSessionDto,
  ) {
    return this.examService.autoSave(userId, dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit exam session for auto-correction' })
  submitSession(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitExamSessionDto,
  ) {
    return this.examService.submitSession(userId, dto);
  }

  @Get('review/:sessionId')
  @ApiOperation({ summary: 'Get exam review details' })
  async getReviewDetails(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.examService.getReviewDetails(userId, sessionId);
  }
}
