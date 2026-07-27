import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StructureService } from '../services/structure.service';
import {
  CreateStageDto,
  CreateLevelDto,
  CreateDepartmentDto,
  CreateBranchDto,
} from '../dto/academic.dto';

@ApiTags('Academic Structure')
@ApiBearerAuth()
@Controller('academic/structure')
export class StructureController {
  constructor(private readonly service: StructureService) {}

  @Post('stages')
  @ApiOperation({ summary: 'Create educational stage (e.g. Primary)' })
  async createStage(@Body() dto: CreateStageDto) {
    return this.service.createStage(
      dto.name,
      dto.slug,
      dto.description,
      dto.order,
    );
  }

  @Get('stages')
  @ApiOperation({ summary: 'Get all stages with their levels' })
  async getStages() {
    return this.service.getStages();
  }

  @Post('levels')
  @ApiOperation({ summary: 'Create level for a stage' })
  async createLevel(@Body() dto: CreateLevelDto) {
    return this.service.createLevel(dto.stageId, dto.name, dto.slug, dto.order);
  }

  @Get('levels')
  @ApiOperation({ summary: 'Get all levels' })
  async getLevels() {
    return this.service.getLevels();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(dto.name, dto.slug, dto.description);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get all departments with branches' })
  async getDepartments() {
    return this.service.getDepartments();
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create branch for department' })
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.service.createBranch(
      dto.departmentId,
      dto.name,
      dto.slug,
      dto.description,
    );
  }
}
