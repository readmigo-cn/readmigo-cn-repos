# 全栈技术方案明细（Readmigo 国内版）

本文是 `readmigo-cn-repos` 的正式全栈技术方案。目标不是罗列“可选技术”，而是明确每一层的主方案、同步边界、落地位置和下一步动作。

适用前提：

- 产品身份：`readmigo` 的中国大陆版本
- 技术前提：`纯血鸿蒙 + 国内全栈`
- 同步原则：满足该前提的同步，不满足的国内新开发

---

## 1. 客户端层

### 主方案

- `HarmonyOS NEXT`
- `ArkTS`
- `ArkUI`
- `DevEco Studio`

### 为什么这样定

- 国内版目标终端就是华为生态，不做跨 OS 优先
- 鸿蒙原生能力与 `AGC / HMS` 深度绑定
- 如果继续沿用 `Expo / React Native`，会直接偏离“纯血鸿蒙”

### 对齐 readmigo 的来源

- `readmigo-repos/mobile`

### 同步策略

- `同步`：信息架构、页面语义、功能优先级、阅读主链路
- `新开发`：页面实现、组件树、导航运行时、平台桥接

### 当前落地位置

- [apps/harmony-app](/Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app)

### 当前已落地骨架

- `Login`
- `Onboarding`
- `Discover`
- `Library`
- `Reader`
- `Me`

### 下一步

- 增加鸿蒙版导航壳
- 接入华为账号登录页
- 把 `Library -> Book -> Reader` 路径串起来

---

## 2. 后端服务层

### 主方案

- `NestJS`

### 为什么这样定

- 海外主仓后端就是 `NestJS`
- 国内版需要最大化复用模块边界和团队知识
- 直接切其他后端框架会显著提高同步成本

### 对齐 readmigo 的来源

- `readmigo-repos/api`

### 同步策略

- `同步`：模块边界、DTO 习惯、服务分层、AI 路由抽象
- `重写`：登录、支付、推送、分析、模型 provider、存储 provider

### 当前落地位置

- [server-cn](/Users/HONGBGU/Documents/readmigo-cn-repos/server-cn)

### 当前已落地骨架

- `health`
- `config`
- `auth`
- `users`
- `books`
- `bookshelf`
- `reading`
- `sync`
- `ai`

### 下一步

- 加 `GaussDB` 数据访问层
- 加 `Huawei Account` 登录校验
- 加 `HMS IAP` 订阅校验
- 继续从海外版对齐 `books / reading / sync` 领域接口

---

## 3. 数据层

### 主方案

- 主数据库：`华为云 GaussDB`
- 缓存：`华为云 DCS`
- 对象存储：`华为云 OBS`

### 为什么这样定

- 与华为终端生态和云资源管理更顺
- `GaussDB` 保留 PostgreSQL 兼容能力，迁移成本可控
- `OBS` 和 `DCS` 适合承接阅读内容、缓存、静态资源

### 对齐 readmigo 的来源

- `readmigo-repos/api` 的数据边界和业务表意

### 同步策略

- `同步`：表意和领域关系
- `重写`：连接方式、云资源配置、备份与权限体系

### 当前落地位置

- 当前仍在 [server-cn/.env.example](/Users/HONGBGU/Documents/readmigo-cn-repos/server-cn/.env.example) 里做资源占位

### 下一步

- 明确首批表结构
- 选定 ORM 或数据库访问策略
- 建立国内版 schema 与迁移目录

---

## 4. 模型与 AI 层

### 主方案

- 主模型：`DeepSeek`
- 适配层：`llm-adapter`
- 备选预留：`文心 / 智谱 / Qwen`

### 为什么这样定

- `DeepSeek` 适合作为国内版首个通用与编码模型
- 国内版不应默认依赖海外模型
- 需要模型抽象层来降低后续替换成本

### 对齐 readmigo 的来源

- `readmigo-repos/api/src/modules/ai`

### 同步策略

- `同步`：provider 抽象思路、路由入口、提示词模块化方式
- `重写`：模型 SDK、认证方式、计费、回退策略

### 当前落地位置

- [packages/llm-adapter](/Users/HONGBGU/Documents/readmigo-cn-repos/packages/llm-adapter)
- [server-cn/src/modules/ai](/Users/HONGBGU/Documents/readmigo-cn-repos/server-cn/src/modules/ai)

### 下一步

- 增加 `Qwen / GLM / Wenxin` provider 接口
- 增加模型路由策略
- 增加 AI 功能级别开关

---

## 5. AI Coding 层

### 主方案

- 终端：`Qwen Code CLI + 阿里云百炼`
- IDE：`通义灵码`

### 为什么这样定

- 你要求的是终端 AI coding
- `Qwen Code` 已经在本机安装完成
- 终端工作流比 IDE 内嵌智能体更符合当前项目模式

### 当前落地位置

- [QWEN.md](/Users/HONGBGU/Documents/readmigo-cn-repos/QWEN.md)
- [tools/ai-coding/terminal/README.md](/Users/HONGBGU/Documents/readmigo-cn-repos/tools/ai-coding/terminal/README.md)
- [tools/ai-coding/terminal/qwen-settings.example.json](/Users/HONGBGU/Documents/readmigo-cn-repos/tools/ai-coding/terminal/qwen-settings.example.json)

### 下一步

- 用新百炼密钥完成本机持久认证
- 建项目级 prompt 和 review checklist

---

## 6. 身份认证层

### 主方案

- 主登录：`华为账号`
- 备选补充：`微信登录`

### 为什么这样定

- 国内版主场景就是华为终端
- 认证入口应优先围绕华为生态

### 对齐 readmigo 的来源

- `readmigo-repos/api/src/modules/auth`
- `readmigo-repos/mobile/app/(auth)`

### 同步策略

- `同步`：认证业务边界、用户会话概念、入门路径
- `重写`：登录 provider、token 校验、账号绑定逻辑

### 当前落地位置

- [server-cn/src/modules/auth](/Users/HONGBGU/Documents/readmigo-cn-repos/server-cn/src/modules/auth)
- [apps/harmony-app/entry/src/main/ets/pages/Login.ets](/Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app/entry/src/main/ets/pages/Login.ets)

### 下一步

- 接 `Huawei Account Kit`
- 设计国内版用户身份表

---

## 7. 支付与订阅层

### 主方案

- `HMS IAP`

### 为什么这样定

- 国内版鸿蒙应用商业化主通道必须是 HMS
- 订阅状态应和鸿蒙账号生态对齐

### 对齐 readmigo 的来源

- `readmigo-repos/api/src/modules/subscriptions`

### 同步策略

- `同步`：订阅领域模型、权益边界、订单校验流程
- `重写`：支付 provider、回调、对账

### 当前状态

- 方案已定，代码未接

### 下一步

- 补 `subscriptions` 模块骨架
- 定义商品与权益模型

---

## 8. 推送、分析与灰度层

### 主方案

- 推送：`HMS Push`
- 分析：`HMS Analytics`
- 崩溃：`AGC Crash`
- 灰度：`AGC Remote Config`

### 为什么这样定

- 这些都是鸿蒙生态内原生能力
- 自建替代品没有必要，且上线链路更脆

### 对齐 readmigo 的来源

- `readmigo-repos/api/src/modules/notifications`
- `readmigo-repos/api/src/modules/analytics`

### 同步策略

- `同步`：事件分类、业务字段、触发点
- `重写`：provider 接口、发送通道、控制台配置

### 当前状态

- 方案已定，未接代码

### 下一步

- 建立国内版事件字典
- 选出第一批关键事件

---

## 9. 原生引擎层

### 主方案

- `typesetting`
- `badge-engine`

### 为什么这样定

- 它们是 `readmigo` 的核心资产
- 纯血鸿蒙不排斥复用 C/C++ 核心，只排斥继续依赖 Apple / RN 运行时

### 对齐 readmigo 的来源

- `readmigo-repos/typesetting`
- `readmigo-repos/badge-engine`

### 同步策略

- `同步`：C/C++ 核心源码
- `重写`：Apple 桥接、iOS 构建脚本、平台接口实现

### 当前状态

- 还未真正同步到 `native/`

### 下一步

- 先同步核心源码
- 再设计 Harmony NAPI / C API 桥接层

---

## 10. 同步策略层

### 主方案

- 以“兼容纯血鸿蒙和国内全栈”为唯一同步判断标准

### 当前落地位置

- [docs/11-readmigo-sync-matrix.md](/Users/HONGBGU/Documents/readmigo-cn-repos/docs/11-readmigo-sync-matrix.md)
- [scripts/sync/readmigo-sync-manifest.json](/Users/HONGBGU/Documents/readmigo-cn-repos/scripts/sync/readmigo-sync-manifest.json)

### 执行规则

- 满足前提：同步
- 逻辑可复用但依赖不兼容：同步后重写
- 运行时冲突：国内新开发

---

## 11. 当前仓库与方案映射

| 目录 | 角色 | 状态 |
|------|------|------|
| `apps/harmony-app/` | 鸿蒙客户端 | 已起骨架 |
| `server-cn/` | 国内后端 | 已起骨架 |
| `packages/llm-adapter/` | 模型抽象层 | 已起骨架 |
| `native/` | 原生引擎同步区 | 待同步 |
| `tools/ai-coding/` | AI coding 规则与模板 | 已起骨架 |
| `docs/` | 方案、路线图、同步规则 | 已建立 |

---

## 12. 下一步实施顺序

1. 同步 `typesetting` 与 `badge-engine` 的核心源码到 `native/`
2. 继续把 `server-cn` 细化成可运行国内版基础后端
3. 把 `harmony-app` 做成真正的 `auth + tabs + reader` 主链路
4. 开始接 `AGC / Huawei Account / HMS IAP`
