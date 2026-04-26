# 国内化全栈接入基线（2026-04-26）

这份文档是对当前仓库里“国内化 / 鸿蒙化 / 全栈国产替代”目标的收敛版本。目标不是追求名义上的 100% 国产，而是建立一套现在就能开工、后续可审计、可扩展的基线。

## 一页结论

### 主技术栈

- `客户端`：HarmonyOS NEXT + `DevEco Studio`
- `AI coding`：`通义灵码企业版` 主用，`Trae` 作为隔离补充
- `代码托管`：`Gitee 企业版`
- `灾备托管`：`极狐 GitLab CE` 自部署
- `云基础设施`：`华为云`
- `应用侧云能力`：`AppGallery Connect`
- `主 LLM`：`DeepSeek API`
- `多模型扩展层`：仓内的 `packages/llm-adapter/`

### 不建议现在上的东西

- 多云双活
- 多模型并发接入
- 海外 AI coding
- 先做车机、手表、智慧屏独立版

## 分层决策

### 1. 开发工具层

优先级如下：

1. `DevEco Studio`
2. `通义灵码`
3. `Gitee 企业版`
4. `Lingma IDE`
5. `Trae`

原因：

- 鸿蒙应用没有第二个正式 IDE 选择
- AI coding 必须兼顾 `DevEco Studio` 与企业治理
- 仓库必须放在境内托管平台

### 2. 应用云能力层

应用内能力尽量先用 `AGC/HMS` 原生方案，而不是自建一遍：

- 认证：`Auth Service`
- 远程开关：`Remote Configuration`
- 崩溃：`Crash`
- 分析：`Analytics`
- 分发：`App Distribution`
- 付费：`IAP`

原因是这些能力和鸿蒙设备、应用市场、签名分发体系天然耦合，自建不会更便宜，反而更脆。

### 3. 后端基础设施层

第一阶段统一放在华为云：

- 计算：`ECS`
- 数据库：`GaussDB`
- 对象存储：`OBS`
- 缓存：`DCS`
- 轻量事件函数：`FunctionGraph`

`GaussDB` 适合这里，不是因为“国产”这一个标签，而是因为华为云官方已经明确给新客户推荐使用 `GaussDB`，并且它保留了 PostgreSQL 标准接口与公共函数，迁移成本相对可控。

### 4. LLM 层

当前最务实的接法是：

- `主模型`：`DeepSeek`
- `适配层`：自研最小抽象
- `后备模型`：先只预留配置，不急着上线

原因：

- DeepSeek 官方已经提供与 `OpenAI/Anthropic` 兼容的 API 入口
- 这能显著降低你后端初版的接入成本
- 真正需要文心 / 智谱 / Qwen 时，再按业务场景补 provider

## 这次已经接入到仓库里的内容

- `docs/07-ai-coding.md`：AI coding 决策与使用边界
- `docs/08-deveco-setup.md`：鸿蒙开发环境与 AGC 启动基线
- `server-cn/.env.example`：国内云与 LLM 环境变量模板
- `packages/llm-adapter/`：DeepSeek 优先的适配层骨架
- `.npmrc`：国内 npm 镜像默认配置

## 实施顺序

### Phase A

- 开通 `Gitee 企业版`
- 开通 `华为开发者账号`、`AppGallery Connect`
- 开通 `华为云`
- 开通 `通义灵码企业版`

### Phase B

- 创建 `harmony-app` 主工程
- 生成 `agconnect-services.json`
- 接入 `Auth Service`、`Crash`、`Analytics`
- 部署 `server-cn` 初版

### Phase C

- 接入 `DeepSeek`
- 完成 `llm-adapter`
- 把 AI 功能灰度到 `Remote Configuration`

### Phase D

- 再评估 `IAP`
- 再评估 `智谱 / 文心 / Qwen` 作为特定场景备选
- 再评估 `Trae` 的组织级放开范围

## 官方来源

- DevEco Studio：https://developer.huawei.com/consumer/en/deveco-studio/
- AppGallery Connect：https://developer.huawei.com/consumer/en/agconnect/
- 华为认证服务：https://developer.huawei.com/consumer/cn/agconnect/auth-service/
- 华为 IAP：https://developer.huawei.com/consumer/en/hms/huawei-iap/
- Gitee 官网：https://gitee.com/
- Gitee 企业版：https://gitee.com/enterprises
- 通义灵码官网：https://lingma.aliyun.com/
- 通义灵码兼容 IDE：https://help.aliyun.com/document_detail/2807200.html
- Trae 官网：https://www.trae.com.cn/
- DeepSeek API 文档：https://api-docs.deepseek.com/
- DeepSeek API 兼容说明：https://api-docs.deepseek.com/api/deepseek-api
- 华为云 GaussDB 与 PostgreSQL 关系：https://support.huaweicloud.com/gaussdb_faq/gaussdb_01_366.html
- 华为云 DCS：https://support.huaweicloud.com/helppanel-dcs/dcs-01-0001.html
- 华为云 OBS：https://support.huaweicloud.com/intl/zh-cn/obs/index.html
- 华为云 FunctionGraph：https://support.huaweicloud.com/functiongraph/index.html
