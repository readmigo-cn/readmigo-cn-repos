import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { BooksService } from './books.service.js';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'language', required: false })
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('language') language?: string,
  ) {
    return this.books.list(Number(page ?? 1), Number(pageSize ?? 20), language);
  }

  @Get('search')
  search(@Query('q') keyword: string) {
    return this.books.search(keyword ?? '');
  }

  @Get(':id')
  getBook(@Param('id') id: string) {
    return this.books.findOne(id);
  }
}
