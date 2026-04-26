# typesetting

来源：`/Users/HONGBGU/Documents/readmigo-repos/typesetting`

## 已同步内容

- `include/typesetting/*.h`
- `src/*.cpp`
- `tests/*.cpp`
- `CMakeLists.txt`

## 已排除内容

- `platform_apple.h`
- `platform_apple.mm`
- iOS / macOS 构建目录与产物
- `.git`

## 为什么这样处理

`typesetting` 的布局核心是可复用的，但平台字体测量、断行、字形度量依赖平台适配层。Apple 的 `CoreText` 适配不能直接带到鸿蒙。

## 当前缺口

- 需要实现 Harmony 平台的 `PlatformAdapter`
- 需要决定字体度量与断行依赖什么底层能力
- 需要把测试和构建接进国内版工程

## 当前已补的骨架

- `include/typesetting/platform_harmony.h`
- `src/platform_harmony.cpp`
- `TYPESETTING_PLATFORM_HARMONY` CMake 开关

当前实现是保守占位版本：

- 提供可编译的 `HarmonyPlatformAdapter`
- 提供近似字体度量、文本宽度和断行逻辑
- 不依赖 Apple 或 Android 平台接口

这不是最终排版精度实现，只是给鸿蒙桥接打底。

## 下一步

1. 用 Harmony 文本与字体能力替换近似测量逻辑
2. 明确是否通过 NAPI 还是纯 C 接口暴露给 ArkTS
3. 建立最小布局 smoke test
