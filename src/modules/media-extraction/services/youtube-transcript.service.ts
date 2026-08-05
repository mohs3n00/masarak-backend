import { Injectable, Logger } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';
import { ExtractedTranscript } from '../types/media.types';

@Injectable()
export class YoutubeTranscriptService {
  private readonly logger = new Logger(YoutubeTranscriptService.name);

  async fetchTranscript(videoUrl: string): Promise<ExtractedTranscript> {
    try {
      this.logger.debug(`Fetching transcript for YouTube URL: ${videoUrl}`);
      
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoUrl);
      
      if (!transcriptData || transcriptData.length === 0) {
        throw new Error('Transcript is empty');
      }

      // Concatenate the raw text from the transcript
      const rawText = transcriptData.map((item) => item.text).join(' ');
      
      // Calculate a rough duration from the last item
      const lastItem = transcriptData[transcriptData.length - 1];
      const duration = lastItem.offset + lastItem.duration;

      // Extract Video ID
      const videoIdMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown';

      return {
        videoId,
        title: `YouTube Video ${videoId}`,
        duration: Math.round(duration / 1000), // in seconds
        language: 'unknown', // YoutubeTranscript doesn't provide the language natively easily without additional parsing, but usually it's 'ar' or 'en'
        transcript: rawText,
        source: 'youtube-caption'
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch transcript: ${error.message}`);
      throw new Error('TranscriptUnavailable');
    }
  }
}
