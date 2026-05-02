import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Sync1714522500000 implements MigrationInterface {
  name = 'Sync1714522500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- sync_cursors
    // 每个用户每个数据集合维护一条游标记录，客户端增量同步使用。
    await queryRunner.query(`
      CREATE TABLE "sync_cursors" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"      uuid         NOT NULL,
        "collection"  varchar(50)  NOT NULL,
        "deviceId"    varchar(100) NULL,
        "cursor"      varchar(200) NOT NULL DEFAULT '0',
        "serverTime"  timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sync_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_sync_user_collection_device"
          UNIQUE ("userId", "collection", "deviceId")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "sync_cursors"."collection"  IS '同步集合名: bookshelf / progress / highlights / notes / vocab'`);
    await queryRunner.query(`COMMENT ON COLUMN "sync_cursors"."deviceId"    IS 'NULL 表示服务端游标（全局），非 NULL 为设备级游标'`);
    await queryRunner.query(`COMMENT ON COLUMN "sync_cursors"."cursor"      IS '增量同步游标值，格式由各集合自定义（时间戳或序列号）'`);

    // 按用户查所有游标（客户端启动时批量拉取）
    await queryRunner.query(`CREATE INDEX "idx_sync_user_id" ON "sync_cursors" ("userId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sync_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_cursors"`);
  }
}
