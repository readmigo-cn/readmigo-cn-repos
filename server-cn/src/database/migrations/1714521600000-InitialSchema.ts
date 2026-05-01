import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1714521600000 implements MigrationInterface {
  name = 'InitialSchema1714521600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ----- users -----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phone"       varchar(32),
        "huaweiOpenId" varchar(64),
        "nickname"    varchar(64) NOT NULL,
        "avatarUrl"   varchar(512),
        "cefrLevel"   varchar(16) NOT NULL DEFAULT 'B1',
        "locale"      varchar(16) NOT NULL DEFAULT 'zh-CN',
        "isInternal"  boolean NOT NULL DEFAULT false,
        "createdAt"   timestamptz NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_huawei" ON "users" ("huaweiOpenId") WHERE "huaweiOpenId" IS NOT NULL`);

    // ----- books -----
    await queryRunner.query(`
      CREATE TABLE "books" (
        "id"             varchar(64) PRIMARY KEY,
        "title"          varchar(256) NOT NULL,
        "author"         varchar(128),
        "coverUrl"       varchar(512),
        "description"    text,
        "language"       varchar(8)  NOT NULL DEFAULT 'en',
        "cefrLevel"      varchar(16),
        "totalChapters"  integer NOT NULL DEFAULT 0,
        "source"         varchar(32) NOT NULL DEFAULT 'standard-ebooks',
        "isPublished"    boolean NOT NULL DEFAULT false,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_books_title" ON "books" ("title")`);
    await queryRunner.query(`CREATE INDEX "idx_books_published" ON "books" ("isPublished") WHERE "isPublished" = true`);

    // ----- reading_progress -----
    await queryRunner.query(`
      CREATE TABLE "reading_progress" (
        "id"         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"     uuid NOT NULL,
        "bookId"     varchar(64) NOT NULL,
        "chapterId"  varchar(128),
        "position"   integer NOT NULL DEFAULT 0,
        "percent"    real    NOT NULL DEFAULT 0,
        "updatedAt"  timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_reading_user_book" ON "reading_progress" ("userId", "bookId")`);

    // ----- bookshelf_items -----
    await queryRunner.query(`
      CREATE TABLE "bookshelf_items" (
        "id"      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"  uuid NOT NULL,
        "bookId"  varchar(64) NOT NULL,
        "status"  varchar(16) NOT NULL DEFAULT 'reading',
        "addedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_shelf_user_book" ON "bookshelf_items" ("userId", "bookId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bookshelf_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "books"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
