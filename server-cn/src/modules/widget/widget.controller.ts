import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { WidgetService } from './widget.service.js';

@ApiTags('widget')
@Controller('widget')
export class WidgetController {
  constructor(private readonly widget: WidgetService) {}

  @Get('daily-word')
  @Header('Cache-Control', 'public, max-age=86400')
  dailyWord() {
    return this.widget.getDailyWord();
  }
}
