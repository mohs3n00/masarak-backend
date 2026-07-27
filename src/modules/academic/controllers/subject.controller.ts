import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectService } from '../services/subject.service';
import { CreateSubjectDto, CreateSubjectGroupDto } from '../dto/academic.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Academic Subjects')
@ApiBearerAuth()
@Controller('academic/subjects')
export class SubjectController {
  constructor(private readonly service: SubjectService) {}

  @Post('groups')
  @ApiOperation({ summary: 'Create subject group' })
  async createSubjectGroup(@Body() dto: CreateSubjectGroupDto) {
    return this.service.createSubjectGroup(dto.name, dto.slug, dto.description);
  }

  @Public()
  @Get('groups')
  @ApiOperation({ summary: 'Get all subject groups' })
  async getSubjectGroups() {
    return this.service.getSubjectGroups();
  }

  @Post()
  @ApiOperation({ summary: 'Create a subject' })
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.service.createSubject(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get subjects with pagination' })
  async getSubjects(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.getSubjects(
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete subject' })
  async deleteSubject(@Param('id') id: string) {
    return this.service.deleteSubject(id);
  }
}
