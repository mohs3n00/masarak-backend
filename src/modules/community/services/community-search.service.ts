import { Injectable, Inject } from '@nestjs/common';
import {
  type ICommunityPostRepository,
  COMMUNITY_POST_REPOSITORY,
} from '../interfaces';
import { SearchQueryDto } from '../dto';

@Injectable()
export class CommunitySearchService {
  constructor(
    @Inject(COMMUNITY_POST_REPOSITORY)
    private readonly postRepository: ICommunityPostRepository,
  ) {}

  async searchPosts(query: SearchQueryDto) {
    return this.postRepository.search(
      query.q,
      query.spaceId,
      query.cursor,
      query.limit ? parseInt(query.limit, 10) : undefined,
    );
  }
}
