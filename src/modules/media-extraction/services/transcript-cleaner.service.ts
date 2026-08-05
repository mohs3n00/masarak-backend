import { Injectable, Logger } from '@nestjs/common';
import { TranscriptChunk } from '../types/media.types';

@Injectable()
export class TranscriptCleanerService {
  private readonly logger = new Logger(TranscriptCleanerService.name);

  public cleanTranscript(rawText: string): string {
    this.logger.debug('Cleaning raw transcript text');
    
    // 1. Remove duplicate adjacent words (common in auto-captions)
    let cleaned = rawText.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    // 2. Remove extra spaces and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 3. Simple punctuation fix (add spaces after punctuation if missing)
    cleaned = cleaned.replace(/([.,!؟])([^\s])/g, '$1 $2');
    
    // 4. Decode HTML entities (e.g. &amp; -> &)
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return cleaned;
  }

  public buildChunks(cleanedText: string, maxTokensPerChunk: number = 3000): TranscriptChunk[] {
    this.logger.debug('Building transcript chunks');
    const chunks: TranscriptChunk[] = [];
    
    // Simple sentence-based splitting to avoid breaking in the middle of a sentence
    const sentences = cleanedText.split(/(?<=[.?!؟])\s+/);
    
    let currentChunkText = '';
    let currentTokens = 0;
    let chunkIndex = 1;

    for (const sentence of sentences) {
      // Rough estimation: 1 word ≈ 1.3 tokens in Arabic/English
      const sentenceTokens = Math.ceil(sentence.split(/\s+/).length * 1.3);

      if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunkText.length > 0) {
        // Push the current chunk and start a new one
        chunks.push({
          id: `chunk_${chunkIndex}`,
          index: chunkIndex,
          content: currentChunkText.trim(),
          estimatedTokens: currentTokens
        });
        chunkIndex++;
        currentChunkText = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunkText += (currentChunkText ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }

    // Push the last chunk
    if (currentChunkText.trim()) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        index: chunkIndex,
        content: currentChunkText.trim(),
        estimatedTokens: currentTokens
      });
    }

    return chunks;
  }
}
