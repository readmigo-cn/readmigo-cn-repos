import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createProvider } from '@readmigo-cn/llm-adapter';

import type { ChatRequestDto } from './dto/chat-request.dto.js';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async chat(payload: ChatRequestDto) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured');
    }

    const provider = createProvider('deepseek', {
      apiKey,
      baseUrl: this.configService.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
      defaultModel: this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat'),
      timeoutMs: 30_000,
    });

    const result = await provider.chat(payload.messages, {
      model: payload.model,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
    });

    return {
      id: result.id,
      model: result.model,
      content: result.content,
      finishReason: result.finishReason,
    };
  }
}
