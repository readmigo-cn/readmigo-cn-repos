import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('books')
@Controller('books')
export class BooksController {
  @Get()
  listBooks() {
    return {
      status: 'todo',
      source: 'readmigo-cn',
      items: [],
    };
  }

  @Get(':id')
  getBook(@Param('id') id: string) {
    return {
      id,
      status: 'todo',
    };
  }
}
