# Readmigo CN Terminal Coding Context

本文件用于 `Qwen Code` 在终端中理解当前仓库。

## 项目身份

- 项目名：`readmigo-cn-repos`
- 定位：`readmigo` 的中国大陆版本
- 对齐对象：`/Users/HONGBGU/Documents/readmigo-repos`
- 平台：`HarmonyOS NEXT`
- 约束：全栈优先使用国内开发工具与服务

## 工程结构

- `apps/harmony-app/`：鸿蒙客户端
- `server-cn/`：国内后端，技术形态对齐 `readmigo-repos/api`
- `packages/llm-adapter/`：国产模型适配层
- `docs/`：国内版路线图、选型、接入基线

## 编码原则

- 优先保持与 `readmigo-repos/api`、`readmigo-repos/mobile` 的领域命名一致
- 不引入海外默认云服务作为主依赖
- 新增能力优先接入华为云、AGC、阿里云百炼
- 变更前先阅读现有文档与代码，不要凭空重构

## 终端 AI coding 首选

- 首选：`Qwen Code CLI + 阿里云百炼 Coding Plan`
- 备选：`Kilo CLI + 百炼`
- 仅兼容备选：`Claude Code + 百炼 Anthropic 兼容接口`

## 当前任务优先级

1. 补齐 `server-cn` 国内业务模块
2. 补齐 `apps/harmony-app` 的 `auth / discover / library / reader / me`
3. 接入 AGC 与华为账号
4. 迁移海外版核心业务到国内版本
