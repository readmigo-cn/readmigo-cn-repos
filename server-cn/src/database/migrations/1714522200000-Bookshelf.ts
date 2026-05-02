import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Bookshelf1714522200000 implements MigrationInterface {
  name = 'Bookshelf1714522200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- bookshelf_items
    // 原 InitialSchema 的 bookshelf_items 字段较少，此处重建为完整结构。
    await queryRunner.query(`DROP TABLE IF EXISTS "bookshelf_items" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "bookshelf_items" (
        "id"           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid        NOT NULL,
        "bookId"       varchar(64) NOT NULL,
        "status"       varchar(16) NOT NULL DEFAULT 'reading',
        "readPercent"  real        NOT NULL DEFAULT 0,
        "startedAt"    timestamptz NULL,
        "finishedAt"   timestamptz NULL,
        "pinnedAt"     timestamptz NULL,
        "sortOrder"    integer     NOT NULL DEFAULT 0,
        "addedAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_shelf_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_shelf_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_shelf_user_book"
          UNIQUE ("userId", "bookId"),
        CONSTRAINT "chk_shelf_status"
          CHECK ("status" IN ('want_to_read', 'reading', 'finished', 'abandoned'))
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "bookshelf_items"."status"      IS '阅读状态: want_to_read / reading / finished / abandoned'`);
    await queryRunner.query(`COMMENT ON COLUMN "bookshelf_items"."readPercent"  IS '阅读进度百分比 0.0-1.0'`);
    await queryRunner.query(`COMMENT ON COLUMN "bookshelf_items"."pinnedAt"     IS '置顶时间，NULL 表示未置顶'`);

    // 按用户查询书架（最常用）
    await queryRunner.query(`CREATE INDEX "idx_shelf_user_id" ON "bookshelf_items" ("userId")`);
    // 按状态过滤
    await queryRunner.query(`CREATE INDEX "idx_shelf_user_status" ON "bookshelf_items" ("userId", "status")`);
    // 更新时间排序（同步增量拉取使用）
    await queryRunner.query(`CREATE INDEX "idx_shelf_updated_at" ON "bookshelf_items" ("userId", "updatedAt" DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shelf_updated_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shelf_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shelf_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookshelf_items"`);
  }
}
