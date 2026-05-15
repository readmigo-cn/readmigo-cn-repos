# DevEco Studio 与国内开发环境基线

> **W23 拆分后状态**（2026-05-03）：server-cn / infra-cn / llm-adapter 已迁出为独立 Gitee 仓。详见 [docs/architecture/01-repo-split-decision.md](architecture/01-repo-split-decision.md)

本文件用于把鸿蒙开发环境和国内服务接起来，避免后续在 IDE、账号、配置文件上反复试错。

## 目标基线

- `HarmonyOS NEXT` 原生开发
- `DevEco Studio` 作为唯一鸿蒙应用 IDE
- `AppGallery Connect` 负责应用配置、认证、远程配置、分发、崩溃与分析
- `华为云` 负责后端基础设施
- `阿里云通义灵码` 负责主 AI coding

## 1. 账号准备

- 华为开发者账号：用于 `DevEco Studio`、`AppGallery Connect`
- 华为云账号：用于 `ECS`、`GaussDB`、`OBS`、`DCS`、`FunctionGraph`
- 阿里云账号：用于 `通义灵码企业版`
- Gitee 企业版账号：用于主代码托管

## 2. 安装 DevEco Studio

从华为开发者官网安装 `DevEco Studio`，并按 HarmonyOS NEXT 目标版本下载对应 SDK。

官方入口：

- DevEco Studio：https://developer.huawei.com/consumer/en/deveco-studio/

## 3. 在 AppGallery Connect 创建项目

在 `AppGallery Connect` 中创建应用项目，并完成：

- 应用标识规划
- 包名确定
- 团队成员授权
- 数据处理区域选择

后续需要下载的关键文件：

- `agconnect-services.json`

该文件应放在鸿蒙应用模块目录中，不得提交到公共仓库。

官方入口：

- AppGallery Connect：https://developer.huawei.com/consumer/en/agconnect/

## 4. 第一批优先启用的 AGC/HMS 能力

建议按下面顺序启用：

1. `Auth Service`
2. `Remote Configuration`
3. `Crash`
4. `Analytics`
5. `App Distribution`
6. `IAP`

原因很直接：

- `Auth Service` 可以先把账号体系跑起来
- `Remote Configuration` 能让 AI 功能和开关灰度化
- `Crash` 和 `Analytics` 是上线前的最低观测面
- `IAP` 必须在商业化前接入，但不必在第一周就做

官方入口：

- 认证服务：https://developer.huawei.com/consumer/cn/agconnect/auth-service/
- IAP：https://developer.huawei.com/consumer/en/hms/huawei-iap/
- 分发服务：https://developer.huawei.com/consumer/cn/agconnect/distribute

## 5. 本仓建议的镜像与包管理配置

JavaScript / TypeScript 统一走仓库根目录的 `.npmrc`：

```ini
registry=https://registry.npmmirror.com/
```

原则：

- `npm/pnpm` 默认走国内镜像
- 鸿蒙依赖优先使用官方 `ohpm`
- 不把镜像配置写死在业务代码里，写在仓库级工具配置里

## 6. AI coding 建议接法

- `DevEco Studio`：安装通义灵码插件
- `VS Code / JetBrains`：安装通义灵码插件
- `Lingma IDE`：处理复杂多文件任务

兼容性官方说明已经覆盖 `HUAWEI DevEco Studio`。

## 7. 当前仓建议新增的最小目录

后续真正开工时，先补齐：

- `harmony-app/`
- `server-cn/`
- `packages/llm-adapter/`
- `tools/ai-coding/`

其中：

- `harmony-app/` 存放 ArkTS / ArkUI 主应用
- `server-cn/` 存放国内后端
- `packages/llm-adapter/` 做国产模型抽象层
- `tools/ai-coding/` 放企业知识库、AI 使用规则、脚手架说明

## 8. 当前阶段不建议做的事

- 不要先做多云双活
- 不要先接 4 家大模型
- 不要先做 Android / iOS 兼容层
- 不要先上车机和手表独立端

先把 `手机 + 平板 + 折叠屏 + 国内后端 + 主模型 + AGC 基线` 做通，再扩。

## 官方来源

- DevEco Studio：https://developer.huawei.com/consumer/en/deveco-studio/
- AppGallery Connect：https://developer.huawei.com/consumer/en/agconnect/
- 认证服务：https://developer.huawei.com/consumer/cn/agconnect/auth-service/
- IAP：https://developer.huawei.com/consumer/en/hms/huawei-iap/
- 分发服务：https://developer.huawei.com/consumer/cn/agconnect/distribute
- 通义灵码兼容 IDE 列表：https://help.aliyun.com/document_detail/2807200.html
