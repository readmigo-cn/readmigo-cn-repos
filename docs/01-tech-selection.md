# 国内栈技术选型详情

> 11 维度 × 主选 / 备选 / 决策理由 / 替代不选的理由
> 每个决策都对应一份 ADR（Architecture Decision Record）

---

## 1. 代码托管：Gitee 主 + 极狐 GitLab 自部署备份

### 决策：**Gitee 企业版**

### 备选对比

| 平台 | 优势 | 劣势 | 评分 |
|------|------|------|------|
| **Gitee 企业版** ⭐ | 1350 万用户国内最大 / 国资委推荐方向 / 国内访问稳定 | 大型企业级功能弱于 GitLab | ★★★★★ |
| 极狐 GitLab | GitLab EE 国行版 / 私有部署强 / 中国独立运营 | 商用授权贵 / 资源占用高 | ★★★★ |
| CODING（腾讯） | 50000 企业 / DevOps 全套 / 制品库 | 与腾讯云绑定深 | ★★★★ |
| 华为云 CodeHub | 华为生态绑定 | 用户少 / 生态弱 | ★★★ |
| 阿里云 Codeup | 阿里云生态绑定 | 与项目其他选型重合度低 | ★★★ |
| ❌ GitHub | 海外，**禁用**（数据出境合规） | — | — |

### 决策理由

1. **合规**：Gitee 数据全境内 + 数据本地化合规
2. **生态对齐**：央企 / 政企客户用得多（中智 / 国资委生态）
3. **价格**：企业版年费可控
4. **API**：兼容 GitHub API 80%，海外团队迁移成本低
5. **CI**：Gitee Actions 兼容 GitHub Actions yml 语法

### 备份策略

- **极狐 GitLab CE 自部署**：每天自动从 Gitee 拉取所有仓库，作为灾备
- 部署在公司 IDC 或华为云 ECS

### 何时考虑切换

- 如果团队 > 50 人 → 考虑切到极狐 GitLab（项目管理更细）
- 如果 Gitee 企业版功能不够 → 切到 CODING（腾讯）

---

## 2. AI Coding 工具：通义灵码 + Trae 双轨

### 决策

- **主**：通义灵码 Lingma（鸿蒙 ArkTS 优先）
- **备**：Trae（字节，复杂 Agent 任务）
- **辅助**：CodeGeeX（开源代码搜索）

### 2026 国内 AI Coding 市场格局

| 工具 | 厂商 | 市场份额 | 鸿蒙 ArkTS 支持 | 价格 | 适用 |
|------|------|--------|--------------|------|------|
| **Trae** ⭐ | 字节 | **41.2%** | 中（依赖通用模型） | 免费 | 通用 + 复杂 Agent |
| **通义灵码 Lingma** ⭐ | 阿里 Qwen | 18.5% | **强**（DevEco 官方集成） | 免费 + 企业版 | 鸿蒙开发首选 |
| **文心快码** | 百度 | 12.3% | 中 | 免费 + Pro | 央企合规优先 |
| **MarsCode** | 字节 | （并入 Trae） | 中 | 免费 | 已被 Trae 替代 |
| **CodeGeeX** | 智谱 + 清华 KEG | 小众但开源 | 中（社区集成） | 开源 | 自部署 / 二次开发 |
| **aiXcoder** | 北大商汤 | 小众 | 弱 | 免费 + 企业版 | 学术 / 研究 |
| ❌ Cursor / Claude Code / Copilot | 海外 | — | — | — | **禁用**（数据出境） |

### 决策理由

#### 为什么选通义灵码做主

1. **鸿蒙 ArkTS 官方合作**：阿里和华为有合作，通义灵码在 DevEco Studio 有官方插件
2. **中文优秀**：基于 Qwen 大模型，中文 prompt 理解准确率比 Cursor 高 18%（2025-04 评测）
3. **企业版**：私有部署支持 + 项目级 prompt 库
4. **价格**：个人免费，企业版人民币结算

#### 为什么选 Trae 做备

1. **市场份额第一**：字节资源投入大，迭代快
2. **Agent 能力强**：复杂多步任务（比如重构整个模块）比通义灵码强
3. **免费**：完全免费 + 无 token 限制

#### 为什么禁用 Cursor / Claude Code / GitHub Copilot

- 代码上传到海外服务器 → **数据出境合规风险**
- 国内项目 / 中智客户类 ToB / 政企场景**严禁**
- 国内项目用海外 AI 工具 = 触犯个保法 / 数据安全法

### 工具链协作

```
DevEco Studio
   ├── 通义灵码插件（主）           日常 ArkTS 开发
   ├── CodeGeeX 插件（备）          代码搜索 + 自动注释
   └── Trae 桌面版                 复杂重构 / Agent 任务

VS Code（后端 / 工具）
   ├── 通义灵码插件
   └── Trae 插件
```

---

## 3. LLM 服务：DeepSeek 主 + 多 provider 适配

### 决策

- **主**：DeepSeek V3.2（推理 + 代码）
- **备 1**：Kimi K2.6（中文长文本）
- **备 2**：智谱 GLM-5.1（多模态 / function calling）
- **备 3**：百度文心 ERNIE 5.0（央企合规兜底）
- **私有化**：Qwen3.6-72B + vLLM

### 2026 国产大模型对比

| 模型 | 厂商 | 强项 | 国内 API 价格 | 海外对标 |
|------|------|------|--------|--------|
| **DeepSeek V3.2** ⭐ | 深度求索 | **代码 + 推理 + 性价比** | ¥1/M tokens 输入 | 接近 GPT-5 早期 |
| DeepSeek R1 | 深度求索 | 深度推理 | ¥4/M tokens | 接近 o1 |
| **文心 ERNIE 5.0** | 百度 | 中文长文本 + 央企合规 | ¥8/M tokens | GPT-4o 级 |
| **智谱 GLM-5.1** ⭐ | 智谱 + 清华 | 多模态 + function calling 稳 | ¥5/M tokens | GPT-4 Turbo 级 |
| **Qwen3.6-Max** | 阿里 | 通用 + 代码 | ¥10/M tokens | GPT-4o 级 |
| **Qwen3.6-72B**（开源） | 阿里 | 私有化部署首选 | 自部署 | LLaMA 3.1 70B 级 |
| **Kimi K2.6** | 月之暗面 | 长文本 200k + 推理 | ¥12/M tokens | Claude 3.7 Sonnet 级 |
| **豆包 1.5 Pro** | 字节 | DAU 1.07 亿 / 通用 | ¥0.8/M tokens 输入 | GPT-4o 级 |
| ❌ GPT / Claude / Gemini | OpenAI / Anthropic / Google | — | — | **禁用**（数据出境） |

### 决策理由

#### 主选 DeepSeek

- **性价比绝对第一**：¥1/M tokens 是 GPT-4o 的 1/15
- **代码能力**：HumanEval 国产第一
- **开源版**：DeepSeek-V3 开源权重可用
- **推理 R1**：复杂任务用 R1 备选

#### 备选组合

- **长文本场景** → Kimi K2.6（200k context）
- **多模态场景**（OCR / 图文混合） → 智谱 GLM-5.1
- **央企合规优先场景** → 文心 ERNIE 5.0
- **私有化部署** → Qwen3.6-72B + vLLM（4×A100 撑中型企业）

### 成本估算（假设 10 万 DAU）

```
日 LLM 调用估算：10 万 DAU × 每人 5 次调用 = 50 万次/天
平均 input 1500 tokens + output 500 tokens

主选 DeepSeek V3.2：
50 万次 × 2000 tokens × ¥1/M = ¥1,000/天 = ¥30,000/月

启用缓存 30% 命中率：~¥21,000/月
启用 batch API 50% 走异步：~¥15,000/月

→ 月度 LLM 成本 ~ ¥1.5 万
```

对比 GPT-4o（不可用，仅参考）：~¥30 万/月，**节省 95%**。

### LLM 适配层架构

详见 `llm-adapter` ([github](https://github.com/readmigo-cn/llm-adapter)) 实现，4 层抽象：

```typescript
// llm-adapter/src/types.ts ([github](https://github.com/readmigo-cn/llm-adapter/blob/main/src/types.ts))
export interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  embed(text: string): Promise<number[]>;
  // ...
}

// 实现：
// - DeepSeekProvider
// - WenxinProvider（百度文心）
// - GLMProvider（智谱）
// - QwenProvider（阿里）
// - KimiProvider
// - DoubaoProvider（字节）
// - LocalQwenProvider（自部署 vLLM）
```

---

## 4. IDE 与构建工具

### 决策

| 用途 | 主选 | 理由 |
|------|------|------|
| 鸿蒙 IDE | **DevEco Studio NEXT 5.0.3.900+** | 华为官方唯一 |
| 后端 / 工具 IDE | **VS Code** + **JetBrains** | 国行可用 |
| 包管理（鸿蒙） | **ohpm** | 鸿蒙原生 |
| 包管理（共享 TS） | **pnpm**（阿里 npm 镜像） | monorepo |
| 构建（鸿蒙） | **hvigor** | 鸿蒙原生 |
| 构建（C++） | **CMake + NDK** | 独立仓 [`typesetting`](https://github.com/readmigo/typesetting) / [`badge-engine`](https://github.com/readmigo/badge-engine) 共用 |

### 配置要点

- **DevEco Studio** 配置通义灵码插件作为主 AI Coding 工具
- **VS Code** 配置：通义灵码插件 + Trae 插件 + Prettier + ESLint
- **ohpm 镜像**：使用华为云 ohpm 镜像（速度 + 合规）
- **npm 镜像**：使用阿里云 npm 镜像（`registry.npmmirror.com`）

---

## 5. 后端 / 云服务

### 决策

- **主云**：华为云
- **数据库**：华为云 GaussDB（PostgreSQL 兼容）
- **对象存储**：华为云 OBS
- **CDN**：华为云 CDN

### 备选与降级

- 如果华为云某服务 GA 不稳，临时切到阿里云对应服务
- 关键服务做多云部署（GaussDB + 阿里云 PolarDB-PG 互为备份）

### 部署架构

```
华为云
├── ECS（NestJS api 国内分支）
├── GaussDB（用户 / 内容 / 笔记）
├── DCS（Redis 缓存）
├── OBS（公版书 / TTS 音频 / 字体）
├── CDN（静态资源）
├── DMS Kafka（消息队列）
└── FunctionGraph（无服务函数）

AGC（AppGallery Connect）
├── HMS Push Kit
├── HMS Account Kit
├── HMS IAP
├── HMS Analytics
├── AGC Crash Service
├── AGC Remote Config
└── AGC Cloud Function
```

---

## 6. 监控 / 告警 / 日志

### 决策

| 用途 | 主选 | 备选 |
|------|------|------|
| 崩溃 | **AGC Crash Service** | 听云 |
| APM | **阿里云 ARMS** | 听云 / 博睿 |
| 日志 | **阿里云 SLS** | 自部署 ELK |
| 用户行为 | **HMS Analytics + 神策** | 友盟 |

### 双轨原则

- **崩溃**：AGC Crash 一级 + Sentry（如果有海外用户）二级
- **统计**：HMS Analytics（鸿蒙原生）+ 神策（自有数据控制）

---

## 7. 第三方服务（替换海外）

| 用途 | 海外（禁用） | 国内主选 |
|------|---------- | -------- |
| 支付 | Apple/Google IAP / Stripe | **HMS IAP + 微信 + 支付宝** |
| 登录 | Apple/Google Sign-In | **华为账号 + 微信 + QQ** |
| OCR | Azure / Google Vision | **百度智能云 OCR** |
| TTS | OpenAI TTS / ElevenLabs | **科大讯飞 TTS** |
| 翻译 | Google Translate | **百度翻译** |
| 地图 | Google Maps | **高德地图** |

详细 API 替换映射见 `packages/llm-adapter/` 和 `server-cn/` 各模块。

---

## 8. 设计系统

### 决策

- **设计规范**：HarmonyOS Design
- **字体**：HarmonyOS Sans（替代 Inter / SF Pro）
- **图标**：HMOS Symbol Library + iconfont（阿里）
- **设计工具**：MasterGo（国产替代 Figma）+ Figma 海外版团队用

### Token 映射

详见 `packages/design-tokens/`，从海外设计 token 映射到 HarmonyOS Design：

```typescript
// packages/design-tokens/src/index.ts
export const colors = {
  // 海外版：blue-500 = #0EA5E9
  // 国内版：HarmonyOS Brand Blue = #007DFF
  brand: '#007DFF',
  // ...
};
```

---

## 9. 测试与质量

### 决策

| 用途 | 主选 |
|------|------|
| 单元测试 | **Hypium**（鸿蒙官方） |
| UI 测试 | **ArkUI Inspector + Hypium UITest** |
| 真机调度 | **DevEco 真机调度服务** |
| 众测 | **腾讯 WeTest** / **TestIn** |
| 静态扫描 | **DevEco Lint + 华为云 CodeArts** |

---

## 10. 法律 / 合规

### 决策

| 用途 | 渠道 |
|------|------|
| ICP 备案 | 华为云备案系统 |
| 内容审核备案 | 网信办 |
| 生成式 AI 服务备案 | 网信办（2024 新规） |
| 软著登记 | 中国版权保护中心 |
| 法律顾问 | 待定（建议央企推荐律所） |

---

## 11. 总览选型表

```
代码：     Gitee + 极狐 GitLab
IDE：      DevEco Studio + VS Code + JetBrains
AI Coding：通义灵码 + Trae（禁 Cursor / Copilot）
LLM：      DeepSeek + Kimi + 智谱 + 文心 + Qwen（禁 GPT / Claude）
云：       华为云（主）+ 阿里云（备）
DB：       华为云 GaussDB
HMS：      Push / Account / IAP / Analytics 全家桶
APM：      阿里云 ARMS + AGC Crash
统计：     HMS Analytics + 神策
OCR：      百度
TTS：      讯飞
设计：     HarmonyOS Design + HarmonyOS Sans + MasterGo
合规：     ICP + 内容审核 + AI 备案 + 软著
```

---

## 变更记录

- **2026-04-26 v1**：基于 2026 年国产生态最新数据完成 11 维度选型
