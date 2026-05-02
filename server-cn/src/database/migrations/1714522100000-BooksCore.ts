import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BooksCore1714522100000 implements MigrationInterface {
  name = 'BooksCore1714522100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------ books
    // 原 InitialSchema 的 books 表已有基础字段，此处重建为生产级完整结构。
    await queryRunner.query(`DROP TABLE IF EXISTS "books" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "books" (
        "id"            varchar(64)   PRIMARY KEY,
        "title"         varchar(256)  NOT NULL,
        "titleZh"       varchar(256)  NULL,
        "author"        varchar(128)  NULL,
        "translator"    varchar(128)  NULL,
        "coverUrl"      text          NULL,
        "description"   text          NULL,
        "descriptionZh" text          NULL,
        "language"      varchar(8)    NOT NULL DEFAULT 'en',
        "cefrLevel"     varchar(5)    NULL,
        "totalChapters" integer       NOT NULL DEFAULT 0,
        "totalWords"    integer       NOT NULL DEFAULT 0,
        "source"        varchar(32)   NOT NULL DEFAULT 'standard-ebooks',
        "sourceUrl"     text          NULL,
        "isbn"          varchar(20)   NULL,
        "publishYear"   smallint      NULL,
        "genres"        text[]        NOT NULL DEFAULT '{}',
        "tags"          text[]        NOT NULL DEFAULT '{}',
        "isPublished"   boolean       NOT NULL DEFAULT false,
        "isFeatured"    boolean       NOT NULL DEFAULT false,
        "isDeleted"     boolean       NOT NULL DEFAULT false,
        "readCount"     integer       NOT NULL DEFAULT 0,
        "finishCount"   integer       NOT NULL DEFAULT 0,
        "avgRating"     real          NULL,
        "ratingCount"   integer       NOT NULL DEFAULT 0,
        "sortOrder"     integer       NOT NULL DEFAULT 0,
        "createdAt"     timestamptz   NOT NULL DEFAULT now(),
        "updatedAt"     timestamptz   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "books"."cefrLevel" IS 'CEFR 难度等级: A1/A2/B1/B2/C1/C2'`);
    await queryRunner.query(`COMMENT ON COLUMN "books"."genres"    IS '体裁数组，如 fiction/classic/romance'`);
    await queryRunner.query(`COMMENT ON COLUMN "books"."tags"      IS '标签数组，用于多维筛选'`);
    await queryRunner.query(`COMMENT ON COLUMN "books"."source"    IS 'standard-ebooks / gutenberg / custom'`);
    await queryRunner.query(`COMMENT ON COLUMN "books"."isFeatured" IS '精选推荐标记，用于首页展示'`);

    // 已发布书目列表（最常用查询路径）
    await queryRunner.query(`CREATE INDEX "idx_books_published" ON "books" ("isPublished", "sortOrder") WHERE "isPublished" = true AND "isDeleted" = false`);
    await queryRunner.query(`CREATE INDEX "idx_books_language" ON "books" ("language") WHERE "isPublished" = true`);
    await queryRunner.query(`CREATE INDEX "idx_books_cefr" ON "books" ("cefrLevel") WHERE "cefrLevel" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "idx_books_featured" ON "books" ("isFeatured") WHERE "isFeatured" = true`);
    // GIN 索引支持数组包含查询（genres @> '{fiction}' 语法）
    await queryRunner.query(`CREATE INDEX "idx_books_genres_gin" ON "books" USING GIN ("genres")`);
    await queryRunner.query(`CREATE INDEX "idx_books_tags_gin" ON "books" USING GIN ("tags")`);
    // 书名文本搜索（不依赖 pg_trgm，使用 to_tsvector 全文索引）
    await queryRunner.query(`CREATE INDEX "idx_books_title_fts" ON "books" USING GIN (to_tsvector('simple', "title"))`);

    // --------------------------------------------------------------- book_chapters
    await queryRunner.query(`
      CREATE TABLE "book_chapters" (
        "id"           varchar(128)  PRIMARY KEY,
        "bookId"       varchar(64)   NOT NULL,
        "chapterIndex" integer       NOT NULL,
        "title"        varchar(256)  NULL,
        "titleZh"      varchar(256)  NULL,
        "wordCount"    integer       NOT NULL DEFAULT 0,
        "readTimeMin"  smallint      NOT NULL DEFAULT 0,
        "contentUrl"   text          NULL,
        "contentHash"  varchar(64)   NULL,
        "isPublished"  boolean       NOT NULL DEFAULT false,
        "createdAt"    timestamptz   NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_chapters_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_chapter_book_index"
          UNIQUE ("bookId", "chapterIndex")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "book_chapters"."contentUrl"  IS 'CDN URL，存储章节正文（HTML/JSON）'`);
    await queryRunner.query(`COMMENT ON COLUMN "book_chapters"."contentHash" IS 'SHA-256 of content，用于增量更新校验'`);
    await queryRunner.query(`COMMENT ON COLUMN "book_chapters"."readTimeMin" IS '预估阅读时长（分钟）'`);

    await queryRunner.query(`CREATE INDEX "idx_chapters_book_id" ON "book_chapters" ("bookId")`);

    // --------------------------------------------------------------- book_assets
    await queryRunner.query(`
      CREATE TABLE "book_assets" (
        "id"        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "bookId"    varchar(64) NOT NULL,
        "type"      varchar(20) NOT NULL,
        "url"       text        NOT NULL,
        "sizeBytes" bigint      NULL,
        "mimeType"  varchar(64) NULL,
        "locale"    varchar(10) NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_assets_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "book_assets"."type" IS '资产类型: epub / pdf / audio / cover_hd'`);

    await queryRunner.query(`CREATE INDEX "idx_assets_book_id" ON "book_assets" ("bookId")`);
    await queryRunner.query(`CREATE INDEX "idx_assets_type" ON "book_assets" ("bookId", "type")`);

    // --------------------------------------------------------------- book_ratings
    await queryRunner.query(`
      CREATE TABLE "book_ratings" (
        "id"        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "bookId"    varchar(64) NOT NULL,
        "userId"    uuid        NOT NULL,
        "score"     smallint    NOT NULL,
        "review"    text        NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ratings_book"
          FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ratings_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_rating_user_book"
          UNIQUE ("userId", "bookId"),
        CONSTRAINT "chk_rating_score"
          CHECK ("score" BETWEEN 1 AND 5)
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "book_ratings"."score" IS '评分 1-5 分'`);

    await queryRunner.query(`CREATE INDEX "idx_ratings_book_id" ON "book_ratings" ("bookId")`);
    await queryRunner.query(`CREATE INDEX "idx_ratings_user_id" ON "book_ratings" ("userId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ratings_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ratings_book_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "book_ratings"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_book_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "book_assets"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chapters_book_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "book_chapters"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_title_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_tags_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_genres_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_featured"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_cefr"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_books_published"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "books"`);
  }
}
