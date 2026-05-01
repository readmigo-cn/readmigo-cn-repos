import { Body, Controller, Post, Sse } from '@nestjs/common';
import { ApiBody, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { AiService } from './ai.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { ExplainWordDto } from './dto/explain.dto.js';
import { TranslateDto } from './dto/translate.dto.js';

interface SseMessageEvent {
  data: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  async chat(@Body() payload: ChatRequestDto) {
    return this.ai.chat(payload);
  }

  @Post('translate')
  async translate(@Body() payload: TranslateDto) {
    return this.ai.translate(payload);
  }

  @Post('explain/stream')
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ExplainWordDto })
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
}
