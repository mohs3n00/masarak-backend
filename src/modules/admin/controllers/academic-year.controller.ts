import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { AcademicYearService } from '../services/academic-year.service';

@Controller('admin/academic-year')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Post('promote')
  async promoteStudents(
    @Body('fromGrade') fromGrade: string,
    @Body('toGrade') toGrade: string,
  ) {
    return this.service.promoteStudents(fromGrade, toGrade);
  }

  @Delete('graduate')
  async graduateStudents(@Body('grade') grade: string) {
    return this.service.graduateStudents(grade);
  }

  @Delete('reset')
  async resetAllStudents() {
    return this.service.resetAllStudents();
  }
}
