import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { NotesService } from './notes.service.js';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @ApiQuery({ name: 'bookId', required: false })
  list(@CurrentUser() user: CurrentUserPayload, @Query('bookId') bookId?: string) {
    return bookId ? this.notes.listByBook(user.id, bookId) : this.notes.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateNoteDto) {
    return this.notes.create(user.id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.notes.delete(user.id, id);
    return { ok: true };
  }
}
