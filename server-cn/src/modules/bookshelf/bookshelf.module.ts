import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookshelfController } from './bookshelf.controller.js';
import { BookshelfService } from './bookshelf.service.js';
import { BookshelfItemEntity } from './entities/bookshelf-item.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BookshelfItemEntity])],
  controllers: [BookshelfController],
  providers: [BookshelfService],
  exports: [BookshelfService],
})
export class BookshelfModule {}
