import type { MigrationInterface, QueryRunner } from 'typeorm';

export class VocabNotesAndSync1714521900000 implements MigrationInterface {
  name = 'VocabNotesAndSync1714521900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── vocab_notes ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "vocab_notes" (
        "id"                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"               uuid NOT NULL,
        "word"                 varchar(128) NOT NULL,
        "lemma"                varchar(128),
        "pronunciation"        varchar(256),
        "definition"           text,
        "exampleSentence"      text,
        "sourceBookId"         varchar(64),
        "sourceChapterIndex"   integer,
        "sourceParagraphIndex" integer,
        "sourceContext"        text,
        "userTag"              varchar(64),
        "aiTags"               text,
        "partOfSpeech"         varchar(32),
        "difficulty"           integer NOT NULL DEFAULT 3,
        "nextReviewAt"         timestamptz,
        "lastReviewedAt"       timestamptz,
        "reviewCount"          integer NOT NULL DEFAULT 0,
        "easinessFactor"       real NOT NULL DEFAULT 2.5,
        "interval"             integer NOT NULL DEFAULT 0,
        "createdAt"            timestamptz NOT NULL DEFAULT now(),
        "updatedAt"            timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_vocab_notes_user_word"     ON "vocab_notes" ("userId", "word")`);
    await queryRunner.query(`CREATE INDEX "idx_vocab_notes_user_review"   ON "vocab_notes" ("userId", "nextReviewAt")`);
    await queryRunner.query(`CREATE INDEX "idx_vocab_notes_user_book"     ON "vocab_notes" ("userId", "sourceBookId")`);

    // ── vocab_review_logs ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "vocab_review_logs" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"        uuid NOT NULL,
        "vocabNoteId"   uuid NOT NULL,
        "reviewedAt"    timestamptz NOT NULL,
        "quality"       integer NOT NULL,
        "priorEasiness" real NOT NULL,
        "newEasiness"   real NOT NULL,
        "priorInterval" integer NOT NULL,
        "newInterval"   integer NOT NULL,
        "response"      varchar(16) NOT NULL DEFAULT 'correct'
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_review_logs_user_date"  ON "vocab_review_logs" ("userId", "reviewedAt")`);
    await queryRunner.query(`CREATE INDEX "idx_review_logs_vocab_note" ON "vocab_review_logs" ("vocabNoteId")`);

    // ── personal_notes ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "personal_notes" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid NOT NULL,
        "bookId"       varchar(64),
        "chapterIndex" integer,
        "content"      text NOT NULL,
        "tags"         text,
        "isPublic"     boolean NOT NULL DEFAULT false,
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_personal_notes_user_date" ON "personal_notes" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "idx_personal_notes_user_book" ON "personal_notes" ("userId", "bookId")`);

    // ── sync_cursors ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sync_cursors" (
        "id"                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"             uuid NOT NULL,
        "deviceId"           varchar(128) NOT NULL,
        "entityType"         varchar(32) NOT NULL,
        "lastSyncedAt"       timestamptz NOT NULL DEFAULT now(),
        "lastSyncedVersion"  bigint NOT NULL DEFAULT 0,
        CONSTRAINT "uq_sync_cursors_user_device_entity" UNIQUE ("userId", "deviceId", "entityType")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_cursors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "personal_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vocab_review_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vocab_notes"`);
  }
}
