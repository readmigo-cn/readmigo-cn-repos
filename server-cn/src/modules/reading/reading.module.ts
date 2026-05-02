import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReadingController } from './reading.controller.js';
import { ReadingService } from './reading.service.js';
import { ReadingHighlightEntity } from './entities/reading-highlight.entity.js';
import { ReadingProgressEntity } from './entities/reading-progress.entity.js';
import { ReadingSessionEntity } from './entities/reading-session.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReadingProgressEntity,
      ReadingSessionEntity,
      ReadingHighlightEntity,
    ]),
  ],
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
