import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LESSON_SUMMARY_AI_TIMEOUT_MS, LESSON_SUMMARY_MAX_RETRIES } from '../constants/lesson-summary.constants';
import type { AIExecutionOptions, AIExecutionResult, AIProvider, AIProviderMessage } from '../interfaces/ai-provider.interface';
import { ContextTooLargeError, InsufficientCreditsError } from '../errors/ai-execution.errors';


@Injectable()
export class AIProviderAdapter implements AIProvider {
  private readonly logger = new Logger(AIProviderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async chatCompletion(
    messages: AIProviderMessage[],
    options?: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const defaultProvider = this.configService.get<string>('lessonSummary.aiProvider') || 'openrouter';
    const provider = options?.provider || defaultProvider;
    
    if (provider === 'google') {
      return this.googleGenAiChatCompletion(messages, options);
    }

    if (provider === 'nvidia') {
      return this.nvidiaChatCompletion(messages, options);
    }

    if (provider === 'openrouter') {
      return this.openRouterChatCompletion(messages, options);
    }
    
    // Future providers can be added here
    throw new ServiceUnavailableException(`Unsupported AI provider: ${provider}`);
  }

  private async googleGenAiChatCompletion(
    messages: AIProviderMessage[],
    options?: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Google Gemini API Key is not configured');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    let model = options?.model || 'gemini-2.5-flash';
    if (model.startsWith('google/')) {
      model = model.replace('google/', '');
    }

    const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');

    let maxTokens = options?.maxTokens;
    if (!maxTokens) {
       const totalInputChars = messages.reduce((acc, curr) => acc + curr.content.length, 0);
       const inputTokensApprox = Math.ceil(totalInputChars / 4);
       maxTokens = options?.expectedTokens || 1500;
    }

    const config: any = {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: maxTokens,
    };

    if (systemMessages) {
      config.systemInstruction = systemMessages;
    }

    if (options?.responseFormat === 'json_object') {
      config.responseMimeType = 'application/json';
    }

    for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
      const started = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userMessages,
          config,
        });

        const content = response.text;
        if (!content || !content.trim()) {
          throw new Error('Empty model response content');
        }

        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        const estimatedCost = this.estimateCost(inputTokens, outputTokens);

        return {
          content,
          metrics: {
            model: `google/${model}`,
            inputTokens,
            outputTokens,
            estimatedCost,
            executionTimeMs: Date.now() - started,
          },
        };
      } catch (error: any) {
        const errMsg = error?.message || 'Google Gen AI error';
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('429')) {
          if (attempt === LESSON_SUMMARY_MAX_RETRIES) throw new InsufficientCreditsError(errMsg);
        } else if (errMsg.toLowerCase().includes('context') || errMsg.toLowerCase().includes('token')) {
          throw new ContextTooLargeError(errMsg);
        } else if (attempt === LESSON_SUMMARY_MAX_RETRIES) {
          throw new Error(errMsg);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
    
    throw new Error('Unexpected exit from retry loop');
  }

  private async nvidiaChatCompletion(
    messages: AIProviderMessage[],
    options?: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('NVIDIA API Key is not configured');
    }

    const model = options?.model || 'meta/llama-3.1-70b-instruct';
    const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

    let maxTokens = options?.maxTokens;
    if (!maxTokens) {
       const totalInputChars = messages.reduce((acc, curr) => acc + curr.content.length, 0);
       const inputTokensApprox = Math.ceil(totalInputChars / 4);
       maxTokens = options?.expectedTokens || 1500;
    }

    const payload = {
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: maxTokens,
    };

    if (options?.responseFormat === 'json_object') {
      // Typically NIM supports response_format
      (payload as any).response_format = { type: 'json_object' };
    }

    for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
      const started = Date.now();
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), LESSON_SUMMARY_AI_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        const body = await response.json();
        if (!response.ok) {
          const errMsg = body?.detail || body?.error?.message || `NVIDIA HTTP ${response.status}`;
          if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('429')) {
            throw new InsufficientCreditsError(errMsg);
          }
          if (errMsg.toLowerCase().includes('context') || errMsg.toLowerCase().includes('length')) {
            throw new ContextTooLargeError(errMsg);
          }
          throw new Error(errMsg);
        }

        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('Empty model response content');
        }

        const inputTokens = Number(body?.usage?.prompt_tokens || 0);
        const outputTokens = Number(body?.usage?.completion_tokens || 0);
        const estimatedCost = this.estimateCost(inputTokens, outputTokens);

        return {
          content,
          metrics: {
            model: `nvidia/${model}`,
            inputTokens,
            outputTokens,
            estimatedCost,
            executionTimeMs: Date.now() - started,
          },
        };
      } catch (error: any) {
        clearTimeout(timer);
        const isAbort = error.name === 'AbortError';
        const errMsg = isAbort ? 'AI request timed out' : (error.message || 'Unknown error');
        
        if (error instanceof InsufficientCreditsError || error instanceof ContextTooLargeError) {
          throw error;
        }

        if (attempt === LESSON_SUMMARY_MAX_RETRIES) {
          this.logger.error(`NVIDIA API call failed after ${attempt} attempts: ${errMsg}`);
          throw new Error(`AI Request failed: ${errMsg}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error('Unexpected exit from retry loop');
  }

  private async openRouterChatCompletion(
    messages: AIProviderMessage[],
    options?: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const apiKey = this.configService.get<string>('lessonSummary.openRouterApiKey');
    const endpoint = this.configService.get<string>('lessonSummary.openRouterEndpoint');

    if (!apiKey || !endpoint) {
      throw new ServiceUnavailableException('OpenRouter is not configured');
    }

    const model = options?.model || this.configService.get<string>('lessonSummary.analysisModel') || 'google/gemini-2.5-flash';
    
    // Calculate adaptive max_tokens based on input size if not explicitly set
    let maxTokens = options?.maxTokens;
    if (!maxTokens) {
       const totalInputChars = messages.reduce((acc, curr) => acc + curr.content.length, 0);
       // Rough estimate: 4 chars ~ 1 token
       const inputTokensApprox = Math.ceil(totalInputChars / 4);
       
       // Dynamic token budget: Ask for exactly what is expected or minimum safe budget
       const budget = options?.expectedTokens || 1500;
       
       // Ensure we don't ask for a crazy amount if it's not needed, avoiding credit limits
       maxTokens = budget;
    }

    const payload = {
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      response_format: options?.responseFormat ? { type: options.responseFormat } : { type: 'json_object' },
      max_tokens: maxTokens,
    };

    for (let attempt = 1; attempt <= LESSON_SUMMARY_MAX_RETRIES; attempt += 1) {
      const started = Date.now();
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), LESSON_SUMMARY_AI_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        const body = await response.json();
        if (!response.ok) {
          const errMsg = body?.error?.message || `OpenRouter HTTP ${response.status}`;
          if (errMsg.toLowerCase().includes('credits') || errMsg.toLowerCase().includes('afford')) {
            throw new InsufficientCreditsError(errMsg);
          }
          if (errMsg.toLowerCase().includes('context') || errMsg.toLowerCase().includes('length')) {
            throw new ContextTooLargeError(errMsg);
          }
          throw new Error(errMsg);
        }

        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('Empty model response content');
        }

        const inputTokens = Number(body?.usage?.prompt_tokens || 0);
        const outputTokens = Number(body?.usage?.completion_tokens || 0);
        const estimatedCost = this.estimateCost(inputTokens, outputTokens);

        return {
          content,
          metrics: {
            model,
            inputTokens,
            outputTokens,
            estimatedCost,
            executionTimeMs: Date.now() - started,
          },
        };
      } catch (error) {
        if (error instanceof InsufficientCreditsError || error instanceof ContextTooLargeError) {
          // Immediately throw credit and context errors so the calling engine can adapt chunk sizes!
          throw error;
        }

        if (attempt === LESSON_SUMMARY_MAX_RETRIES) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`OpenRouter call failed after ${attempt} attempts: ${errMsg}`, error instanceof Error ? error.stack : undefined);
          throw new ServiceUnavailableException(`AI model did not return a valid response: ${errMsg}`);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ServiceUnavailableException('AI call failed');
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    const inputUnit = 0.0000015;
    const outputUnit = 0.0000025;
    return Number((inputTokens * inputUnit + outputTokens * outputUnit).toFixed(6));
  }
}
