# NAPI Bridge

这里放鸿蒙 `ArkTS <-> C/C++` 的桥接层。

## 设计原则

- 原生引擎先暴露稳定的 `C / C++` 边界
- NAPI 只负责参数解包、生命周期管理、结果组装
- 不把排版或勋章引擎的业务逻辑直接塞进 NAPI 文件

## 当前状态

- 已建立 `typesetting` 的最小桥接骨架
- 已建立 Harmony NAPI 模块注册骨架
- 当前 `layoutHtml` 只返回布局摘要，不直接返回完整页面树

## 下一步

1. 扩展 `layoutHtml` 返回页级数据
2. 增加 `relayout`、`hitTest`、`getSentences`
3. 视 badge-engine 的 Harmony 渲染方案补对应桥接
