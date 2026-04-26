import type { LLMProvider } from '../provider';
import type { ChatMessage, ChatOptions, ChatResult, ProviderConfig } from '../types';

interface WenxinResponse {
  id?: string;
  result?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  finish_reason?: string;
}

/**
 * Wenxin Provider (百度文心一言 - ERNIE Bot)
 * Uses OAuth2 token-based authentication
 */
export class WenxinProvider implements LLMProvider {
  readonly name = 'wenxin';
  readonly models = ['ernie-bot-4', 'ernie-bot-turbo', 'ernie-bot-8k', 'ernie-bot-3.5'];
  
  private apiKey: string;
  private secretKey: string;
  private defaultModel: string;
  private timeoutMs: number;
  private accessToken?: string;
  private tokenExpiresAt?: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey ?? '';
    this.defaultModel = config.defaultModel ?? 'ernie-bot-4';
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  isAvailable(): boolean {
    return !!this.apiKey && !!this.secretKey;
  }

  /**
   * Get OAuth2 access token
   * Token is cached until expiration
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?` +
      `grant_type=client_credentials&` +
      `client_id=${this.apiKey}&` +
      `client_secret=${this.secretKey}`
    );

    if (!response.ok) {
      throw new Error(`Wenxin OAuth2 token request failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Token expires in 30 days, refresh 1 day early
    this.tokenExpiresAt = Date.now() + (data.expires_in - 86400) * 1000;

    return this.accessToken;
  }

  /**
   * Get the API endpoint for a specific model
   */
  private getModelEndpoint(model: string): string {
    const modelMap: Record<string, string> = {
      'ernie-bot-4': 'ernie_bot_4',
      'ernie-bot-turbo': 'ernie_bot_turbo',
      'ernie-bot-8k': 'ernie_bot_8k',
      'ernie-bot-3.5': 'ernie_bot_3_5',
    };
    return modelMap[model] || 'ernie_bot_4';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const accessToken = await this.getAccessToken();
      const model = options.model ?? this.defaultModel;
      const endpoint = this.getModelEndpoint(model);

      const response = await fetch(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${endpoint}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            temperature: options.temperature ?? 0.7,
            max_output_tokens: options.maxTokens ?? 2048,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Wenxin request failed: ${response.status} ${errorText}`);
      }

      const payload = (await response.json()) as WenxinResponse;
      const content = payload.result ?? '';

      if (!content) {
        throw new Error('Wenxin response did not contain result');
      }

      return {
        id: payload.id ?? 'wenxin-chat',
        model,
        content,
        finishReason: payload.finish_reason,
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

  /**
   * Note: Wenxin streaming is not yet implemented
   * The provider will fall back to non-streaming mode
   */
  async *streamComplete(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    // Fallback to non-streaming for now
    // TODO: Implement Wenxin streaming API
    const result = await this.chat(messages, options);
    yield { content: result.content, done: true };
  }
}
