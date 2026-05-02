import type { MigrationInterface, QueryRunner } from 'typeorm';

// 此迁移补充 1714521800000-Notes.ts 中的最小化 notes 表。
// 原 notes 表保留（用于高亮），新增 vocab_notes / vocab_review_logs / personal_notes 三张表。
// vocab_notes 是单词本主表，personal_notes 是用户自由笔记，二者语义不同不合并。
export class NotesV21714522400000 implements MigrationInterface {
  name = 'NotesV21714522400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- vocab_notes
    await queryRunner.query(`
      CREATE TABLE "vocab_notes" (
        "id"            uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"        uuid         NOT NULL,
        "bookId"        varchar(64)  NULL,
        "chapterId"     varchar(128) NULL,
        "word"          varchar(100) NOT NULL,
        "lemma"         varchar(100) NULL,
        "contextText"   varchar(500) NULL,
        "translation"   text         NULL,
        "definition"    text         NULL,
        "pronunciation" varchar(200) NULL,
        "cefrLevel"     varchar(5)   NULL,
        "status"        varchar(16)  NOT NULL DEFAULT 'new',
        "reviewCount"   integer      NOT NULL DEFAULT 0,
        "nextReviewAt"  timestamptz  NULL,
        "easinessFactor" real        NOT NULL DEFAULT 2.5,
        "interval"      integer      NOT NULL DEFAULT 0,
        "isDeleted"     boolean      NOT NULL DEFAULT false,
        "createdAt"     timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_vocab_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "vocab_notes"."lemma"           IS '词根形式，便于去重'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_notes"."status"          IS '学习状态: new / learning / reviewing / mastered'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_notes"."easinessFactor"  IS 'SM-2 算法易度因子，初始 2.5'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_notes"."interval"        IS 'SM-2 复习间隔天数'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_notes"."nextReviewAt"    IS '下次复习时间，NULL 表示未开始'`);

    // 用户单词本列表
    await queryRunner.query(`CREATE INDEX "idx_vocab_user_id" ON "vocab_notes" ("userId") WHERE "isDeleted" = false`);
    // 到期复习队列（SRS 核心查询）
    await queryRunner.query(`CREATE INDEX "idx_vocab_review_queue" ON "vocab_notes" ("userId", "nextReviewAt") WHERE "isDeleted" = false AND "status" != 'mastered'`);
    // 来源书籍查询
    await queryRunner.query(`CREATE INDEX "idx_vocab_book_id" ON "vocab_notes" ("bookId") WHERE "bookId" IS NOT NULL`);

    // --------------------------------------------------------- vocab_review_logs
    await queryRunner.query(`
      CREATE TABLE "vocab_review_logs" (
        "id"             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "vocabNoteId"    uuid        NOT NULL,
        "userId"         uuid        NOT NULL,
        "quality"        smallint    NOT NULL,
        "intervalBefore" integer     NOT NULL DEFAULT 0,
        "intervalAfter"  integer     NOT NULL DEFAULT 0,
        "efBefore"       real        NOT NULL DEFAULT 2.5,
        "efAfter"        real        NOT NULL DEFAULT 2.5,
        "reviewedAt"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_review_log_vocab"
          FOREIGN KEY ("vocabNoteId") REFERENCES "vocab_notes" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_review_log_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_review_quality"
          CHECK ("quality" BETWEEN 0 AND 5)
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "vocab_review_logs"."quality"  IS 'SM-2 质量评分 0-5，0-2 重置，3-5 推进'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_review_logs"."efBefore"  IS '本次复习前的易度因子'`);
    await queryRunner.query(`COMMENT ON COLUMN "vocab_review_logs"."efAfter"   IS '本次复习后的易度因子'`);

    await queryRunner.query(`CREATE INDEX "idx_review_log_vocab" ON "vocab_review_logs" ("vocabNoteId")`);
    // 用户复习历史按时间倒序（用于学习统计）
    await queryRunner.query(`CREATE INDEX "idx_review_log_user_time" ON "vocab_review_logs" ("userId", "reviewedAt" DESC)`);

    // --------------------------------------------------------- personal_notes
    await queryRunner.query(`
      CREATE TABLE "personal_notes" (
        "id"        uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"    uuid         NOT NULL,
        "bookId"    varchar(64)  NULL,
        "chapterId" varchar(128) NULL,
        "title"     varchar(200) NULL,
        "content"   text         NOT NULL,
        "tags"      text[]       NOT NULL DEFAULT '{}',
        "isPrivate" boolean      NOT NULL DEFAULT true,
        "isDeleted" boolean      NOT NULL DEFAULT false,
        "createdAt" timestamptz  NOT NULL DEFAULT now(),
        "updatedAt" timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_pnote_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "personal_notes"."isPrivate" IS '默认私密，未来支持社区分享时可设为 false'`);
    await queryRunner.query(`COMMENT ON COLUMN "personal_notes"."tags"      IS '用户自定义标签数组'`);

    await queryRunner.query(`CREATE INDEX "idx_pnotes_user_id" ON "personal_notes" ("userId") WHERE "isDeleted" = false`);
    // 关联书籍的笔记
    await queryRunner.query(`CREATE INDEX "idx_pnotes_user_book" ON "personal_notes" ("userId", "bookId") WHERE "bookId" IS NOT NULL AND "isDeleted" = false`);
    // 同步增量拉取
    await queryRunner.query(`CREATE INDEX "idx_pnotes_updated" ON "personal_notes" ("userId", "updatedAt" DESC)`);
    // tags GIN 索引支持 @> 查询
    await queryRunner.query(`CREATE INDEX "idx_pnotes_tags_gin" ON "personal_notes" USING GIN ("tags")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pnotes_tags_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pnotes_updated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pnotes_user_book"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pnotes_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "personal_notes"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_log_user_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_log_vocab"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vocab_review_logs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vocab_book_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vocab_review_queue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vocab_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vocab_notes"`);
  }
}
