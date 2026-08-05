import { Injectable, Logger } from '@nestjs/common';
import { YoutubeTranscriptService } from './youtube-transcript.service';
import { TranscriptCleanerService } from './transcript-cleaner.service';
import { ExtractedTranscript, TranscriptChunk } from '../types/media.types';

@Injectable()
export class MediaExtractionService {
  private readonly logger = new Logger(MediaExtractionService.name);

  constructor(
    private readonly youtubeTranscriptService: YoutubeTranscriptService,
    private readonly transcriptCleanerService: TranscriptCleanerService
  ) {}

  public async processMedia(videoUrl: string, jobId: string): Promise<{
    metadata: ExtractedTranscript;
    chunks: TranscriptChunk[];
  }> {
    this.logger.log(`[Job ${jobId}] Transcript Extraction Started`);
    let metadata: ExtractedTranscript;

    // 1. Extraction Layer
    try {
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        metadata = await this.youtubeTranscriptService.fetchTranscript(videoUrl);
      } else {
        // Fallback for non-youtube sources (Future proofing)
        throw new Error('Unsupported media source');
      }
    } catch (error: any) {
      this.logger.error(`[Job ${jobId}] Transcript Extraction Failed: ${error.message}`);
      throw new Error('TranscriptUnavailable');
    }
    
    this.logger.log(`[Job ${jobId}] Transcript Extraction Finished. Extracted ${metadata.transcript.length} chars.`);

    // 2. Cleaning Layer
    this.logger.log(`[Job ${jobId}] Cleaning Started`);
    const cleanedText = this.transcriptCleanerService.cleanTranscript(metadata.transcript);
    metadata.transcript = cleanedText;
    this.logger.log(`[Job ${jobId}] Cleaning Finished.`);

    // 3. Chunk Building Layer
    this.logger.log(`[Job ${jobId}] Chunk Building Started`);
    const chunks = this.transcriptCleanerService.buildChunks(cleanedText);
    this.logger.log(`[Job ${jobId}] Chunk Building Finished. Total chunks: ${chunks.length}`);

    // Optionally: save to Appwrite Storage here using a storage method in the repo
    // For now, we return it to be used by the pipeline.

    return { metadata, chunks };
  }
}
