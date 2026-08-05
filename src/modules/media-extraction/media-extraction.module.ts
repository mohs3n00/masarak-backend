import { Module } from '@nestjs/common';
import { MediaExtractionService } from './services/media-extraction.service';
import { YoutubeTranscriptService } from './services/youtube-transcript.service';
import { TranscriptCleanerService } from './services/transcript-cleaner.service';

@Module({
  providers: [
    MediaExtractionService,
    YoutubeTranscriptService,
    TranscriptCleanerService
  ],
  exports: [MediaExtractionService],
})
export class MediaExtractionModule {}
