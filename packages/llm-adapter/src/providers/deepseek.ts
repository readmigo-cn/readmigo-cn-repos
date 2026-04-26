import type { LLMProvider } from '../provider';
import type { ChatMessage, ChatOptions, ChatResult, StreamChunk, ProviderConfig } from '../types';

interface DeepSeekChoice {
  finish_reason?: string;
  message?: {
    content?: string;
    role?: string;
  };
  delta?: {
    content?: string;
    role?: string;
  };
}

interface DeepSeekResponse {
  id?: string;
  model?: string;
  choices?: DeepSeekChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';
  readonly models = ['deepseek-chat', 'deepseek-coder', 'deepseek-v3'];
  
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1';
    this.defaultModel = config.defaultModel ?? 'deepseek-chat';
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model ?? this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.2, // Low temp for educational content
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek request failed: ${response.status} ${errorText}`);
      }

      const payload = (await response.json()) as DeepSeekResponse;
      const choice = payload.choices?.[0];
      const content = choice?.message?.content?.trim();

      if (!content) {
        throw new Error('DeepSeek response did not contain message content');
      }

      return {
        id: payload.id ?? 'deepseek-chat',
        model: payload.model ?? options.model ?? this.defaultModel,
        content,
        finishReason: choice?.finish_reason,
        usage: {
          promptTokens: payload.usage?.prompt_tokens ?? 0,
          completionTokens: payload.usage?.completion_tokens ?? 0,
          totalTokens: payload.usage?.total_tokens ?? 0,
        },
        raw: payload,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamComplete(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model ?? this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2048,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`DeepSeek streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body for streaming');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            
            // End of stream
            if (data === '[DONE]') {
              yield { content: '', done: true, inputTokens, outputTokens };
              return;
            }

            try {
              const parsed = JSON.parse(data) as DeepSeekResponse;
              
              // Capture usage stats (usually in last chunk)
              if (parsed.usage) {
                inputTokens = parsed.usage.prompt_tokens;
                outputTokens = parsed.usage.completion_tokens;
              }
              
              const delta = parsed.choices?.[0]?.delta;
              const content = delta?.content ?? '';
              
              if (content) {
                yield { content, done: false };
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      yield { content: '', done: true, inputTokens, outputTokens };
    } finally {
      clearTimeout(timeout);
    }
  }
}
