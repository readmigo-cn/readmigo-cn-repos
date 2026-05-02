import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { ListBooksDto } from './dto/list-books.dto.js';
import { RateBookDto } from './dto/rate-book.dto.js';
import { SearchBooksDto } from './dto/search-books.dto.js';
import { BooksService } from './books.service.js';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List books with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated book list' })
  list(@Query() dto: ListBooksDto) {
    return this.books.list(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Full-text search across title and author' })
  @ApiResponse({ status: 200, description: 'Matching books (max 50)' })
  search(@Query() dto: SearchBooksDto) {
    return this.books.search(dto);
  }

  @Get('recommend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Personalized book recommendations (W2 prototype)' })
  @ApiResponse({ status: 200, description: 'Recommended books' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  recommend(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.books.recommend(user.id, limit ? Number(limit) : 10);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get book by UUID' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book detail' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  getById(@Param('id') id: string) {
    return this.books.getById(id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get book by slug' })
  @ApiParam({ name: 'slug', description: 'URL-friendly book identifier' })
  @ApiResponse({ status: 200, description: 'Book detail' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  getBySlug(@Param('slug') slug: string) {
    return this.books.getBySlug(slug);
  }

  @Get(':slug/chapters')
  @ApiOperation({ summary: 'List all chapters for a book (no content HTML)' })
  @ApiParam({ name: 'slug', description: 'Book slug' })
  @ApiResponse({ status: 200, description: 'Chapter list' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async getChapters(@Param('slug') slug: string) {
    const book = await this.books.getBySlug(slug);
    return this.books.getChapters(book.id);
  }

  @Get(':slug/chapters/:index')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get chapter content (auth required, paywall enforced)' })
  @ApiParam({ name: 'slug', description: 'Book slug' })
  @ApiParam({ name: 'index', description: 'Zero-based chapter index' })
  @ApiResponse({ status: 200, description: 'Chapter with HTML content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async getChapter(
    @Param('slug') slug: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    const book = await this.books.getBySlug(slug);
    // TODO: paywall check — verify user subscription before returning content
    return this.books.getChapter(book.id, index);
  }

  @Post(':id/rate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rate a book (1–5 stars with optional comment)' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 201, description: 'Rating saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  rate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') bookId: string,
    @Body() dto: RateBookDto,
  ) {
    return this.books.rate(user.id, bookId, dto);
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'List all ratings for a book' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Ratings list' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  getRatings(@Param('id') bookId: string) {
    return this.books.getRatings(bookId);
  }
}
