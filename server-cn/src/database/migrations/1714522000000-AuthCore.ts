import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthCore1714522000000 implements MigrationInterface {
  name = 'AuthCore1714522000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------ users
    // 原 InitialSchema 的 users 表字段较少，此处创建功能完整的新版本。
    // 如果旧表已存在，先删除（开发阶段可接受；生产上线前用独立 ALTER 脚本代替）。
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phone"          varchar(20)  UNIQUE NULL,
        "email"          varchar(255) UNIQUE NULL,
        "hashedPassword" varchar(100) NULL,
        "passwordSalt"   varchar(50)  NULL,
        "role"           varchar(20)  NOT NULL DEFAULT 'user',
        "isActive"       boolean      NOT NULL DEFAULT true,
        "isInternal"     boolean      NOT NULL DEFAULT false,
        "avatarUrl"      text         NULL,
        "displayName"    varchar(100) NULL,
        "locale"         varchar(10)  NOT NULL DEFAULT 'zh-CN',
        "englishLevel"   varchar(5)   NULL,
        "createdAt"      timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz  NOT NULL DEFAULT now(),
        "deletedAt"      timestamptz  NULL
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "users"."englishLevel" IS 'CEFR 等级: A1/A2/B1/B2/C1/C2'`);
    await queryRunner.query(`COMMENT ON COLUMN "users"."deletedAt" IS '软删除时间戳，NULL 表示未删除'`);
    await queryRunner.query(`COMMENT ON COLUMN "users"."isInternal" IS '内部测试账号标记，用于数据分析时过滤'`);

    // 部分索引：只对非 NULL 值建唯一索引，节省索引空间
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE "email" IS NOT NULL`);
    // 软删除查询加速
    await queryRunner.query(`CREATE INDEX "idx_users_deleted_at" ON "users" ("deletedAt") WHERE "deletedAt" IS NULL`);

    // --------------------------------------------------------------- auth_sessions
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id"               uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"           uuid         NOT NULL,
        "deviceId"         varchar(100) NOT NULL,
        "deviceName"       varchar(200) NULL,
        "refreshTokenHash" varchar(200) NOT NULL,
        "expiresAt"        timestamptz  NOT NULL,
        "lastActiveAt"     timestamptz  NULL,
        "createdAt"        timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sessions_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "auth_sessions"."refreshTokenHash" IS 'bcrypt hash of refresh token，明文不落库'`);
    await queryRunner.query(`COMMENT ON COLUMN "auth_sessions"."deviceId" IS '客户端生成的设备唯一标识'`);

    await queryRunner.query(`CREATE INDEX "idx_sessions_user_id" ON "auth_sessions" ("userId")`);
    // refresh token 查询是高频路径，单独索引
    await queryRunner.query(`CREATE INDEX "idx_sessions_token_hash" ON "auth_sessions" ("refreshTokenHash")`);
    // 清理过期 session 的定时任务使用此索引
    await queryRunner.query(`CREATE INDEX "idx_sessions_expires_at" ON "auth_sessions" ("expiresAt")`);

    // --------------------------------------------------------------- oauth_bindings
    await queryRunner.query(`
      CREATE TABLE "oauth_bindings" (
        "id"             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"         uuid         NOT NULL,
        "provider"       varchar(30)  NOT NULL,
        "providerUserId" varchar(200) NOT NULL,
        "providerData"   jsonb        NULL,
        "createdAt"      timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_oauth_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_oauth_provider_user"
          UNIQUE ("provider", "providerUserId")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "oauth_bindings"."provider" IS '支持: huawei / wechat / qq / alipay'`);
    await queryRunner.query(`COMMENT ON COLUMN "oauth_bindings"."providerData" IS '原始 OAuth 响应数据，方便后续扩展字段'`);

    await queryRunner.query(`CREATE INDEX "idx_oauth_user_id" ON "oauth_bindings" ("userId")`);

    // --------------------------------------------------------------- sms_codes
    await queryRunner.query(`
      CREATE TABLE "sms_codes" (
        "id"       uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phone"    varchar(20) NOT NULL,
        "codeHash" varchar(100) NOT NULL,
        "attempts" integer     NOT NULL DEFAULT 0,
        "expiresAt" timestamptz NOT NULL,
        "usedAt"   timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "sms_codes"."codeHash" IS 'SHA-256 hash of the 6-digit code，不存明文'`);
    await queryRunner.query(`COMMENT ON COLUMN "sms_codes"."attempts" IS '已尝试次数，超过阈值锁定'`);

    // 短信验证码按手机号 + 时间倒序查最新记录，此复合索引覆盖该查询
    await queryRunner.query(`CREATE INDEX "idx_sms_phone_created" ON "sms_codes" ("phone", "createdAt" DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_phone_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_codes"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_oauth_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_bindings"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_token_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_phone"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
