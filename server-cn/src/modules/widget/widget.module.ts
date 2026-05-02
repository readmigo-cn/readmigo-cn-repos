import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VocabNoteEntity } from '../notes/entities/vocab-note.entity.js';
import { ReadingProgressEntity } from '../reading/entities/reading-progress.entity.js';
import { WidgetController } from './widget.controller.js';
import { WidgetService } from './widget.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([VocabNoteEntity, ReadingProgressEntity]),
  ],
  controllers: [WidgetController],
  providers: [WidgetService],
})
export class WidgetModule {}
