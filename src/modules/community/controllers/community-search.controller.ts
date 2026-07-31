import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunitySearchService } from '../services';
import { SearchQueryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Community Search')
@Controller('community/search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunitySearchController {
  constructor(private readonly searchService: CommunitySearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search community posts' })
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.searchPosts(query);
  }
}
