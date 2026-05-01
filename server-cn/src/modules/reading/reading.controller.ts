import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { ReadingService } from './reading.service.js';

@ApiTags('reading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reading')
export class ReadingController {
  constructor(private readonly reading: ReadingService) {}

  @Get('progress/:bookId')
  async getProgress(@CurrentUser() user: CurrentUserPayload, @Param('bookId') bookId: string) {
    const row = await this.reading.getProgress(user.id, bookId);
    return row ?? { bookId, position: 0, percent: 0, chapterId: null };
  }

  @Post('progress')
  async upsertProgress(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProgressDto) {
    return this.reading.upsertProgress(
      user.id,
      dto.bookId,
      dto.chapterId ?? null,
      dto.position,
      dto.percent,
    );
  }
}
