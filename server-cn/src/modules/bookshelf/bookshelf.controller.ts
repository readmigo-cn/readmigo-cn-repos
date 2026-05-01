import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AddShelfDto, UpdateShelfDto } from './dto/add-shelf.dto.js';
import { BookshelfService } from './bookshelf.service.js';

@ApiTags('bookshelf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookshelf')
export class BookshelfController {
  constructor(private readonly shelf: BookshelfService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.shelf.list(user.id);
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddShelfDto) {
    return this.shelf.add(user.id, dto.bookId);
  }

  @Put(':bookId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateShelfDto,
  ) {
    return this.shelf.updateStatus(user.id, bookId, dto.status ?? 'reading');
  }

  @Delete(':bookId')
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('bookId') bookId: string) {
    await this.shelf.remove(user.id, bookId);
    return { ok: true };
  }
}
