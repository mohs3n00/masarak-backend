export interface AIExecutionOptions {
  provider?: 'google' | 'openrouter' | 'nvidia';
  model?: string;
  fallbackModel?: string;
  expectedTokens?: number; // Minimum safe tokens needed for output
  maxTokens?: number; // Absolute max limit, calculated dynamically if not provided
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface AIProviderMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AIExecutionResult {
  content: string;
  metrics: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    executionTimeMs: number;
  };
}

export interface AIProvider {
  /**
   * Main completion method. Must adapt dynamically to token budgets,
   * handle errors (like Insufficient Credits/Context too large), 
   * and potentially fall back if needed.
   */
  chatCompletion(
    messages: AIProviderMessage[],
    options?: AIExecutionOptions,
  ): Promise<AIExecutionResult>;
}
