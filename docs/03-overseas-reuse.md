# 海外版 Readmigo 复用清单（37 repo 逐个决策）

> **W23 拆分后状态**（2026-05-03）：server-cn / infra-cn / llm-adapter 已迁出为独立 Gitee 仓。详见 [docs/architecture/01-repo-split-decision.md](architecture/01-repo-split-decision.md)
>
> 数据来源：cloc 真实统计于 2026-04-26
> 总量：1,316,920 行 / 8,094 文件 / 37 repos
>
> **复用方式 4 档**：✅ 直接拷贝 / 🔗 git submodule / 🟡 拷贝+国内化 / ❌ 不复用

---

## 1. 决策矩阵（37 repo 逐个）

### 1.1 ✅ 直接拷贝 + 国内化（13 repo）

| 海外 repo | 行数 | 主语言 | 国内目标位置 | 国内化动作 | 复用度 | 工作量 |
|---------|------|------|----------|---------|-------|------|
| `api` | 118,855 | TypeScript | `server-cn/api/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/src/modules/ai/)) | 重写 LLM provider + 接 GaussDB + 国行登录 | 70% | 3-4 周 |
| `gutenberg` | 35,314 | JSON | `server-cn/content/gutenberg-cn/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/content/gutenberg-cn/)) | 白名单过滤 + 内容审核 | 60% | 1 周 |
| `tts-data` | 9,712 | JSON | `server-cn/tts-data-cn/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/tts-data-cn/)) | 重新用讯飞 TTS 生成 | 50% | 1 周 |
| `tts` | 17,635 | JSON | `server-cn/tts/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/tts/)) | 接讯飞 TTS API | 70% | 1 周 |
| `ocr-pipeline` | 454 | TypeScript | `server-cn/ocr-pipeline/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/ocr-pipeline/)) | 接百度 OCR API | 90% | 0.5 周 |
| `nlp` | 299 | Python | `server-cn/nlp/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/nlp/)) | 接 DeepSeek / 文心 | 80% | 0.5 周 |
| `ai` | 2,031 | TypeScript | `server-cn/ai/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/ai/)) | 重写 LLM provider 层 | 60% | 1 周 |
| `audiolab` | 3,776 | TypeScript | `server-cn/audiolab/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/audiolab/)) | 接讯飞 TTS | 85% | 1 周 |
| `book-translator` | 1,177 | TypeScript | `server-cn/book-translator/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/book-translator/)) | 接百度翻译 | 80% | 0.5 周 |
| `reader-engine` | 7,047 | TypeScript | `packages/shared-arkts/reader-engine/` | TS → ArkTS 重写 | 70% | 1 周 |
| `shipkit` | 13,280 | TypeScript | `tools/shipkit-cn/` | npm 镜像配置 | 90% | 0.5 周 |
| `badge-content` | 1,349 | YAML | `apps/harmony-app/.../badge-content/` | 直接拷贝 | 100% | 0.1 周 |
| `badge-assets` | 423 | JSON | `apps/harmony-app/.../badge-assets/` | 直接拷贝 | 100% | 0.1 周 |
| `badge-cli` | 1,110 | Python | `tools/badge-cli/` | 直接拷贝 | 100% | 0.1 周 |
| **小计** | **214,462** | | | | **平均 ~75%** | **~12 周** |

### 1.2 🔗 git submodule 共享（2 repo / **核心 C++ 引擎**）

| 海外 repo | 行数 | 国内位置 | 共享方式 | 双向同步策略 |
|---------|------|--------|---------|----------|
| `typesetting` | 114,763（C++） | `native/typesetting/` | git submodule | 海外为主 + 国内 PR 提修复 |
| `badge-engine` | ~42,000（C/C++） | `native/badge-engine/` | git submodule | 海外为主 + 国内 PR 提修复 |
| **小计** | **156,763** | | | **0 改动 / 双向同步** |

⭐ **关键工程红利**：
- 海外版引擎升级 → `git submodule update` 自动拿到
- 国内版踩到 bug → 在国内仓 fork 修复 → 提 PR 回海外 → 海外审核合并 → 国内 update
- C++ 完全跨平台，鸿蒙编 .so 时不影响海外编 .a / .dylib

### 1.3 ❌ 不复用（22 repo）

| 海外 repo | 行数 | 主语言 | 不复用理由 |
|---------|------|------|---------|
| `ios` | 89,915 | Swift | 国内不做 iOS 端 |
| `android` | 186,261 | Kotlin | 国内只做鸿蒙原生，不做 Android |
| `flutter` | 15,013 | Dart | 国内不做 Flutter |
| `mobile` | 23,588 | TypeScript（RN） | 国内不做 RN |
| `web` | 74,498 | TypeScript（Next.js） | 国内 Web 端独立决策（Phase 2 后） |
| `dashboard` | 24,984 | TypeScript | 国内运营后台单独做（中文 + 国产 UI 库） |
| `content-studio` | 5,999 | TypeScript | 国内内容编辑工具单独做 |
| `vocabtree` | 4,388 | Swift | iOS 子项目 |
| `badge-3d-demo` | 3,004 | Swift | iOS 实验 |
| `docs` | 270,617 | Markdown | 国内文档单独写（中文 + 国行术语） |
| `ego` | 171,852 | HTML | 个人数字网站，与项目无关 |
| `website` | 5,466 | HTML | 海外站独立 |
| `blog` | 449 | Markdown | 海外博客 |
| `china-appstore` | 12,949 | Plain Text | 国内 china-appstore 单独做（华为应用市场分支） |
| `free-resources` | 714 | Markdown | 海外资源 |
| `novel` | 4,165 | Markdown | 海外项目 |
| `money` | 1,883 | Markdown | 海外项目 |
| `seek` | 52 | Markdown | 海外项目 |
| `stackcv` | 727 | Markdown | 海外项目 |
| `droplet` | 1,908 | Markdown | 海外项目 |
| `rss-reader` | 1,760 | TypeScript | 独立工具 |
| `brand` / `claude-configs` / `posthog` | — | 配置 / 资源 | 海外特有 |
| **小计** | **~899,242** | | **国内全新做** |

---

## 2. 复用率汇总

```
✅ 拷贝+国内化  : 214,462 × ~75% =  160,847 等效复用
🔗 submodule    : 156,763 × 100% =  156,763 等效复用（双向同步）
❌ 不复用       : 899,242 ×   0% =        0 等效复用
─────────────────────────────────────────────────────
总计           : 1,270,467        →  317,610 等效复用

国内项目从海外复用 ≈ 318k 行
国内项目自研新写 ≈ 鸿蒙端 + 国内化适配 ≈ 150-200k 行 ArkTS / ArkUI

实际海外 → 国内复用率 ≈ 25%
```

> 📌 这个 25% 是"**国内独立项目**"视角。如果是"**海外版加鸿蒙端**"视角，复用率约 74%（详见 `readmigo-harmony-feasibility.md`）。两个数都对，看口径。

---

## 3. 拷贝执行 SOP

### 3.1 准备

```bash
cd /Users/HONGBGU/Documents/readmigo-repos/harmony-cn

# 1. 创建 server-cn 子目录（如还没创建）
mkdir -p server-cn/{api,content,tts-data-cn,ocr-pipeline,nlp,ai,audiolab,book-translator}

# 2. 创建 packages 子目录
mkdir -p packages/shared-arkts/reader-engine

# 3. 创建 tools 子目录
mkdir -p tools/{shipkit-cn,badge-cli}
```

### 3.2 拷贝（按优先级）

```bash
# Phase 1：基础设施（先拷贝可立即跑的）
cp -r ../api/src server-cn/api/src
cp ../api/package.json server-cn/api/
# ... 然后改 LLM provider

# Phase 2：内容流水线
cp -r ../ocr-pipeline server-cn/ocr-pipeline
cp -r ../nlp server-cn/nlp
cp -r ../audiolab server-cn/audiolab

# Phase 3：业务逻辑
cp -r ../reader-engine packages/shared-arkts/reader-engine
# ... 然后做 TS → ArkTS 转换

# 资源直接拷贝
cp -r ../badge-content apps/harmony-app/.../badge-content
cp -r ../badge-assets apps/harmony-app/.../badge-assets
```

### 3.3 添加 git submodule（C++ 引擎）

```bash
git submodule add ../typesetting native/typesetting
git submodule add ../badge-engine native/badge-engine
git submodule update --init --recursive
```

### 3.4 后续同步

```bash
# 拉取海外更新
git submodule update --remote

# 国内修复 bug 反提海外
cd native/typesetting
git checkout -b fix/some-issue
# 修改 + 测试
git push origin fix/some-issue
# 在 GitHub 提 PR
```

---

## 4. 国内化适配清单（每个拷贝过来的 repo 要做的事）

### 4.1 `server-cn/api` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/api))（NestJS 后端）

- [ ] 重写 `src/llm/` 模块：从 OpenAI / Claude 切到 DeepSeek / 文心 / 智谱 / Qwen
- [ ] 重写 `src/auth/`：从 Apple / Google Sign-In 切到华为账号 / 微信 / QQ
- [ ] 重写 `src/payment/`：从 Stripe 切到 HMS IAP / 微信 / 支付宝
- [ ] 数据库迁移：PostgreSQL → 华为云 GaussDB
- [ ] 部署：Fly.io → 华为云 ECS / FunctionGraph
- [ ] CDN：Cloudflare → 华为云 CDN
- [ ] 监控：Sentry → AGC Crash + 阿里云 ARMS
- [ ] 中文用户接口：错误信息 / 提示文案中文化

### 4.2 `server-cn/ocr-pipeline` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/ocr-pipeline))

- [ ] 替换 OCR provider：tesseract / Azure → **百度智能云 OCR**
- [ ] 内容审核：增加白名单过滤
- [ ] 部署到华为云

### 4.3 `server-cn/audiolab` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/audiolab)) + `server-cn/tts` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/tts))

- [ ] 替换 TTS provider：OpenAI TTS / ElevenLabs → **科大讯飞 TTS**
- [ ] 重新生成 TTS 音频缓存（讯飞音色）
- [ ] 中文音色支持（讯飞强项）

### 4.4 `packages/shared-arkts/reader-engine`

- [ ] TS → ArkTS 转换（语法 90% 相同，主要装饰器调整）
- [ ] React Hooks 心智 → ArkUI @State / @Prop / @Watch
- [ ] 测试：用 Hypium 写单测

### 4.5 `apps/harmony-app/.../badge-content` 和 `badge-assets`

- [ ] 中文勋章名翻译
- [ ] 鸿蒙特有勋章（"鸿蒙先锋"、"多端协同达人"）

---

## 5. 海外团队 + 国内团队协作约定

### 5.1 C++ 引擎（共享）

- 海外团队 own typesetting / badge-engine 主分支
- 国内团队修复 bug → 在 fork 上改 → 提 PR 到海外主分支
- 国内不直接 push 海外主分支
- 海外审核合并后 → 国内 `git submodule update --remote`

### 5.2 Prompt 库（半共享）

- 海外 prompts 是基础
- 国内拷贝海外 prompts → 中文优化 + 国产 LLM 适配
- 重大模板变更会同步通知（双向）

### 5.3 设计系统（半共享）

- 设计 token 海外版作为基础
- 国内版做 HarmonyOS Design 适配 + 中文字体
- 设计师双向沟通

### 5.4 用户数据（绝对隔离）

- ❌ 海外用户数据**永远不能**进入国内系统
- ❌ 国内用户数据**永远不能**进入海外系统
- 用户从海外迁移到国内 → 必须重新注册
- 数据合规审计每季度做一次

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| C++ 引擎海外升级 break 国内 | submodule 锁定 commit + 升级前在国内 staging 验证 |
| 海外团队修改了国内未跟进 | 每周一次同步会 + 关键变更走通知 |
| 拷贝过来的代码没注意国内化 | 拷贝时同时改 LLM / 登录 / 支付 / 监控 / 中文文案 |
| 国内修复回流到海外被拒 | 沟通先行，PR 前在 issue 里讨论 |

---

## 变更记录

- **2026-04-26 v1**：基于 cloc 真实统计的 37 repo 逐个决策
