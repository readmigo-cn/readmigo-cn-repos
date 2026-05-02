import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 对齐 user_subscriptions.provider 与 payment_orders.provider 的枚举值。
 *
 * 背景：
 *   - 1714522700000-SubscriptionV2 创建 user_subscriptions 时
 *     注释里只列了 hms-iap / apple-iap / google-play / manual。
 *   - 但 PaymentOrder（payment_orders.provider）以及 PaymentProvider 类型
 *     还包含 wechat-pay / alipay。订单支付成功后会回填到 user_subscriptions.provider，
 *     这两张表的 provider 必须一致。
 *
 * 当前 user_subscriptions.provider 是 varchar(20) 没有 CHECK 约束，
 * 所以无需 ALTER COLUMN，新值天然可写入。本迁移只更新列注释，
 * 把可选枚举值显式记录下来，避免后人 review schema 时再次出错。
 *
 * 同步：subscription.entity.ts SubscriptionEntity.provider 类型也已扩展。
 */
export class SubscriptionProviderAlign1714522800000 implements MigrationInterface {
  name = 'SubscriptionProviderAlign1714522800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // user_subscriptions.provider —— 枚举注释对齐 payment_orders
    await queryRunner.query(
      `COMMENT ON COLUMN "user_subscriptions"."provider" IS 'hms-iap / apple-iap / google-play / wechat-pay / alipay / manual'`,
    );

    // 历史 payment_orders.provider 没设注释，这里补一份保持一致
    await queryRunner.query(
      `COMMENT ON COLUMN "payment_orders"."provider" IS 'hms-iap / apple-iap / google-play / wechat-pay / alipay / manual'`,
    );

    // 同时给老的 subscriptions 表（最早的最小化结构，仍在用）补一份注释
    // 该表无 provider 列约束，仅做文档化
    await queryRunner.query(
      `COMMENT ON COLUMN "subscriptions"."provider" IS 'hms-iap / apple-iap / google-play / wechat-pay / alipay / manual'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复 SubscriptionV2 中的旧注释
    await queryRunner.query(
      `COMMENT ON COLUMN "user_subscriptions"."provider" IS 'hms-iap / apple-iap / google-play / manual'`,
    );
    await queryRunner.query(`COMMENT ON COLUMN "payment_orders"."provider" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "subscriptions"."provider" IS NULL`);
  }
}
