# 战略定位

## 定位

`米果智读` 是 Readmigo 同一款产品面向中国大陆华为终端用户的 **国内本地化版本**，技术上以 `HarmonyOS NEXT` 原生为载体。

## 核心边界

- **不做兼容 Android / iOS 的跨平台版本**：本仓只做纯血鸿蒙 NEXT；iOS / Android / Web 由海外版 [readmigo-repos](https://github.com/readmigo) 承担
- **不以海外云和海外 AI 服务为默认依赖**：合规要求决定使用国产云 + 国产 LLM
- **不在国内项目里直接调海外 API**：国内版必须有完整的国内闭环（数据、推送、支付、AI、存储均在境内）

## 与海外版的代码同步规则

参见 [11-readmigo-sync-matrix.md](./11-readmigo-sync-matrix.md)：

- ✅ **可直接同步**：领域设计、模块边界、AI provider 抽象（提供商可换）、阅读引擎核心、数据集
- 🔄 **同步后重写**：认证、支付、推送、存储、AI provider 实现 — 因为 SDK 和服务商必须替换
- ❌ **不同步**：任何直连海外服务的 provider、海外特定的支付/邮件/风控

## 第一阶段目标

- 跑通 `手机 + 平板 + 折叠屏`
- 跑通 `华为云 + AGC + DeepSeek`
- 跑通 `Gitee + 通义灵码`

## 第二阶段再考虑

- 手表卡片
- 智慧屏场景
- 车机接续
- 多模型路由
