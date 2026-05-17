# harmony-app

`HarmonyOS NEXT` 主应用，使用 **Hybrid feature-first 架构**。完整设计与层间依赖规则参见
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)。

## 模块布局速览

`entry/src/main/ets/` 下分为以下几层：

| 层 | 内容 |
|---|---|
| `entryability/` / `abilities/` | Ability 入口 |
| `core/` | 跨切关注点（router / shell / native / persistence / widget / theme 等） |
| `ui/` | 跨 feature 共享 UI（primitives / responsive / lazy） |
| `api/` | HTTP 客户端 + 按业务域分包的 REST API |
| `store/` | 全局响应式 store（UserStore / SettingsStore / ReadingStore / AudioPlayerStore） |
| `model/` | 单一源 domain model（对齐 server-cn DTO） |
| `features/` | 15 个垂直 feature（reader / library / audiobook / vocab / discover / notes / ai-tools / account / support / study / notification / admin / multi-device / multi-platform / dev） |

层间依赖通过 `scripts/check-import-boundary.mjs` 在 hvigor pre-build 中强制执行。

## 当前已对齐的页面语义

页面语义对齐 `readmigo-repos/mobile`，已覆盖：

- 阅读链：`Login` / `Onboarding` / `Discover` / `Library` / `Reader` / `Me`
- 学习辅助：`Notes` / `Vocab` / `FlashcardSession` / `ReadingComprehension` / `StudyPlan` / `WordAssociation` / `WordFamily` / `VocabStats` / `WeaknessAnalysis`
- 账户与服务：`Subscriptions` / `RefundFlow` / `Contact` / `PasswordReset`
- Support / 系统：`Feedback` / `TicketList` / `TicketDetail` / `Faq` / `About` / `UserAgreement` / `PrivacyPolicy` / `OssLicenses` / `NotificationCenter`
- 多端：`AudiobookTab` / `AudiobookPlayer` / Watch / Tablet 子布局
- 开发者：`XComponentDemo` / `ComponentGallery`

## 接入华为后台时仍需补齐

- `entry/agconnect-services.json`
- 签名证书
- 实际 `bundleName`
- 实际 SDK 版本号
