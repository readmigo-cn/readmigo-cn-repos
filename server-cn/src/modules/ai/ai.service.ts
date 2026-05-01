import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type LLMProvider, createProvider } from '@readmigo-cn/llm-adapter';

import type { ChatRequestDto } from './dto/chat-request.dto.js';
import type { ExplainWordDto } from './dto/explain.dto.js';
import type { TranslateDto } from './dto/translate.dto.js';
import { buildExplainWordPrompt } from './prompts/explain-word.prompt.js';
import { buildTranslatePrompt } from './prompts/translate.prompt.js';

@Injectable()
export class AiService {
  constructor(private readonly cfg: ConfigService) {}

  private getProvider(): LLMProvider {
    const apiKey = this.cfg.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured');
    }
    return createProvider('deepseek', {
      name: 'deepseek',
      apiKey,
      baseUrl: this.cfg.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
      defaultModel: this.cfg.get<string>('DEEPSEEK_DEFAULT_MODEL', 'deepseek-chat'),
      timeoutMs: 30_000,
    });
  }

  async chat(payload: ChatRequestDto) {
    const provider = this.getProvider();
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

  async translate(payload: TranslateDto): Promise<{ translated: string }> {
    const provider = this.getProvider();
    const { system, user } = buildTranslatePrompt(payload);
    const result = await provider.chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.1, maxTokens: 1024 },
    );
    return { translated: result.content.trim() };
  }

  /**
   * 流式划词解释。返回一个 AsyncIterable<string>，每条是一个增量内容。
   * Controller 会把它包成 SSE。
   */
  async *explainWordStream(payload: ExplainWordDto): AsyncIterable<string> {
    const provider = this.getProvider();
    if (!provider.streamComplete) {
      throw new ServiceUnavailableException('provider_no_streaming');
    }
    const locale = payload.locale ?? 'zh-CN';
    const cefrLevel = payload.cefrLevel ?? 'B1';
    const { system, user } = buildExplainWordPrompt({
      word: payload.word,
      context: payload.context,
      locale,
      cefrLevel,
    });

    const stream = provider.streamComplete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.2, maxTokens: 512 },
    );

    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content;
      }
      if (chunk.done) return;
    }
  }
}
