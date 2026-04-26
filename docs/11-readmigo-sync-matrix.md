# Readmigo 同步矩阵（纯血鸿蒙前提）

本文件定义 `readmigo-repos` 到 `readmigo-cn-repos` 的同步原则。

## 总原则

- `可直接同步`：与 `HarmonyOS NEXT`、国内云、国内合规不冲突
- `同步后重写`：领域逻辑可复用，但运行时、SDK、第三方服务必须替换
- `不同步，国内新开发`：与 iOS / Android / Expo / 海外云强绑定

## 一期范围

### 1. 后端 `api`

#### 可同步的部分

- 领域拆分方式
- 模块命名
- DTO 设计思路
- AI provider 抽象方式
- 阅读、书架、图书、用户、同步等业务边界

#### 同步后重写

- `auth`
  - 原因：海外登录体系需要切到华为账号 / 微信 / 境内账号体系
- `subscriptions`
  - 原因：支付必须切到 `HMS IAP`
- `analytics`
  - 原因：海外埋点体系需切到 `HMS Analytics / 神策`
- `notifications`
  - 原因：推送需切到 `HMS Push`
- `storage`
  - 原因：对象存储需切到 `华为云 OBS`
- `ai`
  - 原因：模型路由需切到 `DeepSeek / 文心 / 智谱 / Qwen`

#### 不同步，国内新开发

- 任何直连海外服务的 provider
- 海外邮箱、海外支付、海外推送、海外风控

### 2. 移动端 `mobile`

#### 可同步的部分

- 信息架构
- 页面语义
- 功能优先级
- 阅读链路设计

#### 不同步，国内新开发

- Expo Router 运行时
- React Native 组件代码
- iOS / Android 原生桥接
- Apple / Google 登录与支付

### 3. 原生引擎

#### 可直接同步

- `typesetting`
- `badge-engine`

#### 同步后重写

- Apple 平台桥接
- iOS 构建脚本
- 任何 Objective-C / Swift / UIKit 绑定
- Harmony 平台适配层
- ArkTS 调用桥接

## 当前国内版一期模块

### server-cn

- `health`
- `config`
- `auth`
- `users`
- `books`
- `bookshelf`
- `reading`
- `sync`
- `ai`

### harmony-app

- `auth`
- `discover`
- `library`
- `reader`
- `me`

## 不允许直接搬运的内容

- `Expo / React Native` 页面实现
- `iOS / Android` 平台工程
- `OpenAI / Anthropic / Google` 默认依赖
- `Stripe / Apple IAP / Google Play Billing`
- 海外日志、分析、推送基础设施

## 下一步同步顺序

1. 对齐 `api` 的模块边界
2. 把 `harmony-app` 页面语义对齐到 `mobile`
3. 一次性同步 `typesetting` 与 `badge-engine` 源码骨架
4. 为 Harmony NAPI / C API 做桥接适配
