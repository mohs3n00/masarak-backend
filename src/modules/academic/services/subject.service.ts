import { Injectable } from '@nestjs/common';
import { AcademicRepository } from '../academic.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SubjectService {
  constructor(
    private readonly repo: AcademicRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSubjectGroup(name: string, slug: string, description?: string) {
    return this.repo.createSubjectGroup({ name, slug, description });
  }

  async getSubjectGroups() {
    return this.repo.findSubjectGroups();
  }

  async createSubject(data: {
    name: string;
    slug: string;
    description?: string;
    groupId?: string;
    departmentId?: string;
    branchId?: string;
  }) {
    const subject = await this.repo.createSubject(data);
    this.eventEmitter.emit('academic.subject.created', subject);
    return subject;
  }

  async getSubjects(skip?: number, take?: number) {
    return this.repo.findSubjects(skip, take);
  }

  async deleteSubject(id: string) {
    return this.repo.softDeleteSubject(id);
  }
}
