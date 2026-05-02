import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { SessionEndDto, SessionStartDto } from './dto/session.dto.js';
import { CreateHighlightDto, ListHighlightsDto, UpdateHighlightDto } from './dto/highlight.dto.js';
import { ReadingService } from './reading.service.js';

@ApiTags('reading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reading')
export class ReadingController {
  constructor(private readonly reading: ReadingService) {}

  // ---- Progress ----

  @Get('progress/:bookId')
  @ApiOperation({ summary: 'Get reading progress for a book' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Progress record or zeroed default' })
  async getProgress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
  ) {
    const row = await this.reading.getProgress(user.id, bookId);
    return row ?? {
      bookId,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      scrollOffset: 0,
      percentComplete: 0,
      lastReadAt: null,
    };
  }

  @Put('progress/:bookId')
  @ApiOperation({ summary: 'Upsert reading progress (idempotent)' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Updated progress record' })
  updateProgress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.reading.updateProgress(user.id, bookId, dto);
  }

  // ---- Sessions ----

  @Post('sessions/start')
  @ApiOperation({ summary: 'Start a new reading session' })
  @ApiResponse({ status: 201, description: 'Session started' })
  startSession(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SessionStartDto,
  ) {
    return this.reading.startSession(user.id, dto);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End a reading session and record duration' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 403, description: 'Session not owned by user' })
  endSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SessionEndDto,
  ) {
    return this.reading.endSession(user.id, sessionId, dto);
  }

  // ---- Highlights ----

  @Get('highlights/:bookId')
  @ApiOperation({ summary: 'List highlights for a book (optionally filtered by chapter)' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Highlights list' })
  listHighlights(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
    @Query() dto: ListHighlightsDto,
  ) {
    return this.reading.listHighlights(user.id, bookId, dto);
  }

  @Post('highlights')
  @ApiOperation({ summary: 'Create a new highlight' })
  @ApiResponse({ status: 201, description: 'Highlight created' })
  createHighlight(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateHighlightDto,
  ) {
    return this.reading.createHighlight(user.id, dto);
  }

  @Patch('highlights/:id')
  @ApiOperation({ summary: 'Update highlight color or note' })
  @ApiParam({ name: 'id', description: 'Highlight UUID' })
  @ApiResponse({ status: 200, description: 'Highlight updated' })
  @ApiResponse({ status: 404, description: 'Highlight not found' })
  updateHighlight(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateHighlightDto,
  ) {
    return this.reading.updateHighlight(user.id, id, dto);
  }

  @Delete('highlights/:id')
  @ApiOperation({ summary: 'Delete a highlight' })
  @ApiParam({ name: 'id', description: 'Highlight UUID' })
  @ApiResponse({ status: 200, description: 'Highlight deleted' })
  @ApiResponse({ status: 404, description: 'Highlight not found' })
  async deleteHighlight(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    await this.reading.deleteHighlight(user.id, id);
    return { ok: true };
  }

  // ---- Stats ----

  @Get('stats')
  @ApiOperation({ summary: 'Reading statistics summary (mock, full impl Phase 2)' })
  @ApiQuery({ name: 'period', required: false, description: 'e.g. week, month, all' })
  @ApiResponse({ status: 200, description: 'Stats summary' })
  getStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: string,
  ) {
    return this.reading.getReadingStats(user.id, period ?? 'all');
  }
}
