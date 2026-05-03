# 米果智读（Readmigo 国内本地化版）项目主文件

> **项目代号**：`readmigo-cn-repos`
> **中文产品名**：米果智读（Readmigo 中文版）
> **创建日期**：2026-04-26
> **位置**：`/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/`（与 `readmigo-repos/` 平级目录）
>
> 米果智读 = **Readmigo 海外版的国内本地化分支**，**同一款产品**：
> - **同一公司主体**：北京瑞光科技有限公司
> - **国内独立技术栈**（华为云 / DeepSeek / Gitee）= 工程考量（合规 + 国内开发链路），非产品独立
> - **代码可双向参考**：海外版的领域设计、AI provider 抽象、模块边界等可同步；运行时/SDK/第三方服务必须替换
> - **不使用 git submodule，不做自动同步**（拷贝起步后各自演化，详见 [docs/11-readmigo-sync-matrix.md](./docs/11-readmigo-sync-matrix.md)）

---

## 0. 项目身份

### 0.1 定位

| 维度 | 内容 |
|------|------|
| **是什么** | 面向中国大陆华为终端用户的**纯血鸿蒙原生**英文阅读 + AI 学习产品 |
| **本质** | Readmigo 同一款产品的**国内 + 鸿蒙双重本地化版本** |
| **目标平台** | HarmonyOS NEXT 5.0+ (API 12+)，面向 1+8+N 全场景 |
| **目标用户** | 国内华为终端用户（Mate / P / MatePad / 折叠屏 / 手表 / 智慧屏 / 车机） |
| **商业模式** | 应用内购（HMS IAP）+ 订阅 + 内容生态 |

### 0.2 海外版 vs 国内本地化版

```
┌────────────────────┐         ┌────────────────────┐
│  Readmigo 海外版    │  同一款 │  米果智读（国内版）     │
│  readmigo-repos/   │  产品   │  readmigo-cn-repos/│
│                    │         │                    │
│  ✓ 北京瑞光         │  同一   │  ✓ 北京瑞光         │
│  ✓ GitHub          │  公司   │  ✓ Gitee / 极狐     │
│  ✓ Neon/Cloudflare │  主体   │  ✓ 华为云           │
│  ✓ OpenAI/Claude   │         │  ✓ DeepSeek/文心    │
│  ✓ App Store/GP    │         │  ✓ 华为应用市场      │
│  ✓ readmigo.app    │         │  ✓ readmigo.cn      │
└────────────────────┘         └────────────────────┘

国内独立技术栈 = 工程考量（合规 + 国内开发链路）
代码层面：领域设计可同步；运行时/SDK 必须替换
```

**关键原则：技术栈隔离（工程考量）/ 数据合规隔离（法规要求）/ 路线图独立演化（市场差异）**

| 维度 | 海外版 | 国内版（本项目） | 关系 |
|------|------|------|------|
| 法律主体 | 海外公司 | 境内公司 | ❌ 独立 |
| 代码托管 | GitHub | Gitee + 极狐 GitLab 自部署备份 | ❌ 独立 |
| 用户数据 | 海外 PostgreSQL | 华为云 GaussDB | ❌ 完全不互通 |
| 域名 | readmigo.app | readmigo.cn | ❌ 独立 |
| LLM provider | OpenAI / Claude | DeepSeek / 文心 / 智谱 / Qwen | ❌ 独立 |
| 团队 | 海外团队 | 国内团队 | ❌ 独立 |
| 路线图 | 海外路线图 | 国内路线图（本文 §4） | ❌ 独立 |
| C++ 排版引擎 | typesetting repo | 拷贝起步，国内独立 fork 演化 | 🟡 一次性拷贝（无 submodule） |
| C++ 勋章引擎 | badge-engine repo | 拷贝起步，国内独立 fork 演化 | 🟡 一次性拷贝（无 submodule） |
| LLM Prompt 模板 | 海外 prompts | 国内化重写 + 中文优化 | 🟡 参考但不绑定 |
| 设计 token | 海外设计系统 | HarmonyOS Design 适配，国内独立 | 🟡 参考但不绑定 |

### 0.3 启动信号

- ✅ 已完成 [可行性评估](../job/applications/2026-04-17-中智人力服务/readmigo-harmony-feasibility.md)（74% 复用率 / 22 周 / 18 万）
- ✅ 已完成 [100% 拥抱 Roadmap](../job/applications/2026-04-17-中智人力服务/harmony-100pct-roadmap.md)（6 Phase / 上架 SOP）
- ⏳ 等待 Phase 0 启动决策（合规备案 + 团队 + 设备）

---

## 1. 国内栈完整选型（11 维度 ✅）

> 每一维都做了选型 + 备选 + 决策理由。这是国内项目的**国产化技术底座**。

### 1.1 代码托管 + DevOps 平台

| 维度 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **代码托管** | **Gitee 企业版**（开源中国） | 极狐 GitLab 私有部署 / CODING（腾讯） | Gitee 1350 万用户，国内最大；和华为 / 中智央企客户对齐 |
| **代码托管备份** | **极狐 GitLab CE 自部署** | — | 灾备 + 数据完全可控（合规要求） |
| **CI/CD** | **Gitee Actions** + **Jenkins 自部署** | CODING DevOps | Gitee Actions 兼容 GitHub Actions yml 语法，可平移 |
| **制品库** | **Nexus 自部署** | Gitee Packages | 私有 .so / HAP 包管理 |
| **项目管理** | **Gitee Issues + Wiki** | Lark / 钉钉 + Gitee | 集成度高 |
| **代码审查** | **Gitee MR + Reviewers** | 极狐 GitLab MR | 标准 Git Flow |
| **依赖镜像** | **华为云 ohpm 镜像** + **阿里云 npm 镜像** | — | 速度 + 合规 |

### 1.2 IDE + 开发工具

| 维度 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **鸿蒙 IDE** | **DevEco Studio NEXT 5.0.3.900+** | — | 华为官方唯一 |
| **后端 / 工具 IDE** | **VS Code**（国行版可用）+ **JetBrains 全家桶** | Cursor 已禁（数据出境） | VS Code 国行可用，CN License |
| **包管理** | **ohpm**（鸿蒙官方） + **pnpm**（共享包） | — | 鸿蒙生态原生 |
| **构建** | **hvigor**（鸿蒙官方）+ **CMake / NDK**（C++） | — | 鸿蒙生态原生 |
| **代码风格** | **Prettier + ESLint + ArkTS Style** | — | 标准工具链 |
| **Git 客户端** | 命令行 + **SourceTree 国行版** | GitKraken 海外限速 | — |

### 1.3 AI Coding 工具（**核心选型** ⭐）

> 2026 年市场格局：Trae（字节）41.2% > 通义灵码（阿里）18.5% > 文心快码（百度）12.3%

| 维度 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **主 AI Coding（鸿蒙 ArkTS）** | **通义灵码 Lingma**（阿里 Qwen） | Trae（字节豆包） | 通义灵码对鸿蒙 ArkTS 支持是**官方合作**（DevEco Studio 直集成） |
| **AI Coding 备选** | **CodeGeeX**（智谱 + 清华 KEG） | aiXcoder（北大商汤） | CodeGeeX 开源 + 中文支持强 |
| **AI 大模型 IDE 集成** | **Trae** | **MarsCode**（字节） | 免费 + Agent 能力强 |
| **代码搜索 / 知识库** | **DeepWiki / Trae Wiki** | — | 国产替代 |
| **❌ 禁用工具** | **Cursor / Claude Code / GitHub Copilot** | — | 数据出境合规风险，**国内项目禁用** |

**理由**：国产 AI Coding 已经能打，**Trae（字节）+ 通义灵码（阿里）** 双轨是 2026 年最优解。

### 1.4 LLM 服务（**核心选型** ⭐）

> 2026 年国产 LLM 4 强：DeepSeek / 文心 / 智谱 / Qwen，外加 Kimi / 豆包

| 用途 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **代码 + 推理（核心）** | **DeepSeek V3.2** | DeepSeek R1（深度推理） | HumanEval 接近 GPT-5，国产性价比第一 |
| **中文长文本（公版书 / 笔记）** | **Kimi K2.6** | 文心 ERNIE 5.0 | 长文本能力强，200k context |
| **多模态 / OCR / 划词查询** | **智谱 GLM-5.1** | 文心 ERNIE 5.0 | 多模态 + function calling 稳 |
| **央企合规优先场景** | **百度文心 ERNIE 5.0** | — | 央企合规友好（B2B 兜底） |
| **私有化部署** | **Qwen3.6-72B**（开源 + vLLM） | DeepSeek-V3 开源版 | 阿里开源生态 |
| **❌ 禁用** | OpenAI / Claude / Gemini | — | 数据出境，国行项目禁用 |

**多 provider 适配层**：自研 `llm-adapter`（packages/llm-adapter/），抽象 4 个 provider，配置切换。

### 1.5 后端 / 云服务

| 维度 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **主云** | **华为云**（贴近鸿蒙生态） | 阿里云 / 腾讯云 | AGC + HMS 全家桶在华为云 |
| **数据库** | **华为云 GaussDB**（PostgreSQL 兼容） | 阿里云 PolarDB-PG | 国产数据库第一（市场份额 9.8%）+ 鸿蒙生态 |
| **对象存储** | **华为云 OBS** | 阿里云 OSS | — |
| **CDN** | **华为云 CDN** | 阿里云 CDN | — |
| **消息队列** | **华为云 DMS for Kafka** | 阿里云 Kafka | — |
| **函数计算** | **AGC Cloud Function** | 华为云 FunctionGraph | AGC 集成度高 |
| **Redis** | **华为云 DCS** | 阿里云 Tair | — |
| **域名 + DNS** | **华为云 + 阿里云 DNSPod** | — | 备份 |

### 1.6 HMS / AGC 服务集成（**鸿蒙生态原生**）

| 服务 | 用途 |
|------|------|
| **AGC AppGallery Connect** | 应用生命周期管理 |
| **HMS Push Kit** | 推送（替代 APN/FCM） |
| **HMS Account Kit** | 华为账号 + 一键登录 |
| **HMS IAP** | 应用内购（替代 Apple/Google IAP） |
| **HMS Analytics** | 统计 |
| **HMS Map Kit** | 地图（如需要） |
| **AGC Crash Service** | 崩溃监控 |
| **AGC Remote Config** | 远程配置 / Feature Flag |
| **AGC Cloud DB** | 云端数据库（可选） |
| **AGC Cloud Function** | 服务端逻辑 |

### 1.7 监控 / 告警 / 日志

| 维度 | 主选 | 备选 | 决策理由 |
|------|------|------|--------|
| **崩溃** | **AGC Crash Service** | 听云 Crash | 鸿蒙原生 |
| **APM** | **阿里云 ARMS** | 听云 APM / 博睿 Bonree | 国产 APM 第一 |
| **日志** | **阿里云 SLS（日志服务）** | 自部署 ELK | 国产 SaaS |
| **统计 / 用户行为** | **HMS Analytics + 神策** | GrowingIO / 友盟 | 神策替代 PostHog |
| **告警** | **PagerDuty 替代：Watchman**（华为云） | 钉钉机器人 | — |

### 1.8 第三方服务（替换海外版）

| 用途 | 海外版 | 国内版主选 | 备选 |
|------|------|---------|------|
| **支付** | Apple IAP / Google IAP / Stripe | **HMS IAP + 微信支付 + 支付宝** | — |
| **登录** | Apple / Google Sign-In | **华为账号 + 微信 + QQ + 钉钉** | — |
| **OCR** | Azure OCR / Google Vision | **百度智能云 OCR** | 阿里云 OCR / 腾讯云 OCR |
| **TTS** | OpenAI TTS / ElevenLabs | **科大讯飞 TTS** | 阿里云 TTS / 腾讯云 TTS |
| **翻译** | Google Translate / DeepL | **百度翻译** | 有道 / 腾讯翻译 |
| **地图** | Google Maps / Mapbox | **高德地图** | 百度地图 |
| **分享** | iMessage / Email | **微信 + 微博 + QQ** | — |

### 1.9 设计系统

| 维度 | 主选 | 备选 |
|------|------|------|
| **设计规范** | **HarmonyOS Design** | Material 3 / Apple HIG |
| **字体** | **HarmonyOS Sans** | 思源黑体 / 阿里巴巴普惠体 |
| **图标** | **HMOS Symbol Library** | iconfont（阿里） |
| **设计工具** | **MasterGo**（国产） / Figma | 蓝湖 |
| **Token 管理** | 自研 `packages/design-tokens/` | — |

### 1.10 测试与质量

| 维度 | 主选 |
|------|------|
| **单元测试** | **Hypium**（鸿蒙官方） |
| **UI 测试** | **ArkUI Inspector** + **Hypium UITest** |
| **真机调度** | **DevEco 真机调度服务** |
| **众测** | **WeTest（腾讯）** / **TestIn** |
| **静态扫描** | **DevEco Studio Lint** + **CodeArts**（华为云） |

### 1.11 法律 / 合规

| 维度 | 主选 |
|------|------|
| **ICP 备案** | 工信部 → 华为云备案系统 |
| **内容审核备案** | 网信办 |
| **生成式 AI 服务备案** | 网信办（2024 新规） |
| **软著登记** | 中国版权保护中心 |
| **隐私政策模板** | 个保法合规模板 |
| **法律顾问** | 央企推荐律所（待确定） |

---

## 2. 项目目录结构

```
readmigo-cn-repos/
│
├── PROJECT.md                       ← 本文件（项目主入口 / 指挥中心）
├── README.md                        公开 README（精简版）
├── .gitignore
│
├── docs/                            项目文档
│   ├── 00-strategy.md               战略定位 + 与海外版关系
│   ├── 01-tech-selection.md         国内栈选型详细决策
│   ├── 02-architecture.md           架构设计 + Stage 模型 + 数据流
│   ├── 03-overseas-reuse.md         海外版复用清单（37 repo 逐个）
│   ├── 04-compliance.md             合规备案 SOP
│   ├── 05-roadmap.md                实施路线图（22 周）
│   ├── 06-llm-selection.md          LLM 选型 + Prompt 库
│   ├── 07-ai-coding.md              AI Coding 工具链
│   ├── 08-deveco-setup.md           DevEco Studio + SDK 配置
│   ├── 09-publishing.md             华为应用市场上架 SOP
│   └── adr/                         架构决策记录（ADR）
│       ├── 0001-use-gitee.md
│       ├── 0002-use-deepseek-as-primary-llm.md
│       └── ...
│
├── apps/                            鸿蒙应用包
│   ├── harmony-app/                 主鸿蒙 HAP（ArkTS / ArkUI）
│   ├── harmony-meta-service/        元服务（Atomic Service，<10MB）
│   └── harmony-form/                服务卡片（FormExtensionAbility）
│
├── packages/                        共享包（pnpm workspaces / ohpm）
│   ├── shared-arkts/                ArkTS 业务逻辑共享
│   ├── llm-adapter/                 国产 LLM 多 provider 适配（DeepSeek/文心/智谱/Qwen）
│   ├── design-tokens/               设计 token（HarmonyOS Design）
│   ├── api-client/                  与国内后端 API 交互
│   └── analytics/                   HMS Analytics + 神策双轨
│
├── native/                          C/C++ 引擎（一次性从海外拷贝，国内独立 fork）
│   ├── typesetting/                 拷贝自海外 typesetting，国内独立维护
│   └── badge-engine/                拷贝自海外 badge-engine，国内独立维护
│
├── napi-bridge/                     NAPI 桥接框架（自研）
│   ├── src/
│   │   ├── napi_typesetting.cpp     typesetting 桥接
│   │   ├── napi_badge.cpp           badge-engine 桥接
│   │   └── napi_common.h            公共 NAPI 工具
│   ├── CMakeLists.txt
│   └── README.md
│
├── server-cn/                       国内后端（独立部署）
│   ├── api/                         NestJS 国内分支（基于海外 api 拷贝）
│   ├── ocr-pipeline/                国内 OCR 流水线（接百度/阿里 OCR）
│   ├── tts-pipeline/                国内 TTS 流水线（接讯飞/阿里 TTS）
│   ├── content-moderation/          内容审核（公版书白名单 + AI 标识）
│   └── docker-compose.cn.yml        华为云部署配置
│
├── tools/                           开发工具
│   ├── deveco-config/               DevEco Studio 项目配置模板
│   ├── hvigor-config/               构建配置
│   ├── ohpm-config/                 ohpm 仓库镜像配置
│   ├── lingma-prompts/              通义灵码项目级 prompt
│   └── codegeex-config/             CodeGeeX 配置
│
├── compliance/                      合规材料
│   ├── icp/                         ICP 备案材料
│   ├── content-audit/               网信办内容审核备案
│   ├── ai-service-filing/           生成式 AI 服务备案
│   ├── software-copyright/          软著登记
│   ├── privacy-policy/              隐私政策（鸿蒙版）
│   ├── user-agreement/              用户协议
│   └── content-whitelist/           公版书内容白名单
│
└── scripts/                         自动化脚本
    ├── sync-from-overseas.sh        从海外版同步 C++ 引擎
    ├── ci/                          CI 脚本（Gitee Actions）
    └── deploy/                      部署脚本（华为云）
```

---

## 3. 海外版复用矩阵（按 37 repo 真实分布）

> 数据来自 cloc 统计于 2026-04-26，总量 1,316,920 行 / 8,094 文件 / 37 repos

### 3.1 ✅ 直接拷贝 + 国内化适配（拷贝代码到国内 repo）

| 海外 repo | 行数 | 国内化动作 | 复用比例 |
|---------|------|---------|--------|
| `api` (NestJS) | 118,855 | 拷贝到 `server-cn/api/`，**重写 LLM provider** + 接华为云 GaussDB | 70% |
| `gutenberg` (公版书) | 35,314 | 拷贝到 `server-cn/content/`，**白名单过滤** | 60%（部分内容下架） |
| `ocr-pipeline` | 454 | 拷贝到 `server-cn/ocr-pipeline/`，**接百度 OCR** | 90% |
| `nlp` (Python) | 299 | 拷贝到 `server-cn/nlp/`，**接 DeepSeek/文心** | 80% |
| `ai` (TS) | 2,031 | 拷贝到 `server-cn/ai/`，**重写 provider 层** | 60% |
| `audiolab` | 3,776 | 拷贝到 `server-cn/audio/`，**接讯飞 TTS** | 85% |
| `book-translator` | 1,177 | 拷贝到 `server-cn/translator/`，**接百度翻译** | 80% |
| `reader-engine` (TS) | 7,047 | 拷贝到 `packages/shared-arkts/`，**TS → ArkTS** | 70% |
| `shipkit` (工程) | 13,280 | 拷贝到 `tools/shipkit-cn/`，**国内化镜像** | 90% |
| `badge-content` | 1,349 | 拷贝到 `apps/.../badge-content/` | 100% |
| `badge-assets` | 423 | 拷贝到 `apps/.../badge-assets/` | 100% |
| `badge-cli` | 1,110 | 拷贝到 `tools/badge-cli/` | 100% |
| `tts-data` | 9,712 | 拷贝到 `server-cn/tts-data-cn/`，**国内 TTS 重生成** | 50%（数据可拷，音频要重做） |

**小计拷贝总量：194,826 行**，国内化重写量约 30%（**~58k 实际新写**）

### 3.2 🟡 一次性拷贝（**核心 C++ 引擎**，拷贝后国内独立 fork）

| 海外 repo | 行数 | 国内位置 | 拷贝策略 |
|---------|------|--------|--------|
| `typesetting` (C++) | 114,763 | `native/typesetting/` | Phase 1 拷贝一次，国内独立 fork 演化 |
| `badge-engine` (C++) | ~42,000 | `native/badge-engine/` | Phase 1 拷贝一次，国内独立 fork 演化 |

**小计：156,763 行起步代码（拷贝后属于国内项目，与海外脱钩）**

⭐ **独立性原则**：
- 不用 git submodule（避免强耦合）
- 拷贝后国内项目独立维护，海外升级不自动同步
- 如果海外有重大引擎升级 → 由国内团队评估后**手动选择性合并**（不是自动）
- 国内修复 bug → 留在国内，**不反向提 PR 到海外**
- 两个项目长期会演化为不同分支

### 3.3 ❌ 不拷贝 / 不引用（国内项目从 0 写）

| 海外 repo | 行数 | 不复用理由 |
|---------|------|---------|
| `ios` (Swift) | 89,915 | 国内项目无 iOS 端 |
| `android` (Kotlin) | 186,261 | 国内只做鸿蒙原生，不做 Android |
| `flutter` (Dart) | 15,013 | 国内不做 Flutter |
| `mobile` (RN) | 23,588 | 国内不做 RN |
| `web` (Next.js) | 74,498 | 国内 Web 端单独决策（Phase 2 后） |
| `dashboard` | 24,984 | 国内运营后台单独做（中文 + 国产 UI 库） |
| `content-studio` | 5,999 | 国内内容编辑工具单独做 |
| `vocabtree` (Swift) | 4,388 | iOS 子项目 |
| `badge-3d-demo` (Swift) | 3,004 | iOS 实验 |
| `docs` (270k MD) | 270,617 | 国内文档单独写（中文） |
| `ego` (HTML) | 171,852 | 个人网站 |
| `website` / `blog` | 5,915 | 海外站独立 |

**小计不复用：875,134 行**

### 3.4 复用率汇总

```
✅ 拷贝 + 适配  : 194,826 × ~70% =  136,378 等效复用
🔗 submodule    : 156,763 × 100% =  156,763 等效复用（双向同步）
❌ 不复用       : 875,134 ×   0% =        0 等效复用
─────────────────────────────────────────────────────
总计           : 1,226,723        →  293,141 等效复用
─────────────────────────────────────────────────────

国内项目从海外复用 ≈ 293k 行
国内项目自研新写 ≈ 国内独有部分（鸿蒙端 UI / 元服务 / 卡片 / 多端协同 + 国内化适配）≈ 150-200k 行 ArkTS / ArkUI

实际海外版到国内项目复用率 ≈ 24%（主要是 C++ 引擎 + 后端核心 + 部分 Pipeline）
```

> 📌 这个 24% 比 [readmigo-harmony-feasibility.md](../job/applications/2026-04-17-中智人力服务/readmigo-harmony-feasibility.md) 里的 74% 低，因为这次是"**国内独立项目**"视角，不是"海外版加鸿蒙端"视角。两个数都对，看口径。

---

## 4. 实施路线图（22 周 / 5.5 月）

> 详见 [docs/05-roadmap.md](./docs/05-roadmap.md) 完整版。这里是高层骨架。

```
Phase 0  ┃■■■■  合规启动 + 团队 + 设备                        4 周（与 1 并行）
Phase 1  ┃■■■■  PoC + C++ NAPI 桥接 + Gitee 仓库迁移          4 周
Phase 2  ┃    ■■■■■■  核心阅读 + ArkUI 设计系统                6 周
Phase 3  ┃          ■■■■■■  鸿蒙特色（元服务/卡片/分布式）     6 周
Phase 4  ┃                ■■  HMS 全家桶 + 国产 LLM 集成        2 周
Phase 5  ┃                  ■■  上架 AGC + 鸿蒙先锋认证申请    2 周

Track 持续合规 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

详细动作清单见 `harmony-100pct-roadmap.md`（82 个动作）。

---

## 5. 团队 + 协作

### 5.1 最小可行团队

| 角色 | 工作量 | 主要职责 |
|------|------|--------|
| **技术负责人**（鸿蒙端） | 1 人 fulltime | own 项目，ArkTS / ArkUI 主开发 |
| **后端工程师** | 0.5-1 人 | server-cn 国内化适配 |
| **C++ 工程师** | 0.3 人（兼） | NAPI 桥接 + 引擎对接 |
| **测试 / 合规** | 0.3 人 | 真机测试 + 备案材料 |
| **总计** | **2-2.5 人** | — |

### 5.2 协作工具

| 维度 | 工具 |
|------|------|
| 即时通讯 | 钉钉 / 飞书 |
| 任务管理 | Gitee Issues + 飞书任务 |
| 文档协作 | Gitee Wiki + 飞书文档 |
| 视频会议 | 腾讯会议 / 飞书会议 |
| 设计协作 | MasterGo |

### 5.3 海外团队 vs 国内团队（**完全独立，无协作约束**）

```
┌─────────────────────────┐    ┌─────────────────────────┐
│   海外团队              │    │   国内团队              │
│   readmigo-repos/       │    │   readmigo-cn-repos/    │
│                        │    │                        │
│   own:                 │    │   own:                 │
│   - 海外版所有          │    │   - 国内版所有          │
│   - typesetting / etc  │    │   - 鸿蒙端              │
│                        │    │   - 国内化适配          │
│                        │    │                        │
│   边界：               │    │   边界：               │
│   - 不看国内用户数据    │    │   - 不看海外用户数据    │
│   - 不向国内推送代码    │    │   - 不向海外推送代码    │
│   - 不调用国内 API     │    │   - 不调用海外 API     │
│                        │    │                        │
│   ⚠️ 两个项目无直接协作  │   ⚠️ 两个项目无直接协作  │
└─────────────────────────┘    └─────────────────────────┘

* 同一个开发者（HONGBGU）可以分别参与两边，但代码和数据不互通
* 知识 / 经验可以共享（在脑子里），代码 / 数据不共享
```

---

## 6. 成本预算

### 6.1 启动成本（22 周）

| 项目 | 金额 |
|------|------|
| 人力（2 人 × 5.5 月 × 30k） | 33 万 |
| 设备（华为真机 5-7 台） | 1.75 万 |
| 备案 / 软著 / 法律 | 1 万 |
| 云资源（华为云 / 阿里云 启动期） | 5 万 |
| 第三方 API 启动（LLM / OCR / TTS） | 2 万 |
| 工具 / IDE / 软件 | 0.5 万 |
| **小计** | **43.25 万** |

### 6.2 持续运营成本（每年）

| 项目 | 金额 / 年 |
|------|--------|
| 团队（2 人 fulltime） | 60-80 万 |
| 云资源 | 15-30 万（视用户量） |
| 第三方 API | 5-15 万（视调用量） |
| 营销 / 推广 | 待定 |
| **小计（最低）** | **80 万 / 年** |

---

## 7. 风险清单

### 7.1 高风险（**项目级威胁**）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| **生成式 AI 备案延期** | 高 | 上架延期 4-8 周 | Day 1 提交，Phase 4 时备案到位 |
| **公版书内容审核未通过** | 中 | 部分书库下架 | 白名单 + 渐进上架 |
| **国产 LLM 性能差距** | 中 | 用户体验下降 | 多 provider 切换 + DeepSeek 已接近 GPT-4o |
| **鸿蒙生态库缺失** | 中 | 工作量上浮 30% | Phase 1 第 4 周做库 inventory |

### 7.2 中风险

| 风险 | 缓解 |
|------|------|
| HMS IAP 适配复杂（订阅 / 退款）| Phase 4 专门 1 周 |
| 团队鸿蒙学习曲线 | 1 个月学习预算前置 |
| 海外版引擎升级 break 国内 | submodule 锁版本 + 双向 PR 流程 |
| 国行用户付费习惯 | A/B 测试不同价位 |

### 7.3 低风险

- 鸿蒙真机适配（华为机型相对统一）
- 设计系统（HarmonyOS Design 已成熟）

---

## 8. 关键决策记录（ADR 索引）

> 每个重大架构决策都要写一份 ADR（Architecture Decision Record），存在 `docs/adr/`。

| ADR # | 决策 | 状态 |
|-------|------|------|
| 0001 | 代码托管选 Gitee 不选 GitHub | ✅ 已决定 |
| 0002 | LLM 主用 DeepSeek 备文心 / 智谱 / Qwen | ✅ 已决定 |
| 0003 | AI Coding 用通义灵码 + Trae，禁用 Cursor / Claude Code | ✅ 已决定 |
| 0004 | 数据库用华为云 GaussDB 不用 PostgreSQL | ✅ 已决定 |
| 0005 | C++ 引擎一次性拷贝，**不用 git submodule**（独立性优先） | ✅ 已决定 |
| 0006 | 国内项目与海外版**完全独立**，路线图分别演化 | ✅ 已决定 |
| 0007 | 国内项目主体独立法人 | ⏳ 待法务确认 |
| 0008 | 是否做小程序版 | ⏳ Phase 5 后决策 |
| 0009 | 是否做 Flutter / RN 版 | ❌ 已否决（鸿蒙优先） |

---

## 9. 关联文档（外部）

### 9.1 项目内
- [README.md](./README.md) 公开版
- [docs/00-strategy.md](./docs/00-strategy.md) 战略
- [docs/01-tech-selection.md](./docs/01-tech-selection.md) 选型详情
- [docs/02-architecture.md](./docs/02-architecture.md) 架构
- [docs/03-overseas-reuse.md](./docs/03-overseas-reuse.md) 复用清单
- [docs/07-ai-coding.md](./docs/07-ai-coding.md) AI coding 接入基线
- [docs/08-deveco-setup.md](./docs/08-deveco-setup.md) DevEco 与国内环境基线
- [docs/10-domestic-stack-integration.md](./docs/10-domestic-stack-integration.md) 国内化全栈接入基线
- [docs/11-readmigo-sync-matrix.md](./docs/11-readmigo-sync-matrix.md) 与海外版同步矩阵
- [docs/12-fullstack-technical-spec.md](./docs/12-fullstack-technical-spec.md) 全栈技术方案明细
- [docs/05-roadmap.md](./docs/05-roadmap.md) 路线图

### 9.2 项目外（求职 / 面试目录）
- [面试 prep 文档（求职目录）](../job/applications/2026-04-17-中智人力服务/)
  - `interview-prep-round2.md` 客户技术专家面 prep
  - `harmony-deep-dive.md` 鸿蒙短板补强
  - `readmigo-harmony-feasibility.md` 可行性评估（海外版加鸿蒙端视角）
  - `harmony-100pct-roadmap.md` 100% 拥抱 roadmap

### 9.3 海外版 readmigo-repos（**仅作 Phase 1 拷贝起步参考**）
- `../../readmigo-repos/api/` NestJS 后端（Phase 1 拷贝起步）
- `../../readmigo-repos/typesetting/` C++ 排版引擎（Phase 1 拷贝起步）
- `../../readmigo-repos/badge-engine/` C++ 勋章引擎（Phase 1 拷贝起步）
- `../../readmigo-repos/docs/` 海外文档（仅作参考，国内文档独立写）

> ⚠️ 拷贝完成后，国内项目即与海外路径**彻底脱钩**，不再依赖海外目录存在。

---

## 10. 启动检查清单（Pre-Phase 0）

正式启动 Phase 0 前要确认：

- [ ] 主体公司决策（用哪家公司，新设 or 已有）
- [ ] 商标 / 中文名 / 域名 决策
- [ ] 法务对接（个保法 / 合规审计）
- [ ] 财务预算批准（启动 43 万 + 运营 80 万 / 年）
- [ ] 团队招募（鸿蒙工程师 1-2 人）
- [ ] 设备采购（5-7 台华为真机）
- [ ] Gitee 企业账号开通
- [ ] 华为开发者联盟企业账号注册
- [ ] AGC 项目创建
- [ ] 同步与海外团队 C++ 引擎共享方案

---

## 11. 变更记录

- **2026-04-26 v1**：项目立项 + 主文件就位。包含国内栈完整选型（11 维度）+ 项目目录结构 + 海外版复用矩阵 + 22 周路线图 + 风险清单 + ADR 索引。下一步：Phase 0 资源就位 + Gitee 仓库初始化。

---

## 12. 下一步动作（按优先级）

1. **创建 Gitee / 极狐 GitLab 仓库**，把本目录推上去
2. **按 docs/08-deveco-setup.md 开通 DevEco / AGC / 华为云 / 通义灵码**
3. **按 docs/10-domestic-stack-integration.md 创建 harmony-app 与 server-cn 初版工程**
4. **基于 packages/llm-adapter 接入 DeepSeek 主模型**
5. **执行 Phase 0**：合规备案 + 团队 + 设备采购

---

**📌 项目状态**：📋 立项完成 / ⏳ 待资源到位启动 Phase 0

**📌 项目入口**：[`PROJECT.md`](./PROJECT.md)（你在这里）

**📌 当前优先执行文档**：[`docs/10-domestic-stack-integration.md`](./docs/10-domestic-stack-integration.md)
