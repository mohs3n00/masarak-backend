import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentFormattingAgent } from '../interfaces/lesson-summary.interfaces';
import { AnalysisOutput, DocumentModel } from '../types/lesson-summary.types';
import { parseStrictJson, validateDocumentModel } from './lesson-summary.validators';
import { AIProviderAdapter } from './ai-provider.adapter';
import { LESSON_SUMMARY_MAX_RETRIES } from '../constants/lesson-summary.constants';
import { PromptManagerService } from './prompt-manager.service';
import { ContextTooLargeError, InsufficientCreditsError } from '../errors/ai-execution.errors';

@Injectable()
export class DocumentFormattingAgentService implements DocumentFormattingAgent {
  constructor(
    private readonly aiProvider: AIProviderAdapter,
    private readonly configService: ConfigService,
    private readonly promptManager: PromptManagerService,
  ) {}

  async buildDocumentModel(input: AnalysisOutput): Promise<{
    output: DocumentModel;
    promptVersion: string;
    metrics: {
      model: string;
      inputTokens: number;
      outputTokens: number;
      estimatedCost: number;
      executionTimeMs: number;
    };
  }> {
    const models = [
      this.configService.get<string>('lessonSummary.formatterModel') || 'openai/gpt-oss-120b:free',
      this.configService.get<string>('lessonSummary.formatterFallbackModel') || 'openrouter/free',
    ];
    const prompt = await this.promptManager.getPrompt('formatter');

    let lastError: unknown;
    
    // Calculate expected tokens dynamically
    const inputSizeChars = JSON.stringify(input).length;
    let expectedTokens = 8000;
    if (inputSizeChars < 10000) expectedTokens = 6000;
    if (inputSizeChars < 5000) expectedTokens = 4000;

    for (const model of models) {
      for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
        try {
          const response = await this.aiProvider.chatCompletion(
            [
              { role: 'system', content: prompt.content },
              { role: 'user', content: JSON.stringify(input) },
            ],
            {
               model,
               expectedTokens, // Cost optimizer
            }
          );
          
          const parsed = parseStrictJson<DocumentModel>(response.content);
          if (validateDocumentModel(parsed)) return { output: parsed, promptVersion: prompt.version, metrics: response.metrics };
          lastError = new Error('Invalid document model JSON from formatter');
        } catch (error) {
          if (error instanceof InsufficientCreditsError || error instanceof ContextTooLargeError) {
             // If we hit limits, try to dramatically lower expectedTokens to squeeze it through
             // if it's credit error. If it's context error, we can't do much in formatting except fail.
             if (error instanceof InsufficientCreditsError) {
                expectedTokens = Math.max(500, Math.floor(expectedTokens / 2));
             } else {
                throw error; // Bubble up context error
             }
          }
          lastError = error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Formatter validation failed');
  }
}
