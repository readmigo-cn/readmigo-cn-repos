import type { MigrationInterface, QueryRunner } from 'typeorm';

// 原 1714521700000-Subscription.ts 的 subscriptions 表为最小化结构，
// 此迁移引入完整的订阅体系（plans / user_subscriptions / payment_orders / entitlements）。
// 旧 subscriptions 表保留，新表以新名称创建，避免数据丢失。
export class SubscriptionV21714522700000 implements MigrationInterface {
  name = 'SubscriptionV21714522700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------- subscription_plans
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id"              varchar(50)    PRIMARY KEY,
        "name"            varchar(100)   NOT NULL,
        "nameZh"          varchar(100)   NULL,
        "description"     text           NULL,
        "billingCycle"    varchar(20)    NOT NULL DEFAULT 'monthly',
        "priceYuan"       integer        NOT NULL DEFAULT 0,
        "priceUsd"        integer        NOT NULL DEFAULT 0,
        "currency"        varchar(3)     NOT NULL DEFAULT 'CNY',
        "productIdHms"    varchar(100)   NULL,
        "productIdApple"  varchar(100)   NULL,
        "productIdGoogle" varchar(100)   NULL,
        "features"        jsonb          NOT NULL DEFAULT '{}',
        "trialDays"       smallint       NOT NULL DEFAULT 0,
        "isActive"        boolean        NOT NULL DEFAULT true,
        "sortOrder"       integer        NOT NULL DEFAULT 0,
        "createdAt"       timestamptz    NOT NULL DEFAULT now(),
        "updatedAt"       timestamptz    NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."priceYuan"       IS '价格（分），人民币'`);
    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."priceUsd"        IS '价格（美分），美元'`);
    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."billingCycle"    IS 'monthly / yearly / lifetime'`);
    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."features"        IS 'JSON 权限集合，如 {"ai_chat":true,"vocab_limit":500}'`);
    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."productIdHms"    IS '华为 HMS IAP 商品 ID'`);
    await queryRunner.query(`COMMENT ON COLUMN "subscription_plans"."trialDays"       IS '免费试用天数，0 表示无试用'`);

    await queryRunner.query(`CREATE INDEX "idx_plans_active" ON "subscription_plans" ("isActive") WHERE "isActive" = true`);

    // --------------------------------------------------------- user_subscriptions
    await queryRunner.query(`
      CREATE TABLE "user_subscriptions" (
        "id"           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"       uuid         NOT NULL,
        "planId"       varchar(50)  NOT NULL,
        "status"       varchar(20)  NOT NULL DEFAULT 'pending',
        "provider"     varchar(20)  NOT NULL DEFAULT 'hms-iap',
        "purchaseToken" varchar(512) NULL,
        "orderId"      varchar(200) NULL,
        "startedAt"    timestamptz  NULL,
        "expiresAt"    timestamptz  NULL,
        "trialEndsAt"  timestamptz  NULL,
        "cancelledAt"  timestamptz  NULL,
        "autoRenew"    boolean      NOT NULL DEFAULT true,
        "rawReceipt"   text         NULL,
        "metadata"     jsonb        NULL,
        "createdAt"    timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_usub_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_usub_plan"
          FOREIGN KEY ("planId") REFERENCES "subscription_plans" ("id"),
        CONSTRAINT "chk_usub_status"
          CHECK ("status" IN ('pending', 'active', 'trialing', 'past_due', 'cancelled', 'expired'))
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "user_subscriptions"."provider"  IS 'hms-iap / apple-iap / google-play / manual'`);
    await queryRunner.query(`COMMENT ON COLUMN "user_subscriptions"."rawReceipt" IS '原始收据，用于服务端验签'`);
    await queryRunner.query(`COMMENT ON COLUMN "user_subscriptions"."metadata"   IS '扩展字段，如 IAP 回调原始数据'`);

    await queryRunner.query(`CREATE INDEX "idx_usub_user_id" ON "user_subscriptions" ("userId")`);
    // 查询用户当前有效订阅
    await queryRunner.query(`CREATE INDEX "idx_usub_user_status" ON "user_subscriptions" ("userId", "status")`);
    // 按到期时间批量处理（续费提醒定时任务）
    await queryRunner.query(`CREATE INDEX "idx_usub_expires_at" ON "user_subscriptions" ("expiresAt") WHERE "status" = 'active'`);

    // --------------------------------------------------------- payment_orders
    await queryRunner.query(`
      CREATE TABLE "payment_orders" (
        "id"            uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"        uuid         NOT NULL,
        "planId"        varchar(50)  NOT NULL,
        "subscriptionId" uuid        NULL,
        "orderNo"       varchar(100) NOT NULL,
        "externalOrderNo" varchar(200) NULL,
        "provider"      varchar(20)  NOT NULL,
        "amountYuan"    integer      NOT NULL DEFAULT 0,
        "currency"      varchar(3)   NOT NULL DEFAULT 'CNY',
        "status"        varchar(20)  NOT NULL DEFAULT 'pending',
        "paidAt"        timestamptz  NULL,
        "refundedAt"    timestamptz  NULL,
        "refundAmount"  integer      NOT NULL DEFAULT 0,
        "rawPayload"    text         NULL,
        "createdAt"     timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_order_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_plan"
          FOREIGN KEY ("planId") REFERENCES "subscription_plans" ("id"),
        CONSTRAINT "uq_order_no"
          UNIQUE ("orderNo"),
        CONSTRAINT "chk_order_status"
          CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'))
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "payment_orders"."amountYuan"    IS '实付金额（分）'`);
    await queryRunner.query(`COMMENT ON COLUMN "payment_orders"."orderNo"       IS '内部订单号，全局唯一'`);
    await queryRunner.query(`COMMENT ON COLUMN "payment_orders"."externalOrderNo" IS '三方支付平台订单号'`);
    await queryRunner.query(`COMMENT ON COLUMN "payment_orders"."rawPayload"    IS '三方回调原始报文，用于对账'`);

    await queryRunner.query(`CREATE INDEX "idx_orders_user_id" ON "payment_orders" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_orders_status" ON "payment_orders" ("status")`);
    // 按支付时间统计收入
    await queryRunner.query(`CREATE INDEX "idx_orders_paid_at" ON "payment_orders" ("paidAt") WHERE "paidAt" IS NOT NULL`);

    // --------------------------------------------------------- entitlements
    // 权益快照表：避免每次查订阅状态都 JOIN 多表，直接读取当前权益。
    await queryRunner.query(`
      CREATE TABLE "entitlements" (
        "id"             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId"         uuid         NOT NULL,
        "subscriptionId" uuid         NULL,
        "feature"        varchar(50)  NOT NULL,
        "value"          varchar(200) NOT NULL DEFAULT 'true',
        "expiresAt"      timestamptz  NULL,
        "grantedAt"      timestamptz  NOT NULL DEFAULT now(),
        "revokedAt"      timestamptz  NULL,
        CONSTRAINT "fk_entitlement_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_entitlement_user_feature"
          UNIQUE ("userId", "feature")
      )
    `);

    await queryRunner.query(`COMMENT ON COLUMN "entitlements"."feature"   IS '权益标识，如 ai_chat / vocab_unlimited / offline_read'`);
    await queryRunner.query(`COMMENT ON COLUMN "entitlements"."value"     IS '权益值，布尔用 "true"/"false"，数量限制用数字字符串'`);
    await queryRunner.query(`COMMENT ON COLUMN "entitlements"."expiresAt" IS 'NULL 表示永久权益（如终身会员）'`);
    await queryRunner.query(`COMMENT ON COLUMN "entitlements"."revokedAt" IS '非 NULL 表示已撤销，软删除语义'`);

    // 鉴权核心路径：查用户是否拥有某功能权益
    await queryRunner.query(`CREATE INDEX "idx_entitle_user_id" ON "entitlements" ("userId")`);
    // 按到期时间批量撤销过期权益（定时任务使用）
    await queryRunner.query(`CREATE INDEX "idx_entitle_expires" ON "entitlements" ("expiresAt") WHERE "expiresAt" IS NOT NULL AND "revokedAt" IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_entitle_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_entitle_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entitlements"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_paid_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_orders"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usub_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usub_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usub_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_subscriptions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_plans_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
  }
}
