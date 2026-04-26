import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('reading')
@Controller('reading')
export class ReadingController {
  @Get('progress/:bookId')
  getProgress(@Param('bookId') bookId: string) {
    return {
      bookId,
      status: 'todo',
    };
  }
}
