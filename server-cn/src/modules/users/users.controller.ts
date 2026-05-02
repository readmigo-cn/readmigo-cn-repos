import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiResponse({ status: 200, description: '用户信息' })
  @ApiResponse({ status: 401, description: '未登录' })
  @ApiResponse({ status: 404, description: 'user_not_found' })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户 Profile' })
  @ApiResponse({ status: 200, description: '更新成功，返回最新用户信息' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '未登录' })
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新头像 URL（占位接口，W10 接入华为云 OBS）' })
  @ApiResponse({ status: 200, description: '头像 URL 已更新' })
  @ApiResponse({ status: 401, description: '未登录' })
  updateAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { avatarUrl: string },
  ) {
    // TODO W10: 替换为华为云 OBS 预签名上传流程；当前直接接受客户端传入的 URL
    return this.usersService.update(user.id, { avatarUrl: body.avatarUrl });
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '注销账号（软删除）' })
  @ApiResponse({ status: 204, description: '注销成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  @ApiResponse({ status: 404, description: 'user_not_found' })
  async deleteMe(@CurrentUser() user: CurrentUserPayload) {
    await this.usersService.softDelete(user.id);
  }
}
