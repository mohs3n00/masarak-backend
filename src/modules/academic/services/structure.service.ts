import { Injectable } from '@nestjs/common';
import { AcademicRepository } from '../academic.repository';

@Injectable()
export class StructureService {
  constructor(private readonly repo: AcademicRepository) {}

  async createStage(
    name: string,
    slug: string,
    description?: string,
    order?: number,
  ) {
    return this.repo.createStage({
      name,
      slug,
      description,
      order: order || 0,
    });
  }

  async getStages() {
    return this.repo.findStages();
  }

  async createLevel(
    stageId: string,
    name: string,
    slug: string,
    order?: number,
  ) {
    return this.repo.createLevel({ stageId, name, slug, order: order || 0 });
  }

  async getLevels() {
    return this.repo.findLevels();
  }

  async createDepartment(name: string, slug: string, description?: string) {
    return this.repo.createDepartment({ name, slug, description });
  }

  async getDepartments() {
    return this.repo.findDepartments();
  }

  async createBranch(
    departmentId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.repo.createBranch({ departmentId, name, slug, description });
  }
}
