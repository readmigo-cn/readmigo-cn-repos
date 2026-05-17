# harmony-app 架构

本应用采用 **Hybrid feature-first 架构**，源自 2026-05-17 的架构重构（PR-0 ~ PR-7）。

## 顶层目录

`entry/src/main/ets/`:

- `entryability/` `abilities/` — Ability 入口
- `core/` — 跨切关注点与平台能力（router/shell/native/persistence/widget/theme/extensions/analytics/monitoring/performance/cache/experiments/moderation/dynamic/atomic）
- `ui/` — 跨 feature 共享 UI（primitives/responsive/lazy/sheets）
- `api/` — HTTP 客户端，按业务域分包（client/books/auth/reading/ai/notes/study/subscription/support/widget）
- `store/` — 全局响应式 store（UserStore/SettingsStore/ReadingStore/AudioPlayerStore）
- `model/` — 单一源 domain model（对齐 server-cn DTO）
- `features/` — 15 个垂直 feature：
  - reader / library / audiobook / vocab — 核心阅读链
  - discover / notes / ai-tools — 学习辅助
  - account / support / study — 账户与服务
  - notification / admin — 系统能力
  - multi-device / multi-platform — 鸿蒙生态适配
  - dev — 开发者工具（release 中条件排除）

## 层间依赖规则

| 层 | 可以 import | 禁止 import |
|---|---|---|
| `features/<X>/` | core, ui, api, store, model | 其他 `features/<Y>/`（跨 feature 走 store/api，例外见下） |
| `api/<域>/` | core/native, model | features, ui, store（`api/client/` 可读 store 取 auth token） |
| `store/` | api, core/persistence, model | features, ui |
| `model/` | — | 任何运行时模块 |
| `ui/` | core/theme, model（类型） | features, api, store |
| `core/` | 同层之间允许 | features, ui, api, store（composition root 例外见下） |

`scripts/check-import-boundary.mjs` 在 hvigor pre-build 中强制执行。

### 例外白名单

以下路径在 boundary 脚本中明确允许，原因为「composition root / 工程现实」：

| 来源路径 | 允许 import |
|---|---|
| `core/shell/` | features, ui, store, api（app 装配根） |
| `core/widget/` | api, store, features（Widget ExtensionAbility 是独立运行实体） |
| `core/router/` | store（auth-guard 读 UserStore） |
| `core/theme/` | store（ThemeService 持久化用户偏好） |
| `core/experiments/` | store（取 user group） |
| `api/client/` | store（拦截器从 UserStore 取 token） |

### 跨 feature 允许清单

部分 feature 间确有合理依赖，已在脚本中显式声明：

- `reader` → `ai-tools` / `audiobook` / `multi-device`：阅读时调起词义解释、朗读、设备协同
- `vocab` → `ai-tools` / `audiobook` / `multi-device`：SRS 复习用到解释卡 / TTS / 剪贴板
- `multi-platform` → `ai-tools` / `notes`：多端布局聚合多 feature 能力
- `multi-device` → `notes` / `multi-platform`：分布式同步需写笔记 / 读 watch 端展示

后续可考虑将共享组件（如 ExplainCard / WordExplainSheet）下沉到 `ui/sheets/`，进一步收敛跨 feature 依赖。

## 新增 feature 流程

1. `mkdir -p features/<new>/{pages,components,service}`
2. 写 `features/<new>/index.ets` barrel
3. 在 `core/router/RouteConstants.ets` 的 `// ── new entries below ──` 锚点下添加路由常量
4. 在 `entry/src/main/resources/base/profile/main_pages.json` 注册新页面
5. 跑 `hvigor assembleHap`，确认 import boundary 通过

## 历史 spec & plan

- 设计：`docs/specs/2026-05-17-harmony-app-feature-first-design.md`
- 实施计划：`docs/specs/2026-05-17-harmony-app-feature-first-impl-plan.md`

## Phase 2 followup（与重构无关，单独跟踪）

- AudioPlayerStore 响应式范式重构（callback → @ObservedV2 / @Trace）
- server-cn Audiobook DTO 对齐
- 性能 / 启动 / 渲染优化
- HarmonyOS HAR/HSP 物理模块化
- 将跨 feature 共享 UI 下沉到 `ui/sheets/`，缩减白名单
