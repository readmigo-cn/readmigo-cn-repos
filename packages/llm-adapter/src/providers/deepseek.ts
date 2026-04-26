import type { LLMProvider } from '../provider';
import type { ChatMessage, ChatOptions, ChatResult, ProviderConfig } from '../types';

interface OpenAICompatibleChoice {
  finish_reason?: string;
  message?: {
    content?: string;
  };
}

interface OpenAICompatibleResponse {
  id?: string;
  model?: string;
  choices?: OpenAICompatibleChoice[];
}

export class DeepSeekProvider implements LLMProvider {
  constructor(private readonly config: ProviderConfig) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? 30_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model ?? this.config.defaultModel,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek request failed: ${response.status} ${errorText}`);
      }

      const payload = (await response.json()) as OpenAICompatibleResponse;
      const choice = payload.choices?.[0];
      const content = choice?.message?.content?.trim();

      if (!content) {
        throw new Error('DeepSeek response did not contain message content');
      }

      return {
        id: payload.id ?? 'deepseek-chat',
        model: payload.model ?? options.model ?? this.config.defaultModel,
        content,
        finishReason: choice?.finish_reason,
        raw: payload,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
