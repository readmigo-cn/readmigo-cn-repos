import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Subscription1714521700000 implements MigrationInterface {
  name = 'Subscription1714521700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid NOT NULL,
        "plan"         varchar(32) NOT NULL,
        "status"       varchar(16) NOT NULL DEFAULT 'pending',
        "provider"     varchar(16) NOT NULL DEFAULT 'hms-iap',
        "purchaseToken" varchar(512),
        "productId"    varchar(64),
        "startedAt"    timestamptz,
        "expiresAt"    timestamptz,
        "autoRenew"    boolean NOT NULL DEFAULT true,
        "rawReceipt"   text,
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_subs_user" ON "subscriptions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_subs_status" ON "subscriptions" ("status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
  }
}
