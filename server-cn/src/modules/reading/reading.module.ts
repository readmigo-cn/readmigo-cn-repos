import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ReadingController } from './reading.controller.js';
import { ReadingService } from './reading.service.js';
import { ReadingProgressEntity } from './entities/reading-progress.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReadingProgressEntity])],
  controllers: [ReadingController],
  providers: [ReadingService, JwtAuthGuard],
  exports: [ReadingService],
})
export class ReadingModule {}
