export type MediaSource = 'youtube-caption' | 'appwrite-video' | 'vimeo' | 'google-drive' | 'mp4-upload';

export interface ExtractedTranscript {
  videoId: string;
  title: string;
  duration: number;
  language: string;
  transcript: string;
  source: MediaSource;
}

export interface TranscriptChunk {
  id: string;
  index: number;
  content: string;
  estimatedTokens: number;
  startTime?: number;
  endTime?: number;
}
