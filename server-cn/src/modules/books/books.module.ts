import { Module } from '@nestjs/common';

import { BooksController } from './books.controller.js';

@Module({
  controllers: [BooksController],
})
export class BooksModule {}
