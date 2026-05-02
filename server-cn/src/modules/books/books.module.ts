import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { BookAssetEntity } from './entities/book-asset.entity.js';
import { BookChapterEntity } from './entities/book-chapter.entity.js';
import { BookRatingEntity } from './entities/book-rating.entity.js';
import { BookEntity } from './entities/book.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookEntity,
      BookChapterEntity,
      BookAssetEntity,
      BookRatingEntity,
    ]),
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
