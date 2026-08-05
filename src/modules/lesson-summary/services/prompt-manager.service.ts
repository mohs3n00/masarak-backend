import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { PromptManager } from '../interfaces/lesson-summary.interfaces';
import type { PromptDefinition } from '../types/lesson-summary.types';
import { LESSON_SUMMARY_PROMPT_DIR } from '../constants/lesson-summary.constants';

const PROMPT_FILE_MAP = {
  analysis: 'analysis.prompt.md',
  formatter: 'formatter.prompt.md',
  retry: 'retry.prompt.md',
} as const;

@Injectable()
export class PromptManagerService implements PromptManager {
  constructor(private readonly configService: ConfigService) {}

  async getPrompt(name: 'analysis' | 'formatter' | 'retry'): Promise<PromptDefinition> {
    const configuredDir =
      this.configService.get<string>('lessonSummary.promptDir') ||
      LESSON_SUMMARY_PROMPT_DIR;

    const promptPath = join(process.cwd(), configuredDir, PROMPT_FILE_MAP[name]);
    const raw = await readFile(promptPath, 'utf8');

    const parsed = this.parsePrompt(raw);
    return {
      name,
      version: parsed.version,
      content: parsed.content,
    };
  }

  private parsePrompt(raw: string): { version: string; content: string } {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('---')) {
      return { version: 'unversioned', content: trimmed };
    }

    const closing = trimmed.indexOf('\n---', 3);
    if (closing < 0) {
      return { version: 'unversioned', content: trimmed };
    }

    const header = trimmed.slice(3, closing).trim();
    const body = trimmed.slice(closing + 4).trim();
    const versionLine = header
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('version:'));

    const version = versionLine?.split(':')[1]?.trim() || 'unversioned';
    return { version, content: body };
  }
}
