# AI Coding 接入基线（2026-04-26 复核）

本文件只保留已经能落地的结论，不使用无法核验的市场份额和宣传口径。

## 结论

- `终端主方案`：`Qwen Code CLI + 阿里云百炼 Coding Plan`
- `IDE 主方案`：`通义灵码企业版`
- `补充方案`：`Trae IDE`，仅用于非敏感仓库或隔离分支的复杂 Agent 任务
- `禁用方案`：`Cursor`、`GitHub Copilot`、`Claude Code` 直连海外模型、`Gemini Code Assist` 等海外直连方案

如果要求是“只在终端里做 AI coding”，就不要把 `通义灵码插件` 当主链路，因为通义灵码当前公开主形态仍是 `Lingma IDE` 与 IDE 插件。

## 为什么终端主方案改成 Qwen Code

截至 `2026-04-26`，阿里云百炼官方已经提供 `Qwen Code` 接入文档，且该工具明确包含 `CLI` 形态，支持：

- 在终端安装和启动
- 在项目目录执行 `/init`
- 自动生成并使用 `QWEN.md`
- 通过 `Coding Plan` 接入阿里云百炼的编码模型

这比“把 IDE 的智能体能力拿来间接执行终端命令”更符合你的要求。

## 为什么 IDE 仍然主选通义灵码

截至 `2026-04-26`，通义灵码的官方文档明确支持以下能力：

- 支持 `HUAWEI DevEco Studio`、`JetBrains IDEs`、`VS Code`
- 提供 `Lingma IDE`，内置智能体、文件编辑、终端命令执行、MCP 工具使用
- 企业版提供知识库、审计日志、企业专属推理服务、专属 `VPC` 部署、`IP` 白名单等能力

这几个点比“生成效果谁更强”更重要，因为本项目的核心约束是：

- 鸿蒙原生开发必须覆盖 `DevEco Studio`
- 代码与提示词不能默认出海
- 后续需要企业级审计和访问控制

## 为什么 Trae 只做补充

`Trae` 官方首页已经明确它是 `AI 原生 IDE`，适合做复杂协同和长链路任务；但当前能公开核验到的企业治理与私域控制信息，明显不如通义灵码完整。

因此这里给出的策略不是“二选一”，而是：

- `通义灵码` 负责主开发链路
- `Trae` 只进入隔离任务池

适合 Trae 的场景：

- 非敏感 Demo
- 原型探索
- 文档整理
- 一次性重构草案

不适合 Trae 直接处理的场景：

- 生产仓主分支
- 包含用户数据结构、账单逻辑、鉴权逻辑的代码
- 含密钥、证书、签名配置的目录

## 团队执行规则

### 1. 工具分工

- `Qwen Code CLI`：终端主工作流
- `DevEco Studio + 通义灵码`：ArkTS / ArkUI / HAP 主工程
- `Lingma IDE`：需要图形 IDE 时的跨文件重构、批量改动、测试补全、仓库级问答
- `VS Code / JetBrains + 通义灵码`：后端、脚本、共享 TypeScript 包
- `Trae`：隔离分支上的探索性任务

### 2. 数据边界

- 禁止把生产 `.env`、证书、签名文件、备案材料放入 AI 工具上下文
- 禁止在海外 AI 工具中粘贴用户数据、日志原文、数据库结构全量导出
- 对外部 AI 工具统一使用脱敏目录或镜像仓

### 3. 仓库策略

- 主仓：`Gitee 企业版`
- 灾备仓：`极狐 GitLab CE` 自部署
- AI 工具访问默认只连主仓工作副本，不直连生产机

### 4. 交付策略

- AI 生成代码必须经过人工 Review
- 关键模块必须保留单测和最小验收清单
- ArkTS、支付、登录、订阅、内容审核相关改动禁止“直接接受全部建议”

## 建议的组织级落地顺序

1. 先开通 `通义灵码企业版`
2. 为 `DevEco Studio`、`JetBrains`、`VS Code` 配置统一账号体系
3. 建立企业知识库：编码规范、ADR、接口规范、鸿蒙 UI 约束、上架规范
4. 再评估是否给独立创新小组开放 `Trae`

## 可直接核验的官方来源

- Qwen Code（CLI 及 IDE 插件）接入百炼：https://help.aliyun.com/zh/model-studio/qwen-code-coding-plan
- Kilo CLI 接入百炼：https://help.aliyun.com/zh/model-studio/kilo-cli
- OpenCode 接入百炼：https://help.aliyun.com/zh/model-studio/opencode
- Claude Code 接入百炼：https://help.aliyun.com/zh/model-studio/claude-code
- 通义灵码官网：https://lingma.aliyun.com/
- 通义灵码下载安装：https://lingma.aliyun.com/download
- 通义灵码安装指南：https://help.aliyun.com/lingma/user-guide/install-lingma-plugin
- 通义灵码兼容 IDE 列表：https://help.aliyun.com/document_detail/2807200.html
- 通义灵码定价与企业能力：https://lingma.aliyun.com/lingma/pricing
- Trae 官网：https://www.trae.com.cn/
- Trae 隐私协议：https://www.trae.com.cn/privacy-policy
