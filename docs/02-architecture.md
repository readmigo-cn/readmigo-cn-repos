# 架构基线

> **W23 拆分后状态**（2026-05-03）：server-cn / infra-cn / llm-adapter 已迁出为独立 Gitee 仓。详见 [docs/architecture/01-repo-split-decision.md](architecture/01-repo-split-decision.md)

## 总体结构

```text
Harmony App (ArkTS / ArkUI)
  -> AGC Auth / Analytics / Crash / Remote Config / IAP
  -> server-cn ([gitee](https://github.com/readmigo-cn/server-cn))
      -> llm-adapter ([gitee](https://github.com/readmigo-cn/llm-adapter))
          -> DeepSeek
      -> GaussDB / Redis / OBS
```

## 客户端

- `harmony-app/`：鸿蒙主应用
- `ArkTS / ArkUI`：页面、阅读器、词卡、AI 入口
- `AGC`：认证、远程配置、分析、崩溃、分发

## 服务端

- `server-cn` ([gitee](https://github.com/readmigo-cn/server-cn))：国内后端
- `llm-adapter` ([gitee](https://github.com/readmigo-cn/llm-adapter))：模型抽象层
- `DeepSeek`：主 LLM
- `GaussDB`：主库
- `DCS/Redis`：缓存
- `OBS`：对象存储

## 设计原则

- 先单云，后多云
- 先单模型，后多模型
- 先手机主链路，后多端延展
- 先最小闭环，后大规模复用海外资产
