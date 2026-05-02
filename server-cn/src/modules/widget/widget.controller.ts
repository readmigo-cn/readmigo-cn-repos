import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { WidgetService } from './widget.service.js';

@ApiTags('widget')
@Controller('widget')
export class WidgetController {
  constructor(private readonly widget: WidgetService) {}

  // ── Legacy public endpoint (no-auth, cached for Android widget) ──────────

  /** GET /widget/daily-word — unauthenticated, pool-based, 24h cache */
  @Get('daily-word')
  @Header('Cache-Control', 'public, max-age=86400')
  dailyWordLegacy() {
    return this.widget.getDailyWordLegacy();
  }

  // ── Auth-required widget endpoints ───────────────────────────────────────

  /**
   * GET /widget/daily-word/me
   * Returns user's next due vocab note; falls back to pool word.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('daily-word/me')
  dailyWord(@CurrentUser() user: CurrentUserPayload) {
    return this.widget.getDailyWord(user.id);
  }

  /** GET /widget/reading-progress — most-recently-read book summary */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('reading-progress')
  readingProgress(@CurrentUser() user: CurrentUserPayload) {
    return this.widget.getReadingProgress(user.id);
  }

  /** GET /widget/ai-tip — one of 7 rotating daily tips */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('ai-tip')
  aiTip(@CurrentUser() user: CurrentUserPayload) {
    return this.widget.getAiTip(user.id);
  }
}
