import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreatePersonalNoteDto } from './dto/create-personal-note.dto.js';
import { CreateVocabNoteDto } from './dto/create-vocab-note.dto.js';
import { GetDueVocabDto } from './dto/get-due-vocab.dto.js';
import { ListPersonalNotesDto } from './dto/list-personal-notes.dto.js';
import { ListVocabNotesDto } from './dto/list-vocab-notes.dto.js';
import { ReviewVocabDto } from './dto/review-vocab.dto.js';
import { SearchVocabNotesDto } from './dto/search-vocab-notes.dto.js';
import { UpdatePersonalNoteDto } from './dto/update-personal-note.dto.js';
import { UpdateVocabNoteDto } from './dto/update-vocab-note.dto.js';
import { NotesService } from './notes.service.js';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  // ── VocabNote endpoints ─────────────────────────────────────────────────────

  @Get('vocab')
  @ApiOperation({ summary: '获取生词本列表', description: '支持按书籍、标签、待复习状态过滤，分页返回' })
  @ApiResponse({ status: 200, description: '生词列表及总数' })
  listVocabNotes(@CurrentUser() user: CurrentUserPayload, @Query() filter: ListVocabNotesDto) {
    return this.notes.listVocabNotes(user.id, filter);
  }

  @Get('vocab/search')
  @ApiOperation({ summary: '搜索生词', description: '模糊匹配 word 和 lemma 字段' })
  @ApiResponse({ status: 200, description: '匹配的生词列表' })
  searchVocabNotes(@CurrentUser() user: CurrentUserPayload, @Query() dto: SearchVocabNotesDto) {
    return this.notes.searchVocabNotes(user.id, dto);
  }

  @Get('vocab/:id')
  @ApiOperation({ summary: '获取单个生词详情' })
  @ApiParam({ name: 'id', description: '生词 UUID' })
  @ApiResponse({ status: 200, description: '生词详情' })
  @ApiResponse({ status: 404, description: '生词不存在' })
  getVocabNote(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.notes.getVocabNote(user.id, id);
  }

  @Post('vocab')
  @ApiOperation({ summary: '添加生词到生词本' })
  @ApiResponse({ status: 201, description: '已添加的生词条目' })
  createVocabNote(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVocabNoteDto) {
    return this.notes.createVocabNote(user.id, dto);
  }

  @Patch('vocab/:id')
  @ApiOperation({ summary: '更新生词信息（释义、标签等）' })
  @ApiParam({ name: 'id', description: '生词 UUID' })
  @ApiResponse({ status: 200, description: '更新后的生词条目' })
  @ApiResponse({ status: 404, description: '生词不存在' })
  updateVocabNote(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVocabNoteDto,
  ) {
    return this.notes.updateVocabNote(user.id, id, dto);
  }

  @Delete('vocab/:id')
  @ApiOperation({ summary: '删除生词' })
  @ApiParam({ name: 'id', description: '生词 UUID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '生词不存在' })
  async deleteVocabNote(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.notes.deleteVocabNote(user.id, id);
    return { ok: true };
  }

  // ── SRS (闪卡复习) endpoints ─────────────────────────────────────────────────

  @Get('srs/due')
  @ApiOperation({ summary: '获取待复习生词', description: '返回 nextReviewAt <= now 的生词，按逾期时间排序' })
  @ApiResponse({ status: 200, description: '待复习生词列表' })
  getDueForReview(@CurrentUser() user: CurrentUserPayload, @Query() dto: GetDueVocabDto) {
    return this.notes.getDueForReview(user.id, dto);
  }

  @Post('srs/review')
  @ApiOperation({
    summary: '提交复习结果',
    description: '根据 SM-2 算法更新生词的下次复习时间，quality 0-5（0=遗忘，5=轻松）',
  })
  @ApiResponse({ status: 201, description: '更新后的生词条目（含新的 nextReviewAt）' })
  @ApiResponse({ status: 404, description: '生词不存在' })
  submitReview(@CurrentUser() user: CurrentUserPayload, @Body() dto: ReviewVocabDto) {
    return this.notes.submitReview(user.id, dto);
  }

  @Get('srs/stats')
  @ApiOperation({ summary: '获取复习统计', description: '返回指定时段的复习次数、正确率、今日待复习数' })
  @ApiResponse({ status: 200, description: '复习统计数据' })
  getReviewStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: 'today' | '7d' | '30d',
  ) {
    return this.notes.getReviewStats(user.id, period ?? '7d');
  }

  // ── PersonalNote endpoints ──────────────────────────────────────────────────

  @Get('personal')
  @ApiOperation({ summary: '获取读书笔记列表', description: '可按书籍、标签过滤，分页返回' })
  @ApiResponse({ status: 200, description: '笔记列表及总数' })
  listPersonalNotes(@CurrentUser() user: CurrentUserPayload, @Query() filter: ListPersonalNotesDto) {
    return this.notes.listPersonalNotes(user.id, filter);
  }

  @Post('personal')
  @ApiOperation({ summary: '创建读书笔记' })
  @ApiResponse({ status: 201, description: '新建的笔记' })
  createPersonalNote(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePersonalNoteDto) {
    return this.notes.createPersonalNote(user.id, dto);
  }

  @Patch('personal/:id')
  @ApiOperation({ summary: '更新读书笔记' })
  @ApiParam({ name: 'id', description: '笔记 UUID' })
  @ApiResponse({ status: 200, description: '更新后的笔记' })
  @ApiResponse({ status: 404, description: '笔记不存在' })
  updatePersonalNote(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalNoteDto,
  ) {
    return this.notes.updatePersonalNote(user.id, id, dto);
  }

  @Delete('personal/:id')
  @ApiOperation({ summary: '删除读书笔记' })
  @ApiParam({ name: 'id', description: '笔记 UUID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '笔记不存在' })
  async deletePersonalNote(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.notes.deletePersonalNote(user.id, id);
    return { ok: true };
  }

  @Get('personal/by-book/:bookId')
  @ApiOperation({ summary: '获取某本书的所有笔记', description: '按章节顺序排序' })
  @ApiParam({ name: 'bookId', description: '书籍 ID' })
  @ApiResponse({ status: 200, description: '该书所有笔记' })
  getPersonalNotesForBook(
    @CurrentUser() user: CurrentUserPayload,
    @Param('bookId') bookId: string,
  ) {
    return this.notes.getPersonalNotesForBook(user.id, bookId);
  }
}
