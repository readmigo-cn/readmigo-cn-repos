import crypto from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { type LLMProvider, createProvider } from '@readmigo-cn/llm-adapter';

import type { ChatRequestDto } from './dto/chat-request.dto.js';
import type { ContentQaDto } from './dto/content-qa.dto.js';
import type { ExplainWordDto } from './dto/explain.dto.js';
import type { ExplainWordRequestDto } from './dto/explain-word.dto.js';
import type { TranslateDto } from './dto/translate.dto.js';
import type { TranslateSentenceDto } from './dto/translate-sentence.dto.js';
import type { AiConversationKind } from './entities/ai-conversation.entity.js';
import { AiConversationEntity } from './entities/ai-conversation.entity.js';
import { AiMessageEntity } from './entities/ai-message.entity.js';
import { AiCacheEntity } from './entities/ai-cache.entity.js';
import { AiQuotaEntity } from './entities/ai-quota.entity.js';
import { buildExplainWordPrompt } from './prompts/explain-word.prompt.js';
import { buildTranslatePrompt } from './prompts/translate.prompt.js';
import { buildContentQaPrompt } from './prompts/content-qa.prompt.js';

// ---- Quota defaults (free tier; subscription tiers wired in W6) --------
const QUOTA_DAILY_LIMITS: Record<AiConversationKind, number> = {
  'word-explain': 100,
  'sentence-translate': 50,
  'content-qa': 20,
  'grammar-help': 30,
};

// ---- Helpers types -------------------------------------------------------
type SseSink = Subject<{ data: string }>;

// ---- Provider order for round-robin selection ---------------------------
const PROVIDER_ORDER: Array<'deepseek' | 'qwen' | 'zhipu'> = [
  'deepseek',
  'qwen',
  'zhipu',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(AiConversationEntity)
    private readonly conversationRepo: Repository<AiConversationEntity>,
    @InjectRepository(AiMessageEntity)
    private readonly messageRepo: Repository<AiMessageEntity>,
    @InjectRepository(AiCacheEntity)
    private readonly cacheRepo: Repository<AiCacheEntity>,
    @InjectRepository(AiQuotaEntity)
    private readonly quotaRepo: Repository<AiQuotaEntity>,
  ) {}

  // =========================================================================
  // Provider selection
  // =========================================================================

  /** Round-robin: pick first provider whose env key is present. Falls back to deepseek stub that will throw at call time. */
  private _chooseProvider(_kind: AiConversationKind): LLMProvider {
    const envKeys: Record<string, string> = {
      deepseek: 'DEEPSEEK_API_KEY',
      qwen: 'QWEN_API_KEY',
      zhipu: 'ZHIPU_API_KEY',
    };
    const envBaseUrls: Record<string, string> = {
      deepseek: 'DEEPSEEK_BASE_URL',
      qwen: 'QWEN_BASE_URL',
      zhipu: 'ZHIPU_BASE_URL',
    };
    const defaultModels: Record<string, string> = {
      deepseek: 'deepseek-chat',
      qwen: 'qwen-plus',
      zhipu: 'glm-4',
    };

    for (const name of PROVIDER_ORDER) {
      const apiKey = this.cfg.get<string>(envKeys[name]);
      if (apiKey) {
        return createProvider(name, {
          name,
          apiKey,
          baseUrl: this.cfg.get<string>(envBaseUrls[name]),
          defaultModel: this.cfg.get<string>(`${name.toUpperCase()}_DEFAULT_MODEL`, defaultModels[name]),
          timeoutMs: 30_000,
        });
      }
    }

    throw new ServiceUnavailableException('no_llm_provider_configured');
  }

  /** Legacy single-provider getter kept for backward-compat with chat/translate/explainWordStream. */
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

  // =========================================================================
  // Cache helpers
  // =========================================================================

  _buildCacheKey(kind: string, normalizedInput: string): string {
    return crypto.createHash('sha256').update(`${kind}|${normalizedInput}`).digest('hex');
  }

  async _writeCache(
    cacheKey: string,
    kind: AiConversationKind,
    response: string,
    provider: string,
  ): Promise<void> {
    try {
      await this.cacheRepo
        .createQueryBuilder()
        .insert()
        .into(AiCacheEntity)
        .values({ cacheKey, kind, response, provider, hitCount: 1 })
        .orIgnore()
        .execute();
    } catch (err) {
      // Non-fatal — a duplicate key race is fine
      this.logger.warn(`_writeCache skipped: ${(err as Error).message}`);
    }
  }

  async _getCachedOrFetch(
    cacheKey: string,
    kind: AiConversationKind,
    fetcher: () => Promise<string>,
  ): Promise<{ response: string; fromCache: boolean; provider: string }> {
    const hit = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (hit) {
      await this.cacheRepo.increment({ cacheKey }, 'hitCount', 1);
      return { response: hit.response, fromCache: true, provider: hit.provider ?? 'cached' };
    }

    const response = await fetcher();
    const provider = this._chooseProvider(kind).name;
    await this._writeCache(cacheKey, kind, response, provider);
    return { response, fromCache: false, provider };
  }

  // =========================================================================
  // Quota helpers
  // =========================================================================

  private _dailyResetAt(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }

  async _checkQuota(userId: string, kind: AiConversationKind): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const row = await this.quotaRepo.findOne({
      where: { userId, period: 'daily', kind },
    });

    // Quota row does not exist yet — first call today, allowed
    if (!row) return;

    // If resetAt has passed the current time, the window expired; allow and let _incrementQuota reset it
    if (row.resetAt <= new Date()) return;

    const limit = row.limit ?? QUOTA_DAILY_LIMITS[kind] ?? 50;
    if (row.count >= limit) {
      throw new ForbiddenException('quota_exceeded');
    }
  }

  async _incrementQuota(userId: string, kind: AiConversationKind): Promise<void> {
    const resetAt = this._dailyResetAt();
    const limit = QUOTA_DAILY_LIMITS[kind] ?? 50;

    // Upsert: insert with count=1 on first call; on conflict (userId, period, kind) increment
    await this.quotaRepo
      .createQueryBuilder()
      .insert()
      .into(AiQuotaEntity)
      .values({
        userId,
        period: 'daily',
        kind,
        count: 1,
        limit,
        resetAt,
      })
      .orUpdate(['count', 'resetAt'], ['userId', 'period', 'kind'])
      .setParameter('count', () => 'ai_quotas.count + 1')
      .execute()
      .catch(async () => {
        // Fallback if dialect doesn't support the shorthand: manual read-then-write
        const existing = await this.quotaRepo.findOne({ where: { userId, period: 'daily', kind } });
        if (existing) {
          // Reset window if expired
          if (existing.resetAt <= new Date()) {
            await this.quotaRepo.update(existing.id, { count: 1, resetAt, limit });
          } else {
            await this.quotaRepo.increment({ id: existing.id }, 'count', 1);
          }
        } else {
          await this.quotaRepo.save(
            this.quotaRepo.create({ userId, period: 'daily', kind, count: 1, limit, resetAt }),
          );
        }
      });
  }

  // =========================================================================
  // Conversation / message persistence
  // =========================================================================

  async _persistConversation(
    userId: string,
    kind: AiConversationKind,
    opts: { bookId?: string | null; chapterIndex?: number | null; title: string },
  ): Promise<AiConversationEntity> {
    return this.conversationRepo.save(
      this.conversationRepo.create({
        userId,
        kind,
        bookId: opts.bookId ?? null,
        chapterIndex: opts.chapterIndex ?? null,
        title: opts.title,
      }),
    );
  }

  async _persistMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    provider: string | null,
    model: string | null,
    totalTokens: number,
  ): Promise<AiMessageEntity> {
    return this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        role,
        content,
        provider: (provider as AiMessageEntity['provider']) ?? null,
        model,
        totalTokens,
      }),
    );
  }

  // =========================================================================
  // Public: legacy chat (backward-compat)
  // =========================================================================

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

  // =========================================================================
  // Public: translate (legacy + new)
  // =========================================================================

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

  async translateSentence(
    userId: string,
    dto: TranslateSentenceDto,
  ): Promise<{ translated: string; fromCache: boolean }> {
    await this._checkQuota(userId, 'sentence-translate');

    const cacheKey = this._buildCacheKey(
      'sentence-translate',
      `${dto.sourceLang}|${dto.targetLang}|${dto.sentence.trim()}`,
    );

    const { response, fromCache } = await this._getCachedOrFetch(
      cacheKey,
      'sentence-translate',
      async () => {
        const provider = this._chooseProvider('sentence-translate');
        const { system, user } = buildTranslatePrompt({
          text: dto.sentence,
          from: dto.sourceLang === 'auto' ? 'en' : dto.sourceLang,
          to: dto.targetLang,
        });
        const result = await provider.chat(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          { temperature: 0.1, maxTokens: 1024 },
        );
        return result.content.trim();
      },
    );

    await this._incrementQuota(userId, 'sentence-translate');

    const conv = await this._persistConversation(userId, 'sentence-translate', {
      bookId: dto.bookId ?? null,
      title: dto.sentence.slice(0, 80),
    });
    await this._persistMessage(conv.id, 'user', dto.sentence, null, null, 0);
    await this._persistMessage(conv.id, 'assistant', response, null, null, 0);

    return { translated: response, fromCache };
  }

  async translateSentenceStream(
    userId: string,
    dto: TranslateSentenceDto,
    sseSink: SseSink,
  ): Promise<void> {
    await this._checkQuota(userId, 'sentence-translate');

    const provider = this._chooseProvider('sentence-translate');
    if (!provider.streamComplete) {
      throw new ServiceUnavailableException('provider_no_streaming');
    }

    const { system, user } = buildTranslatePrompt({
      text: dto.sentence,
      from: dto.sourceLang === 'auto' ? 'en' : dto.sourceLang,
      to: dto.targetLang,
    });

    let full = '';
    const stream = provider.streamComplete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.1, maxTokens: 1024 },
    );

    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          full += chunk.content;
          sseSink.next({ data: JSON.stringify({ delta: chunk.content }) });
        }
        if (chunk.done) break;
      }
      sseSink.next({ data: JSON.stringify({ done: true }) });
    } catch (err) {
      sseSink.next({ data: JSON.stringify({ error: (err as Error).message }) });
    } finally {
      sseSink.complete();
    }

    await this._incrementQuota(userId, 'sentence-translate');

    const cacheKey = this._buildCacheKey(
      'sentence-translate',
      `${dto.sourceLang}|${dto.targetLang}|${dto.sentence.trim()}`,
    );
    await this._writeCache(cacheKey, 'sentence-translate', full, provider.name);

    const conv = await this._persistConversation(userId, 'sentence-translate', {
      bookId: dto.bookId ?? null,
      title: dto.sentence.slice(0, 80),
    });
    await this._persistMessage(conv.id, 'user', dto.sentence, null, null, 0);
    await this._persistMessage(conv.id, 'assistant', full, provider.name, null, 0);
  }

  // =========================================================================
  // Public: explain word (legacy stream + new sync + new stream)
  // =========================================================================

  /** Legacy streaming generator kept for backward-compat. */
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

  async explainWord(
    userId: string,
    dto: ExplainWordRequestDto,
  ): Promise<{ explanation: string; fromCache: boolean }> {
    await this._checkQuota(userId, 'word-explain');

    const locale = dto.locale ?? 'zh-CN';
    const cefrLevel = dto.cefrLevel ?? 'B1';
    const cacheKey = this._buildCacheKey(
      'word-explain',
      `${dto.word.toLowerCase()}|${dto.context.trim()}|${locale}|${cefrLevel}`,
    );

    const { response, fromCache } = await this._getCachedOrFetch(
      cacheKey,
      'word-explain',
      async () => {
        const provider = this._chooseProvider('word-explain');
        const { system, user } = buildExplainWordPrompt({ word: dto.word, context: dto.context, locale, cefrLevel });
        const result = await provider.chat(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          { temperature: 0.2, maxTokens: 512 },
        );
        return result.content.trim();
      },
    );

    await this._incrementQuota(userId, 'word-explain');

    const conv = await this._persistConversation(userId, 'word-explain', {
      bookId: dto.bookId ?? null,
      title: `Word: ${dto.word}`,
    });
    await this._persistMessage(conv.id, 'user', `${dto.word}\n${dto.context}`, null, null, 0);
    await this._persistMessage(conv.id, 'assistant', response, null, null, 0);

    return { explanation: response, fromCache };
  }

  async explainWordStreamNew(
    userId: string,
    dto: ExplainWordRequestDto,
    sseSink: SseSink,
  ): Promise<void> {
    await this._checkQuota(userId, 'word-explain');

    const provider = this._chooseProvider('word-explain');
    if (!provider.streamComplete) {
      throw new ServiceUnavailableException('provider_no_streaming');
    }

    const locale = dto.locale ?? 'zh-CN';
    const cefrLevel = dto.cefrLevel ?? 'B1';
    const { system, user } = buildExplainWordPrompt({ word: dto.word, context: dto.context, locale, cefrLevel });

    let full = '';
    const stream = provider.streamComplete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.2, maxTokens: 512 },
    );

    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          full += chunk.content;
          sseSink.next({ data: JSON.stringify({ delta: chunk.content }) });
        }
        if (chunk.done) break;
      }
      sseSink.next({ data: JSON.stringify({ done: true }) });
    } catch (err) {
      sseSink.next({ data: JSON.stringify({ error: (err as Error).message }) });
    } finally {
      sseSink.complete();
    }

    await this._incrementQuota(userId, 'word-explain');

    const cacheKey = this._buildCacheKey(
      'word-explain',
      `${dto.word.toLowerCase()}|${dto.context.trim()}|${locale}|${cefrLevel}`,
    );
    await this._writeCache(cacheKey, 'word-explain', full, provider.name);

    const conv = await this._persistConversation(userId, 'word-explain', {
      bookId: dto.bookId ?? null,
      title: `Word: ${dto.word}`,
    });
    await this._persistMessage(conv.id, 'user', `${dto.word}\n${dto.context}`, null, null, 0);
    await this._persistMessage(conv.id, 'assistant', full, provider.name, null, 0);
  }

  // =========================================================================
  // Public: content Q&A (stream only — responses can be long)
  // =========================================================================

  async contentQA(
    userId: string,
    dto: ContentQaDto,
    sseSink: SseSink,
  ): Promise<void> {
    await this._checkQuota(userId, 'content-qa');

    const provider = this._chooseProvider('content-qa');
    if (!provider.streamComplete) {
      throw new ServiceUnavailableException('provider_no_streaming');
    }

    // Build message history: if conversationId provided, fetch prior messages
    const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (dto.conversationId) {
      const prior = await this.messageRepo.find({
        where: { conversationId: dto.conversationId },
        order: { createdAt: 'ASC' },
        take: 20,
      });
      for (const m of prior) {
        priorMessages.push({ role: m.role, content: m.content });
      }
    }

    const { system, user } = buildContentQaPrompt({
      bookId: dto.bookId,
      chapterIndex: dto.chapterIndex,
      question: dto.question,
    });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
      ...priorMessages,
      { role: 'user', content: user },
    ];

    let full = '';
    const stream = provider.streamComplete(messages, { temperature: 0.4, maxTokens: 1024 });

    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          full += chunk.content;
          sseSink.next({ data: JSON.stringify({ delta: chunk.content }) });
        }
        if (chunk.done) break;
      }
      sseSink.next({ data: JSON.stringify({ done: true }) });
    } catch (err) {
      sseSink.next({ data: JSON.stringify({ error: (err as Error).message }) });
    } finally {
      sseSink.complete();
    }

    await this._incrementQuota(userId, 'content-qa');

    // Persist or extend conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this._persistConversation(userId, 'content-qa', {
        bookId: dto.bookId,
        chapterIndex: dto.chapterIndex,
        title: dto.question.slice(0, 80),
      });
      conversationId = conv.id;
    }
    await this._persistMessage(conversationId, 'user', dto.question, null, null, 0);
    await this._persistMessage(conversationId, 'assistant', full, provider.name, null, 0);
  }

  // =========================================================================
  // Public: conversation management
  // =========================================================================

  async listConversations(userId: string, kind?: AiConversationKind) {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .where('c.userId = :userId', { userId })
      .orderBy('c.updatedAt', 'DESC')
      .take(50);

    if (kind) {
      qb.andWhere('c.kind = :kind', { kind });
    }

    return qb.getMany();
  }

  async getConversation(userId: string, id: string, withMessages = false) {
    const conv = await this.conversationRepo.findOne({ where: { id, userId } });
    if (!conv) throw new NotFoundException('conversation_not_found');

    if (!withMessages) return { ...conv, messages: undefined };

    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
    return { ...conv, messages };
  }

  async deleteConversation(userId: string, id: string): Promise<void> {
    const conv = await this.conversationRepo.findOne({ where: { id, userId } });
    if (!conv) throw new NotFoundException('conversation_not_found');

    await this.messageRepo.delete({ conversationId: id });
    await this.conversationRepo.delete({ id });
  }

  // =========================================================================
  // Public: quota status
  // =========================================================================

  async getQuotaStatus(userId: string) {
    const rows = await this.quotaRepo.find({ where: { userId, period: 'daily' } });
    const now = new Date();

    const result: Record<string, { used: number; limit: number; resetAt: Date }> = {};
    for (const kind of Object.keys(QUOTA_DAILY_LIMITS) as AiConversationKind[]) {
      const row = rows.find((r: AiQuotaEntity) => r.kind === kind);
      if (!row || row.resetAt <= now) {
        result[kind] = { used: 0, limit: QUOTA_DAILY_LIMITS[kind], resetAt: this._dailyResetAt() };
      } else {
        result[kind] = { used: row.count, limit: row.limit ?? QUOTA_DAILY_LIMITS[kind], resetAt: row.resetAt };
      }
    }

    return result;
  }
}
