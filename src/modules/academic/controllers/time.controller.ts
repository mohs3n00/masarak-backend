import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeService } from '../services/time.service';
import { CreateAcademicYearDto, CreateSemesterDto } from '../dto/academic.dto';

@ApiTags('Academic Time')
@ApiBearerAuth()
@Controller('academic/time')
export class TimeController {
  constructor(private readonly service: TimeService) {}

  @Post('years')
  @ApiOperation({ summary: 'Create academic year' })
  async createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.service.createAcademicYear(
      dto.name,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.isActive,
    );
  }

  @Get('years')
  @ApiOperation({ summary: 'Get academic years and semesters' })
  async getAcademicYears() {
    return this.service.getAcademicYears();
  }

  @Post('semesters')
  @ApiOperation({ summary: 'Create semester inside academic year' })
  async createSemester(@Body() dto: CreateSemesterDto) {
    return this.service.createSemester(
      dto.academicYearId,
      dto.name,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.isActive,
    );
  }
}
