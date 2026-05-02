import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { BookshelfItemEntity } from '../bookshelf/entities/bookshelf-item.entity.js';
import { PersonalNoteEntity } from '../notes/entities/personal-note.entity.js';
import { VocabNoteEntity } from '../notes/entities/vocab-note.entity.js';
import { ReadingProgressEntity } from '../reading/entities/reading-progress.entity.js';
import { SyncCursorEntity } from './entities/sync-cursor.entity.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncCursorEntity,
      VocabNoteEntity,
      PersonalNoteEntity,
      ReadingProgressEntity,
      BookshelfItemEntity,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService, JwtAuthGuard],
  exports: [SyncService],
})
export class SyncModule {}
