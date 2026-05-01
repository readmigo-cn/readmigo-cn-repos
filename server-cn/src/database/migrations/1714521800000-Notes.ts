import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Notes1714521800000 implements MigrationInterface {
  name = 'Notes1714521800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid NOT NULL,
        "bookId"       varchar(64) NOT NULL,
        "chapterId"    varchar(128),
        "blockIndex"   integer NOT NULL DEFAULT 0,
        "charOffset"   integer NOT NULL DEFAULT 0,
        "charLength"   integer NOT NULL DEFAULT 0,
        "originalText" varchar(2000) NOT NULL,
        "noteText"     text,
        "kind"         varchar(16) NOT NULL DEFAULT 'highlight',
        "color"        varchar(16),
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notes_user_book" ON "notes" ("userId", "bookId")`);
    await queryRunner.query(`CREATE INDEX "idx_notes_book_chapter" ON "notes" ("bookId", "chapterId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notes"`);
  }
}
