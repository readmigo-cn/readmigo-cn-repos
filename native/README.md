# Native Engines

这里存放从 `readmigo-repos` 同步过来的原生核心引擎源码。

## 同步原则

- 只同步可复用的 `C/C++` 核心
- 不同步 `.git`、构建产物、Apple 平台桥接、iOS 构建脚本
- 同步完成不代表已经可在鸿蒙端直接编译运行

## 当前目录

- `typesetting/`
- `badge-engine/`

## 当前状态

- 核心源码已同步
- Harmony 平台适配未完成
- NAPI / C API 桥接未完成
- DevEco / hvigor 构建集成未完成

## 下一步

1. 为 `typesetting` 增加 Harmony 平台适配
2. 为 `badge-engine` 明确 Harmony 渲染集成路径
3. 在 `napi-bridge/` 建立 ArkTS 到 C/C++ 的调用桥
