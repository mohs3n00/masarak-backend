import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxonomyService } from '../services/taxonomy.service';
import {
  CreateTagDto,
  CreateSkillDto,
  CreateSpecializationDto,
} from '../dto/academic.dto';

@ApiTags('Academic Taxonomy')
@ApiBearerAuth()
@Controller('academic/taxonomy')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Post('tags')
  @ApiOperation({ summary: 'Create tag' })
  async createTag(@Body() dto: CreateTagDto) {
    return this.service.createTag(dto.name, dto.slug);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all tags' })
  async getTags() {
    return this.service.getTags();
  }

  @Post('skills')
  @ApiOperation({ summary: 'Create skill' })
  async createSkill(@Body() dto: CreateSkillDto) {
    return this.service.createSkill(dto.name, dto.slug);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get all skills' })
  async getSkills() {
    return this.service.getSkills();
  }

  @Post('specializations')
  @ApiOperation({ summary: 'Create specialization' })
  async createSpecialization(@Body() dto: CreateSpecializationDto) {
    return this.service.createSpecialization(
      dto.name,
      dto.slug,
      dto.description,
    );
  }

  @Get('specializations')
  @ApiOperation({ summary: 'Get all specializations' })
  async getSpecializations() {
    return this.service.getSpecializations();
  }
}
