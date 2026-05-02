import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AddToBookshelfDto, ListBookshelfDto, UpdateShelfStatusDto } from './dto/bookshelf.dto.js';
import { BookshelfService } from './bookshelf.service.js';

@ApiTags('bookshelf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookshelf')
export class BookshelfController {
  constructor(private readonly shelf: BookshelfService) {}

  @Get()
  @ApiOperation({ summary: "List user's bookshelf with optional status/favorites filter" })
  @ApiResponse({ status: 200, description: 'Bookshelf items' })
  list(@CurrentUser() user: CurrentUserPayload, @Query() dto: ListBookshelfDto) {
    return this.shelf.list(user.id, dto);
  }

  @Post(':bookId')
  @ApiOperation({ summary: 'Add a book to the shelf (initial status: want-to-read)' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 201, description: 'Book added to shelf' })
  @ApiResponse({ status: 409, description: 'Book already on shelf' })
  add(@CurrentUser() user: CurrentUserPayload, @Param('bookId') bookId: string) {
    return this.shelf.add(user.id, bookId);
  }

  @Patch(':bookId/status')
  @ApiOperation({ summary: "Update reading status of a shelf item" })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'Not on shelf' })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateShelfStatusDto,
  ) {
    return this.shelf.updateStatus(user.id, bookId, dto.status);
  }

  @Post(':bookId/favorite')
  @ApiOperation({ summary: 'Toggle favorite flag on a shelf item' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Favorite toggled' })
  @ApiResponse({ status: 404, description: 'Not on shelf' })
  toggleFavorite(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
  ) {
    return this.shelf.toggleFavorite(user.id, bookId);
  }

  @Delete(':bookId')
  @ApiOperation({ summary: 'Remove a book from the shelf' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book removed from shelf' })
  @ApiResponse({ status: 404, description: 'Not on shelf' })
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('bookId') bookId: string) {
    await this.shelf.remove(user.id, bookId);
    return { ok: true };
  }
}
