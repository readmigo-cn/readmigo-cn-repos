import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PersonalNoteEntity } from './entities/personal-note.entity.js';
import { VocabNoteEntity } from './entities/vocab-note.entity.js';
import { VocabReviewLogEntity } from './entities/vocab-review-log.entity.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([VocabNoteEntity, VocabReviewLogEntity, PersonalNoteEntity])],
  controllers: [NotesController],
  providers: [NotesService, JwtAuthGuard],
  exports: [NotesService],
})
export class NotesModule {}
