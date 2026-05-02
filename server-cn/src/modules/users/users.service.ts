import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  // ─── 基础查询 ──────────────────────────────────────────────

  /**
   * 按 ID 查询用户（包含软删除过滤）。
   * 不抛出异常，供内部组合调用。
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  /** 按手机号查询用户（不含软删除记录） */
  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { phone } });
  }

  /** 按邮箱查询用户（不含软删除记录） */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { email } });
  }

  // ─── 当前用户信息 ──────────────────────────────────────────

  /**
   * 获取当前登录用户信息。
   * 明确过滤软删除记录，注销用户不可访问。
   */
  async getMe(id: string): Promise<UserEntity> {
    const user = await this.users
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) throw new NotFoundException('user_not_found');
    return user;
  }

  // ─── 资料修改 ──────────────────────────────────────────────

  /**
   * 局部更新用户 Profile（只更新 dto 中有值的字段）。
   * 返回更新后的完整用户对象。
   */
  async update(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('user_not_found');

    // 仅更新有传值的字段，避免覆盖为 undefined
    const patch: Partial<UserEntity> = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) patch.avatarUrl = dto.avatarUrl;
    if (dto.locale !== undefined) patch.locale = dto.locale;
    if (dto.englishLevel !== undefined) {
      patch.englishLevel = dto.englishLevel as UserEntity['englishLevel'];
    }

    await this.users.update(id, patch);
    this.logger.log(`用户 Profile 已更新 userId=${id}`);

    // 返回最新数据
    return this.getMe(id);
  }

  // ─── 账号注销 ──────────────────────────────────────────────

  /**
   * 软删除：设置 deletedAt 时间戳。
   * 依赖 TypeORM 的 @DeleteDateColumn 和 softDelete 方法。
   */
  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('user_not_found');

    await this.users.softDelete(id);
    this.logger.log(`用户已注销（软删除）userId=${id}`);
  }
}
