import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, Subject } from 'rxjs';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { AiService } from './ai.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { ContentQaDto } from './dto/content-qa.dto.js';
import { ExplainWordDto } from './dto/explain.dto.js';
import { ExplainWordRequestDto } from './dto/explain-word.dto.js';
import { GrammarHelpDto } from './dto/grammar-help.dto.js';
import { ListConversationsDto } from './dto/list-conversations.dto.js';
import { TranslateDto } from './dto/translate.dto.js';
import { TranslateSentenceDto } from './dto/translate-sentence.dto.js';

interface SseMessageEvent {
  data: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // =========================================================================
  // Legacy: raw chat passthrough (no auth, no quota — internal/debug)
  // =========================================================================

  @Post('chat')
  @ApiOperation({ summary: '原始 LLM 对话（内部调试用）' })
  @ApiResponse({ status: 200, description: 'LLM 回复' })
  async chat(@Body() payload: ChatRequestDto) {
    return this.ai.chat(payload);
  }

  // =========================================================================
  // Legacy: translate (no auth — keep backward compat)
  // =========================================================================

  @Post('translate')
  @ApiOperation({ summary: '文本翻译（旧接口）' })
  @ApiResponse({ status: 200, description: '翻译结果' })
  async translate(@Body() payload: TranslateDto) {
    return this.ai.translate(payload);
  }

  // =========================================================================
  // Legacy: explain word stream (no auth — keep backward compat)
  // =========================================================================

  @Post('explain/stream')
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ExplainWordDto })
  @ApiOperation({ summary: '划词解释（旧 SSE 流，无鉴权）' })
  @Sse()
  explainStream(@Body() payload: ExplainWordDto): Observable<SseMessageEvent> {
    return new Observable<SseMessageEvent>((subscriber) => {
      void (async () => {
        try {
          for await (const chunk of this.ai.explainWordStream(payload)) {
            subscriber.next({ data: JSON.stringify({ delta: chunk }) });
          }
          subscriber.next({ data: JSON.stringify({ done: true }) });
          subscriber.complete();
        } catch (err) {
          const e = err as Error;
          subscriber.next({ data: JSON.stringify({ error: e.message }) });
          subscriber.complete();
        }
      })();
    });
  }

  // =========================================================================
  // Explain word — sync
  // =========================================================================

  @Post('explain/word')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '划词解释（同步）' })
  @ApiResponse({ status: 200, description: '解释结果 JSON' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  async explainWord(
    @Body() dto: ExplainWordRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ai.explainWord(user.id, dto);
  }

  // =========================================================================
  // Explain word — SSE stream
  // =========================================================================

  @Post('explain/word/stream')
  @UseGuards(JwtAuthGuard)
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ExplainWordRequestDto })
  @ApiOperation({ summary: '划词解释（SSE 流式）' })
  @ApiResponse({ status: 200, description: 'SSE 流，每帧 {delta:string} 或 {done:true}' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  @Sse()
  explainWordStream(
    @Body() dto: ExplainWordRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<SseMessageEvent> {
    const sink = new Subject<SseMessageEvent>();
    void this.ai.explainWordStreamNew(user.id, dto, sink as Subject<{ data: string }>);
    return sink.asObservable();
  }

  // =========================================================================
  // Translate sentence — sync
  // =========================================================================

  @Post('translate/sentence')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '句子翻译（同步，含缓存）' })
  @ApiResponse({ status: 200, description: '翻译结果' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  async translateSentence(
    @Body() dto: TranslateSentenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ai.translateSentence(user.id, dto);
  }

  // =========================================================================
  // Translate sentence — SSE stream
  // =========================================================================

  @Post('translate/sentence/stream')
  @UseGuards(JwtAuthGuard)
  @ApiProduces('text/event-stream')
  @ApiBody({ type: TranslateSentenceDto })
  @ApiOperation({ summary: '句子翻译（SSE 流式）' })
  @ApiResponse({ status: 200, description: 'SSE 流' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  @Sse()
  translateSentenceStream(
    @Body() dto: TranslateSentenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<SseMessageEvent> {
    const sink = new Subject<SseMessageEvent>();
    void this.ai.translateSentenceStream(user.id, dto, sink as Subject<{ data: string }>);
    return sink.asObservable();
  }

  // =========================================================================
  // Grammar help — sync
  // =========================================================================

  @Post('grammar/help')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '语法解释（同步，含缓存）' })
  @ApiResponse({ status: 200, description: '解释结果 JSON' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  async grammarHelp(
    @Body() dto: GrammarHelpDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ai.grammarHelp(user.id, dto);
  }

  // =========================================================================
  // Grammar help — SSE stream
  // =========================================================================

  @Post('grammar/help/stream')
  @UseGuards(JwtAuthGuard)
  @ApiProduces('text/event-stream')
  @ApiBody({ type: GrammarHelpDto })
  @ApiOperation({ summary: '语法解释（SSE 流式）' })
  @ApiResponse({ status: 200, description: 'SSE 流，每帧 {delta:string} 或 {done:true}' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  @Sse()
  grammarHelpStream(
    @Body() dto: GrammarHelpDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<SseMessageEvent> {
    const sink = new Subject<SseMessageEvent>();
    void this.ai.grammarHelpStream(user.id, dto, sink as Subject<{ data: string }>);
    return sink.asObservable();
  }

  // =========================================================================
  // Content Q&A — SSE stream
  // =========================================================================

  @Post('content-qa')
  @UseGuards(JwtAuthGuard)
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ContentQaDto })
  @ApiOperation({ summary: '书籍内容问答（SSE 流式）' })
  @ApiResponse({ status: 200, description: 'SSE 流，每帧 {delta:string} 或 {done:true}' })
  @ApiResponse({ status: 403, description: 'quota_exceeded' })
  @Sse()
  contentQA(
    @Body() dto: ContentQaDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<SseMessageEvent> {
    const sink = new Subject<SseMessageEvent>();
    void this.ai.contentQA(user.id, dto, sink as Subject<{ data: string }>);
    return sink.asObservable();
  }

  // =========================================================================
  // Conversations
  // =========================================================================

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '会话列表（最近 50 条）' })
  @ApiResponse({ status: 200, description: 'AiConversation[]' })
  listConversations(
    @Query() query: ListConversationsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ai.listConversations(user.id, query.kind);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取会话详情（含消息）' })
  @ApiResponse({ status: 200, description: 'AiConversation + messages[]' })
  @ApiResponse({ status: 404, description: 'conversation_not_found' })
  getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ai.getConversation(user.id, id, true);
  }

  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除会话及消息' })
  @ApiResponse({ status: 200, description: '已删除' })
  @ApiResponse({ status: 404, description: 'conversation_not_found' })
  async deleteConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.ai.deleteConversation(user.id, id);
    return { deleted: true };
  }

  // =========================================================================
  // Quota status
  // =========================================================================

  @Get('quota')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '当前用户 AI 配额状态' })
  @ApiResponse({ status: 200, description: '各功能已用/上限/重置时间' })
  getQuota(@CurrentUser() user: CurrentUserPayload) {
    return this.ai.getQuotaStatus(user.id);
  }
}
