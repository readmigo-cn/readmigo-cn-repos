import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('bookshelf')
@Controller('bookshelf')
export class BookshelfController {
  @Get()
  getBookshelf() {
    return {
      status: 'todo',
      items: [],
    };
  }
}
