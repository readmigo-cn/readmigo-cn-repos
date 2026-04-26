import { Module } from '@nestjs/common';

import { BookshelfController } from './bookshelf.controller.js';

@Module({
  controllers: [BookshelfController],
})
export class BookshelfModule {}
