import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Reading1714522300000 implements MigrationInterface {
  name = 'Reading1714522300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- reading_progress
    // 原 InitialSchema 的 reading_progress 字段较少，此处重建为完整结构。
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_progress" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "reading_progress" (
        "id"              uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"          uuid         NOT NULL,
        "bookId"          varchar(64)  NOT NULL,
        "chapterId"       varchar(128) NULL,
        "chapterIndex"    integer      NOT NULL DEFAULT 0,
        "position"        integer      NOT NULL DEFAULT 0,
        "percent"         real         NOT NULL DEFAULT 0,
        "totalReadSec"    integer      NOT NULL DEFAULT 0,
        "lastReadAt"      timestamptz  NULL,
        "updatedAt"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_progress_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_progress_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_progress_user_book"
          UNIQUE ("userId", "bookId")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "reading_progress"."position"     IS '章节内字符偏移量'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_progress"."percent"       IS '全书阅读百分比 0.0-1.0'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_progress"."totalReadSec"  IS '累计阅读秒数'`);

    await queryRunner.query(`CREATE INDEX "idx_progress_user_id" ON "reading_progress" ("userId")`);
    // 同步增量拉取：按更新时间过滤
    await queryRunner.query(`CREATE INDEX "idx_progress_updated" ON "reading_progress" ("userId", "updatedAt" DESC)`);

    // --------------------------------------------------------- reading_sessions
    await queryRunner.query(`
      CREATE TABLE "reading_sessions" (
        "id"           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid         NOT NULL,
        "bookId"       varchar(64)  NOT NULL,
        "chapterId"    varchar(128) NULL,
        "chapterIndex" integer      NOT NULL DEFAULT 0,
        "startAt"      timestamptz  NOT NULL,
        "endAt"        timestamptz  NULL,
        "durationSec"  integer      NOT NULL DEFAULT 0,
        "pagesRead"    integer      NOT NULL DEFAULT 0,
        "platform"     varchar(20)  NULL,
        "appVersion"   varchar(20)  NULL,
        "createdAt"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sessions_reading_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sessions_reading_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "reading_sessions"."durationSec" IS '本次阅读时长（秒）'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_sessions"."platform"    IS 'harmony / ios / android / web'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_sessions"."pagesRead"   IS '翻页次数'`);

    // 用户阅读历史按时间倒序
    await queryRunner.query(`CREATE INDEX "idx_rsessions_user_start" ON "reading_sessions" ("userId", "startAt" DESC)`);
    // 书籍维度统计
    await queryRunner.query(`CREATE INDEX "idx_rsessions_book_id" ON "reading_sessions" ("bookId")`);
    // 运营数据分析按日期聚合
    await queryRunner.query(`CREATE INDEX "idx_rsessions_start_at" ON "reading_sessions" ("startAt")`);

    // --------------------------------------------------------- reading_highlights
    await queryRunner.query(`
      CREATE TABLE "reading_highlights" (
        "id"           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid         NOT NULL,
        "bookId"       varchar(64)  NOT NULL,
        "chapterId"    varchar(128) NOT NULL,
        "chapterIndex" integer      NOT NULL DEFAULT 0,
        "blockIndex"   integer      NOT NULL DEFAULT 0,
        "charOffset"   integer      NOT NULL DEFAULT 0,
        "charLength"   integer      NOT NULL DEFAULT 0,
        "selectedText" varchar(2000) NOT NULL,
        "color"        varchar(16)  NOT NULL DEFAULT 'yellow',
        "note"         text         NULL,
        "isDeleted"    boolean      NOT NULL DEFAULT false,
        "createdAt"    timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_highlights_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_highlights_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "reading_highlights"."color"      IS '高亮颜色标识: yellow / green / blue / pink'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_highlights"."blockIndex"  IS '段落块索引'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_highlights"."charOffset"  IS '段落内起始字符偏移'`);
    await queryRunner.query(`COMMENT ON COLUMN "reading_highlights"."charLength"  IS '高亮字符长度'`);

    // 按用户+书籍查询高亮（最常用）
    await queryRunner.query(`CREATE INDEX "idx_highlights_user_book" ON "reading_highlights" ("userId", "bookId")`);
    // 同步增量拉取
    await queryRunner.query(`CREATE INDEX "idx_highlights_updated" ON "reading_highlights" ("userId", "updatedAt" DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_highlights_updated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_highlights_user_book"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_highlights"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rsessions_start_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rsessions_book_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rsessions_user_start"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_sessions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_progress_updated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_progress_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_progress"`);
  }
}
