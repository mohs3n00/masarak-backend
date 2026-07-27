import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathService } from '../services/learning-path.service';
import { CreateLearningPathDto } from '../dto/academic.dto';

@ApiTags('Academic Learning Paths')
@ApiBearerAuth()
@Controller('academic/learning-paths')
export class LearningPathController {
  constructor(private readonly service: LearningPathService) {}

  @Post()
  @ApiOperation({ summary: 'Create learning path' })
  async createLearningPath(@Body() dto: CreateLearningPathDto) {
    return this.service.createLearningPath(
      dto.title,
      dto.slug,
      dto.description,
      dto.thumbnailUrl,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all learning paths' })
  async getLearningPaths() {
    return this.service.getLearningPaths();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete learning path' })
  async deleteLearningPath(@Param('id') id: string) {
    return this.service.deleteLearningPath(id);
  }
}
