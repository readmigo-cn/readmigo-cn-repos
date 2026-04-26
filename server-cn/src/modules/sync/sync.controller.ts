import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  @Post('reading-state')
  syncReadingState(@Body() body: Record<string, unknown>) {
    return {
      status: 'todo',
      synced: true,
      payload: body,
    };
  }
}
