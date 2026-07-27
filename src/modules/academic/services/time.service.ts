import { Injectable } from '@nestjs/common';
import { AcademicRepository } from '../academic.repository';

@Injectable()
export class TimeService {
  constructor(private readonly repo: AcademicRepository) {}

  async createAcademicYear(
    name: string,
    startDate: Date,
    endDate: Date,
    isActive: boolean = false,
  ) {
    return this.repo.createAcademicYear({ name, startDate, endDate, isActive });
  }

  async getAcademicYears() {
    return this.repo.findAcademicYears();
  }

  async createSemester(
    academicYearId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    isActive: boolean = false,
  ) {
    return this.repo.createSemester({
      academicYearId,
      name,
      startDate,
      endDate,
      isActive,
    });
  }

  async createCalendarEvent(
    title: string,
    startDate: Date,
    endDate: Date,
    type: string,
  ) {
    return this.repo.createCalendarEvent({ title, startDate, endDate, type });
  }

  async getCalendarEvents() {
    return this.repo.findCalendarEvents();
  }
}
