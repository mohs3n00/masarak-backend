import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AdminTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Subjects ---
  async getSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubject(dto: { name: string; description?: string }) {
    let slug = dto.name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await this.prisma.subject.findUnique({ where: { slug } });
    if (existing) slug += '-' + Date.now();

    return this.prisma.subject.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
      }
    });
  }

  async updateSubject(id: string, dto: { name?: string; description?: string }) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');

    let slug = subject.slug;
    if (dto.name && dto.name !== subject.name) {
      slug = dto.name.trim().toLowerCase().replace(/\s+/g, '-');
      const existing = await this.prisma.subject.findUnique({ where: { slug } });
      if (existing && existing.id !== id) slug += '-' + Date.now();
    }

    return this.prisma.subject.update({
      where: { id },
      data: {
        ...dto,
        slug,
      }
    });
  }

  async deleteSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.subject.delete({ where: { id } });
  }
}
