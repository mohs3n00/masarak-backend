import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicRepository } from '../academic.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TaxonomyService {
  constructor(
    private readonly repo: AcademicRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}



  async createTag(name: string, slug: string) {
    const tag = await this.repo.createTag({ name, slug });
    this.eventEmitter.emit('academic.tag.created', tag);
    return tag;
  }

  async getTags() {
    return this.repo.findTags();
  }

  async createSkill(name: string, slug: string) {
    return this.repo.createSkill({ name, slug });
  }

  async getSkills() {
    return this.repo.findSkills();
  }

  async createSpecialization(name: string, slug: string, description?: string) {
    return this.repo.createSpecialization({ name, slug, description });
  }

  async getSpecializations() {
    return this.repo.findSpecializations();
  }
}
