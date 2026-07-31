import { Module } from '@nestjs/common';
import { SearchService } from './search.service';

import { CommunityModule } from '../community/community.module';

@Module({
  imports: [CommunityModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
