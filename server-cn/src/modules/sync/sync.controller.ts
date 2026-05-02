import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PullChangesDto } from './dto/pull-changes.dto.js';
import { PushChangesDto } from './dto/push-changes.dto.js';
import { SyncStatusQueryDto } from './dto/sync-status.dto.js';
import { SyncService } from './sync.service.js';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('pull')
  @ApiOperation({
    summary: '从服务端拉取变更',
    description: '返回指定实体类型在 since 时间之后的所有变更，支持分页（hasMore=true 时继续拉取）',
  })
  @ApiResponse({
    status: 201,
    description: '{ items, serverTimestamp, hasMore }',
  })
  pullChanges(@CurrentUser() user: CurrentUserPayload, @Body() dto: PullChangesDto) {
    return this.sync.pullChanges(user.id, dto);
  }

  @Post('push')
  @ApiOperation({
    summary: '推送本地变更到服务端',
    description: '批量推送 create/update/delete 操作，服务端返回成功和冲突的 ID 列表',
  })
  @ApiResponse({
    status: 201,
    description: '{ applied: string[], conflicts: string[] }',
  })
  pushChanges(@CurrentUser() user: CurrentUserPayload, @Body() dto: PushChangesDto) {
    return this.sync.pushChanges(user.id, dto);
  }

  @Get('status')
  @ApiOperation({
    summary: '获取设备同步状态',
    description: '返回该设备对每类实体的最后同步时间和版本号',
  })
  @ApiResponse({
    status: 200,
    description: '{ perEntity: { [entityType]: { lastSyncedAt, version } } }',
  })
  getSyncStatus(@CurrentUser() user: CurrentUserPayload, @Query() query: SyncStatusQueryDto) {
    return this.sync.getSyncStatus(user.id, query.deviceId);
  }
}
