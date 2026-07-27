import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Unified search endpoint for courses, community posts, and teachers.
   * Can be swapped with Elasticsearch later.
   */
  async globalSearch(query: string) {
    const courses = await this.prisma.course.findMany({
      where: { title: { contains: query, mode: 'insensitive' } },
      take: 5,
    });

    const posts = await this.prisma.communityPost.findMany({
      where: { content: { contains: query, mode: 'insensitive' } },
      take: 5,
    });

    return { courses, posts };
  }
}
