import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  type ICommunitySpaceRepository,
  COMMUNITY_SPACE_REPOSITORY,
} from '../interfaces';
import { CreateSpaceDto } from '../dto';

@Injectable()
export class CommunitySpaceService {
  constructor(
    @Inject(COMMUNITY_SPACE_REPOSITORY)
    private readonly spaceRepository: ICommunitySpaceRepository,
  ) {}

  async create(dto: CreateSpaceDto) {
    // Generate slug from name
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    return this.spaceRepository.create({
      ...dto,
      referenceId: dto.referenceId || null,
      description: dto.description || null,
      type: dto.type as any,
      slug,
      isArchived: false,
      metadata: null,
      createdAt: new Date().toISOString(),
    });
  }

  async findAll() {
    return this.spaceRepository.findAll();
  }

  async findByType(type: string) {
    return this.spaceRepository.findByType(type);
  }

  async findById(id: string) {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new NotFoundException('Space not found');
    }
    return space;
  }
}
