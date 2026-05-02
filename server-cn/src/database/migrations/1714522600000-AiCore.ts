import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AiCore1714522600000 implements MigrationInterface {
  name = 'AiCore1714522600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- ai_conversations
    await queryRunner.query(`
      CREATE TABLE "ai_conversations" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"      uuid         NOT NULL,
        "bookId"      varchar(64)  NULL,
        "chapterId"   varchar(128) NULL,
        "title"       varchar(200) NULL,
        "kind"        varchar(30)  NOT NULL DEFAULT 'chat',
        "model"       varchar(50)  NULL,
        "systemPrompt" text        NULL,
        "messageCount" integer     NOT NULL DEFAULT 0,
        "totalTokens"  integer     NOT NULL DEFAULT 0,
        "isArchived"  boolean      NOT NULL DEFAULT false,
        "createdAt"   timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ai_conv_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "ai_conversations"."kind"        IS '对话类型: chat / word_explain / translation / quiz / summary'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_conversations"."model"       IS '实际使用的模型标识，方便后续账单归因'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_conversations"."totalTokens" IS '累计 token 消耗，用于配额核算'`);

    await queryRunner.query(`CREATE INDEX "idx_ai_conv_user_id" ON "ai_conversations" ("userId")`);
    // 关联书籍的对话（书籍助手功能）
    await queryRunner.query(`CREATE INDEX "idx_ai_conv_book_id" ON "ai_conversations" ("bookId") WHERE "bookId" IS NOT NULL`);
    // 最近对话列表
    await queryRunner.query(`CREATE INDEX "idx_ai_conv_updated" ON "ai_conversations" ("userId", "updatedAt" DESC)`);

    // --------------------------------------------------------- ai_messages
    await queryRunner.query(`
      CREATE TABLE "ai_messages" (
        "id"             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversationId" uuid         NOT NULL,
        "userId"         uuid         NOT NULL,
        "role"           varchar(20)  NOT NULL,
        "content"        text         NOT NULL,
        "contentType"    varchar(20)  NOT NULL DEFAULT 'text',
        "promptTokens"   integer      NOT NULL DEFAULT 0,
        "completionTokens" integer    NOT NULL DEFAULT 0,
        "latencyMs"      integer      NULL,
        "finishReason"   varchar(20)  NULL,
        "metadata"       jsonb        NULL,
        "createdAt"      timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ai_msg_conv"
          FOREIGN KEY ("conversationId") REFERENCES "ai_conversations" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ai_msg_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_ai_msg_role"
          CHECK ("role" IN ('user', 'assistant', 'system', 'tool'))
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "ai_messages"."role"         IS 'user / assistant / system / tool'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_messages"."contentType"  IS 'text / image_url / tool_call / tool_result'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_messages"."latencyMs"    IS '模型响应延迟毫秒数'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_messages"."finishReason" IS 'stop / length / tool_calls / error'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_messages"."metadata"     IS '扩展字段，存储工具调用参数等'`);

    // 按对话顺序读取消息（主要访问路径）
    await queryRunner.query(`CREATE INDEX "idx_ai_msg_conv_id" ON "ai_messages" ("conversationId", "createdAt" ASC)`);
    // 用户消息历史
    await queryRunner.query(`CREATE INDEX "idx_ai_msg_user_id" ON "ai_messages" ("userId")`);

    // --------------------------------------------------------- ai_cache
    // 语义等价查询缓存，减少 LLM API 调用成本。
    await queryRunner.query(`
      CREATE TABLE "ai_cache" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cacheKey"    varchar(64)  NOT NULL,
        "prompt"      text         NOT NULL,
        "response"    text         NOT NULL,
        "model"       varchar(50)  NOT NULL,
        "tokenCount"  integer      NOT NULL DEFAULT 0,
        "hitCount"    integer      NOT NULL DEFAULT 0,
        "expiresAt"   timestamptz  NULL,
        "createdAt"   timestamptz  NOT NULL DEFAULT now(),
        "lastHitAt"   timestamptz  NULL,
        CONSTRAINT "uq_ai_cache_key"
          UNIQUE ("cacheKey")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "ai_cache"."cacheKey"   IS 'SHA-256(model + normalized_prompt)，保证唯一性'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_cache"."hitCount"   IS '缓存命中次数，用于 LRU 淘汰决策'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_cache"."expiresAt"  IS 'NULL 表示永不过期'`);

    // 过期清理任务使用此索引
    await queryRunner.query(`CREATE INDEX "idx_ai_cache_expires" ON "ai_cache" ("expiresAt") WHERE "expiresAt" IS NOT NULL`);

    // --------------------------------------------------------- ai_quotas
    // 用户 AI 功能配额记录，按 period（YYYY-MM）+ kind 维度统计。
    await queryRunner.query(`
      CREATE TABLE "ai_quotas" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"      uuid         NOT NULL,
        "period"      varchar(7)   NOT NULL,
        "kind"        varchar(30)  NOT NULL,
        "usedCount"   integer      NOT NULL DEFAULT 0,
        "usedTokens"  integer      NOT NULL DEFAULT 0,
        "limitCount"  integer      NOT NULL DEFAULT 0,
        "limitTokens" integer      NOT NULL DEFAULT 0,
        "updatedAt"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ai_quota_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_ai_quota_user_period_kind"
          UNIQUE ("userId", "period", "kind")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "ai_quotas"."period"      IS '统计周期，格式 YYYY-MM'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_quotas"."kind"        IS '配额类型: chat / word_explain / translation / quiz'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_quotas"."limitCount"  IS '0 表示不限次数'`);
    await queryRunner.query(`COMMENT ON COLUMN "ai_quotas"."limitTokens" IS '0 表示不限 tokens'`);

    // 查询某用户当月配额（登录/每次 AI 调用前检查）
    await queryRunner.query(`CREATE INDEX "idx_ai_quota_user_period" ON "ai_quotas" ("userId", "period")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_quota_user_period"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_quotas"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_cache_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_cache"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_msg_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_msg_conv_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_conv_updated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_conv_book_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_conv_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_conversations"`);
  }
}
