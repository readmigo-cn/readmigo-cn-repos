import { Module } from '@nestjs/common';

import { ReadingController } from './reading.controller.js';

@Module({
  controllers: [ReadingController],
})
export class ReadingModule {}
