# badge-engine

来源：`/Users/HONGBGU/Documents/readmigo-repos/badge-engine`

## 已同步内容

- `include/badge_engine/*.h`
- `src/*`
- `tests/*`
- `presets/*`
- `third_party/nlohmann_json/nlohmann/json.hpp`
- `CMakeLists.txt`

## 为什么可以先同步

`badge-engine` 的核心逻辑、配置解析、材质与动画抽象仍有复用价值，即便 Harmony 侧最终渲染实现需要单独适配。

## 当前缺口

- Harmony 渲染集成尚未定义
- `Filament` 是否继续使用尚未决策
- 资源加载路径需要适配鸿蒙包结构
- `c_api.cpp` 需要和 ArkTS 侧桥接方式对齐

## 风险点

- 如果继续保留 `Filament`，要补 Harmony 端可行性验证
- 如果不保留 `Filament`，要重写渲染后端

## 下一步

1. 评估 Harmony 上的渲染方案
2. 定义最小 badge 渲染闭环
3. 补 NAPI / C API 调用样例
