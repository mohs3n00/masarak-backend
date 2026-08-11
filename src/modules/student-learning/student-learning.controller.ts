import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AskLessonDto, CreateBookmarkDto, CreateNoteDto, UpdateProgressDto } from './dto/student-learning.dto';
import { StudentLearningService } from './student-learning.service';

@ApiTags('Student Learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('student-learning')
export class StudentLearningController {
  constructor(private readonly learning: StudentLearningService) {}
  @Post(':lessonId/chat') chat(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string, @Body() dto: AskLessonDto) { return this.learning.chat(userId, lessonId, dto.question); }
  @Get(':lessonId/flashcards') flashcards(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string) { return this.learning.flashcards(userId, lessonId); }
  @Get(':lessonId/quiz') quiz(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string) { return this.learning.quiz(userId, lessonId); }
  @Get(':lessonId/revision') revision(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string) { return this.learning.revision(userId, lessonId); }
  @Get(':lessonId/search') search(@Param('lessonId') lessonId: string, @Query('q') query = '') { return this.learning.search(lessonId, query); }
  @Post(':lessonId/notes') note(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string, @Body() dto: CreateNoteDto) { return this.learning.note(userId, lessonId, dto.content, dto.blockId); }
  @Get(':lessonId/notes') notes(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string) { return this.learning.notes(userId, lessonId); }
  @Post(':lessonId/bookmarks') bookmark(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string, @Body() dto: CreateBookmarkDto) { return this.learning.bookmark(userId, lessonId, dto.blockId, dto.title); }
  @Get(':lessonId/bookmarks') bookmarks(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string) { return this.learning.bookmarks(userId, lessonId); }
  @Post(':lessonId/progress') progress(@CurrentUser('id') userId: string, @Param('lessonId') lessonId: string, @Body() dto: UpdateProgressDto) { return this.learning.progress(userId, lessonId, dto.percent, dto.completed); }
}
