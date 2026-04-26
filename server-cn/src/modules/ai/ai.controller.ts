import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AiService } from './ai.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() payload: ChatRequestDto) {
    return this.aiService.chat(payload);
  }
}
