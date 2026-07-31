import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

import { CommunitySearchService } from '../community/services/community-search.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communitySearch: CommunitySearchService,
  ) {}

  /**
   * Unified search endpoint for courses, community posts, and teachers.
   * Can be swapped with Elasticsearch later.
   */
  async globalSearch(query: string) {
    const courses = await this.prisma.course.findMany({
      where: { title: { contains: query, mode: 'insensitive' } },
      take: 5,
    });

    const communityResults = await this.communitySearch.searchPosts({
      q: query,
      limit: '5',
    });
    const posts = communityResults.data;

    return { courses, posts };
  }
}
