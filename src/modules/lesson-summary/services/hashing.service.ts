import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class HashingService {
  buildContentHash(videoUrl: string, promptVersion: string, modelVersion: string): string {
    return createHash('sha256')
      .update(`${videoUrl}::${promptVersion}::${modelVersion}`)
      .digest('hex');
  }

  buildRequestHash(teacherId: string, lessonId: string, stage?: string): string {
    return createHash('sha256')
      .update(`${teacherId}::${lessonId}::${stage || 'full'}`)
      .digest('hex');
  }
}
