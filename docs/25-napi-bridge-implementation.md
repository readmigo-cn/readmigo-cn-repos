# C++ Typesetting Engine NAPI Bridge 实现方案

> 参考海外版 Android JNI 和 iOS Bridge 实现，为 HarmonyOS 创建 NAPI 桥接层
> 创建时间：2026-04-26

---

## 1. 架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│              HarmonyOS App (ArkTS)                       │
├─────────────────────────────────────────────────────────┤
│  TypesettingService (ArkTS, LRU cache)                  │
├─────────────────────────────────────────────────────────┤
│  NAPI Bridge (typesetting_napi.cpp)                     │
│  - Convert ArkTS → C++                                   │
│  - Manage Engine Handle                                  │
├─────────────────────────────────────────────────────────┤
│  C Bridge (typesetting_bridge.cpp)                      │
│  - C ABI for stability                                   │
├─────────────────────────────────────────────────────────┤
│  C++ Typesetting Engine (engine.cpp)                    │
│  - HTML parsing                                          │
│  - CSS parsing                                           │
│  - Layout engine                                         │
├─────────────────────────────────────────────────────────┤
│  Harmony Platform Adapter (platform_harmony.cpp)        │
│  - Font measurement via ArkUI                            │
│  - Line breaking                                         │
│  - Text layout                                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 与海外版对比

| 平台 | 桥接方式 | 平台适配器 | 参考文件 |
|------|----------|------------|----------|
| iOS | ObjC++ Bridge | CoreTextAdapter | `TypesettingBridge.mm` |
| Android | JNI | AndroidPlatformAdapter (Skia/HarfBuzz) | `TypesettingJNI.cpp` |
| HarmonyOS | NAPI | HarmonyPlatformAdapter (ArkUI) | **本文件** |

---

## 2. 目录结构

```
napi-bridge/
├── CMakeLists.txt                    # NAPI 构建配置
├── include/
│   └── readmigo_typesetting_bridge.h # C API (已存在)
├── src/
│   ├── typesetting_bridge.cpp        # C 桥接层 (已存在，需扩展)
│   ├── typesetting_napi.cpp          # NAPI 模块 (需实现)
│   └── platform_harmony.cpp          # Harmony 平台适配器 (需实现)
└── typesetting/                      # Git submodule (拷贝海外版)
    ├── include/typesetting/
    │   ├── engine.h
    │   ├── platform.h
    │   └── ...
    └── src/
        ├── engine.cpp
        └── ...
```

---

## 3. C API 扩展 (typesetting_bridge.cpp)

### 3.1 现有 API (已完成)

```c
ReadmigoTypesettingHandle readmigo_typesetting_create(...);
void readmigo_typesetting_destroy(ReadmigoTypesettingHandle);
int readmigo_typesetting_layout_html(..., ReadmigoTypesettingLayoutSummary* out_summary);
```

### 3.2 需添加的 API

```c
// === 布局扩展 ===

// 带 CSS 的 HTML 布局
int readmigo_typesetting_layout_html_with_css(
    ReadmigoTypesettingHandle handle,
    const char* html,
    const char* css,
    const ReadmigoTypesettingLayoutOptions* options,
    ReadmigoTypesettingLayoutSummary* out_summary);

// 封面页布局
int readmigo_typesetting_layout_cover(
    ReadmigoTypesettingHandle handle,
    const char* image_src,
    float page_width,
    float page_height,
    ReadmigoTypesettingLayoutSummary* out_summary);

// 重新布局 (字体大小变化等)
int readmigo_typesetting_relayout(
    ReadmigoTypesettingHandle handle,
    float new_font_size,
    float line_height_multiplier,
    ReadmigoTypesettingLayoutSummary* out_summary);

// === 章节管理 ===

void readmigo_typesetting_set_chapter_title(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    const char* title);

void readmigo_typesetting_evict_chapter(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id);

void readmigo_typesetting_evict_all(ReadmigoTypesettingHandle handle);

// === 交互查询 ===

// Hit test
int readmigo_typesetting_hit_test(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    float x, float y,
    ReadmigoHitTestResult* out_result);

// 获取单词范围
int readmigo_typesetting_word_at_point(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    float x, float y,
    ReadmigoWordRange* out_range);

// 获取句子列表
int readmigo_typesetting_get_sentences(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    ReadmigoSentenceRange** out_sentences,
    int* out_count);

// 获取所有句子
int readmigo_typesetting_get_all_sentences(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    ReadmigoSentenceRange** out_sentences,
    int* out_count);

// 获取范围矩形
int readmigo_typesetting_get_rects_for_range(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    int block_index,
    int char_offset,
    int char_length,
    ReadmigoTextRect** out_rects,
    int* out_count);

// 获取区块矩形
int readmigo_typesetting_get_block_rect(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    int block_index,
    ReadmigoTextRect* out_rect);

// 图片点击测试
int readmigo_typesetting_hit_test_image(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    float x, float y,
    ReadmigoImageHitResult* out_result);

// 获取页面信息
int readmigo_typesetting_get_page_info(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    int page_index,
    ReadmigoPageInfo* out_info);
```

### 3.3 数据结构定义

```c
// 添加到 readmigo_typesetting_bridge.h

typedef struct ReadmigoHitTestResult {
  int block_index;
  int char_offset;
  int char_length;
  const char* word_text;  // UTF-8
  const char* href;       // 如果是链接
  int is_link;
} ReadmigoHitTestResult;

typedef struct ReadmigoWordRange {
  int block_index;
  int start_offset;
  int end_offset;
  const char* text;  // UTF-8, 调用者负责释放
} ReadmigoWordRange;

typedef struct ReadmigoSentenceRange {
  int block_index;
  int start_offset;
  int end_offset;
  float x, y, width, height;  // 句子边界框
} ReadmigoSentenceRange;

typedef struct ReadmigoTextRect {
  int block_index;
  float x, y, width, height;
  int char_offset;
  int char_length;
} ReadmigoTextRect;

typedef struct ReadmigoImageHitResult {
  int block_index;
  const char* src;  // 图片 URL
  float x, y, width, height;
} ReadmigoImageHitResult;

typedef struct ReadmigoPageInfo {
  int page_index;
  int total_pages;
  const char* chapter_title;
  float progress;  // 0.0 - 1.0
} ReadmigoPageInfo;
```

---

## 4. Harmony 平台适配器 (platform_harmony.cpp)

### 4.1 设计思路

参考 Android 的 `AndroidPlatformAdapter`，使用 ArkUI 的文本测量 API：

```cpp
class HarmonyPlatformAdapter : public typesetting::PlatformAdapter {
public:
    HarmonyPlatformAdapter(const HarmonyPlatformOptions& options);
    
    // 字体测量
    typesetting::FontMetrics resolveFontMetrics(
        const typesetting::FontDescriptor& desc) override;
    
    // 文本测量
    typesetting::TextMeasurement measureText(
        const std::string& text,
        const typesetting::FontDescriptor& font) override;
    
    // 换行查找
    size_t findLineBreak(
        const std::string& text,
        const typesetting::FontDescriptor& font,
        float maxWidth) override;
    
    // 连字符支持
    bool supportsHyphenation(const std::string& locale) override;
    
    // 连字符位置
    std::vector<size_t> findHyphenationPoints(
        const std::string& word,
        const std::string& locale) override;
    
    // 偏移测量 (用于 TTS 高亮)
    float measureOffset(
        const std::string& text,
        const typesetting::FontDescriptor& font,
        int byteOffset) override;
    
    // 图片尺寸
    std::optional<typesetting::ImageSize> getImageSize(
        const std::string& src) override;

private:
    HarmonyPlatformOptions options_;
    
    // 字体缓存
    std::unordered_map<std::string, typesetting::FontMetrics> fontCache_;
};
```

### 4.2 与 ArkUI 集成

HarmonyOS 的文本测量需要通过 ArkUI 的 `textMeasure` API:

```cpp
// 伪代码示例
typesetting::TextMeasurement HarmonyPlatformAdapter::measureText(
    const std::string& text,
    const typesetting::FontDescriptor& font) {
    
    // 调用 ArkUI 文本测量
    // 需要通过 NAPI 回调到 ArkTS
    float width = callArkUITextMeasure(text, font.family, font.size, font.weight);
    float height = font.size * options_.defaultLineHeightMultiplier;
    
    return {width, height};
}
```

### 4.3 实现策略

由于 NAPI 是 C++ 层，需要通过以下方式调用 ArkUI:

1. **方案 A**: 在 ArkTS 层提供测量函数，NAPI 回调
2. **方案 B**: 使用 HarmonyOS 的 `@ohos.textMeasure` 模块 (如果可用)
3. **方案 C**: 集成 HarfBuzz 进行纯 C++ 文本测量

**推荐**: 方案 A + C 混合
- 常规文本：HarfBuzz (纯 C++, 快速)
- 特殊字体：ArkUI 回调 (准确)

---

## 5. NAPI 模块实现 (typesetting_napi.cpp)

### 5.1 模块结构

```cpp
#include <napi.h>
#include "readmigo_typesetting_bridge.h"

// 辅助函数：ArkTS → C++ 字符串转换
std::string napiToString(const Napi::Value& value) {
    return value.As<Napi::String>().Utf8Value();
}

// 辅助函数：C++ → ArkTS 对象转换
Napi::Object layoutResultToJs(const Napi::Env& env, 
                               const ReadmigoTypesettingLayoutSummary& summary) {
    Napi::Object result = Napi::Object::New(env);
    result.Set("pageCount", summary.page_count);
    result.Set("totalBlocks", summary.total_blocks);
    result.Set("warningCount", summary.warning_count);
    return result;
}

// === NAPI 函数 ===

Napi::Value typesettingCreate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 解析参数
    Napi::Object optionsObj = info[0].As<Napi::Object>();
    ReadmigoTypesettingCreateOptions options = {};
    
    options.font_scale = optionsObj.Get("fontScale").As<Napi::Number>().FloatValue();
    options.line_height_multiplier = optionsObj.Get("lineHeightMultiplier")
        .As<Napi::Number>().FloatValue();
    
    // 创建引擎
    ReadmigoTypesettingHandle handle = readmigo_typesetting_create(&options);
    
    // 返回外部指针 (由 GC 管理)
    return Napi::External<ReadmigoTypesettingHandle>::New(
        env, handle, [](Napi::Env, ReadmigoTypesettingHandle* handle) {
            readmigo_typesetting_destroy(*handle);
        });
}

Napi::Value typesettingLayoutHTML(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 解析参数
    Napi::External<ReadmigoTypesettingHandle> external = info[0]
        .As<Napi::External<ReadmigoTypesettingHandle>>();
    ReadmigoTypesettingHandle handle = external.Data();
    
    std::string html = napiToString(info[1]);
    
    Napi::Object optionsObj = info[2].As<Napi::Object>();
    ReadmigoTypesettingLayoutOptions options = {};
    options.chapter_id = optionsObj.Get("chapterId")
        .As<Napi::String>().Utf8Value().c_str();
    options.page_width = optionsObj.Get("pageWidth")
        .As<Napi::Number>().FloatValue();
    options.page_height = optionsObj.Get("pageHeight")
        .As<Napi::Number>().FloatValue();
    options.font_size = optionsObj.Get("fontSize")
        .As<Napi::Number>().FloatValue();
    
    // 调用布局
    ReadmigoTypesettingLayoutSummary summary = {};
    int result = readmigo_typesetting_layout_html(handle, html.c_str(), 
                                                   &options, &summary);
    
    if (result < 0) {
        Napi::Error::New(env, "Layout failed").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    return layoutResultToJs(env, summary);
}

// === 模块注册 ===

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("typesettingCreate", Napi::Function::New(env, typesettingCreate));
    exports.Set("typesettingLayoutHTML", Napi::Function::New(env, typesettingLayoutHTML));
    // ... 导出其他函数
    return exports;
}

NODE_API_MODULE(typesetting, Init)
```

### 5.2 ArkTS 封装

```typescript
// entry/src/main/ets/typesetting/TypesettingService.ts

import typeContext from '@ohos.base';
import { typesettingCreate, typesettingLayoutHTML } from 'libtypesetting_napi.so';

export interface LayoutOptions {
  chapterId: string;
  pageWidth: number;
  pageHeight: number;
  fontSize: number;
  locale?: string;
}

export interface LayoutResult {
  pageCount: number;
  totalBlocks: number;
  warningCount: number;
}

export class TypesettingService {
  private handle: any;
  private static readonly MAX_CACHED_CHAPTERS = 5;
  private chapterCache: Map<string, LayoutResult> = new Map();

  constructor(options: { fontScale?: number; lineHeightMultiplier?: number }) {
    this.handle = typesettingCreate({
      fontScale: options.fontScale ?? 1.0,
      lineHeightMultiplier: options.lineHeightMultiplier ?? 1.5,
    });
  }

  async layoutHTML(html: string, options: LayoutOptions): Promise<LayoutResult> {
    // 检查缓存
    if (this.chapterCache.has(options.chapterId)) {
      return this.chapterCache.get(options.chapterId)!;
    }

    // 调用 NAPI
    const result = await typesettingLayoutHTML(this.handle, html, options);

    // 缓存 (LRU)
    if (this.chapterCache.size >= TypesettingService.MAX_CACHED_CHAPTERS) {
      // 删除最旧的
      const firstKey = this.chapterCache.keys().next().value;
      this.chapterCache.delete(firstKey);
    }
    this.chapterCache.set(options.chapterId, result);

    return result;
  }

  destroy() {
    this.handle = null;  // NAPI external 会自动调用 destructor
    this.chapterCache.clear();
  }
}
```

---

## 6. 构建配置

### 6.1 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.20)
project(readmigo_typesetting_napi VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)

# NAPI 配置
find_package(NAPI REQUIRED)

# Typesetting engine
add_subdirectory(typesetting)

# NAPI bridge
add_library(typesetting_napi SHARED
    src/typesetting_napi.cpp
    src/typesetting_bridge.cpp
    src/platform_harmony.cpp
)

target_include_directories(typesetting_napi PRIVATE
    include/
    typesetting/include/
    ${NAPI_INCLUDE_DIRS}
)

target_link_libraries(typesetting_napi PRIVATE
    typesetting
    ${NAPI_LIBRARIES}
)

# 输出到指定目录
set_target_properties(typesetting_napi PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../entry/src/main/cpp/types"
)
```

### 6.2 build-profile.json5

```json5
{
  "apiType": "stageMode",
  "buildOption": {
    "externalNativeOptions": {
      "path": "./cpp/CMakeLists.txt",
      "arguments": "",
      "cppFlags": ""
    }
  },
  "buildOptionSet": {
    "release": {
      "arkOptions": {
        "obfuscation": {
          "ruleOptions": {
            "enable": true
          }
        }
      }
    }
  }
}
```

---

## 7. 实现计划

### Phase 1 (Week 1-2): 基础桥接

- [ ] 扩展 C API (添加交互查询函数)
- [ ] 实现 `platform_harmony.cpp` (基础字体测量)
- [ ] 实现 `typesetting_napi.cpp` (基础布局函数)
- [ ] ArkTS 封装 (TypesettingService)
- [ ] 构建配置

### Phase 2 (Week 3-4): 完整功能

- [ ] 实现所有交互查询函数
- [ ] 实现 LRU 缓存
- [ ] 实现句子缓存
- [ ] 性能优化

### Phase 3 (Week 5-6): 优化与测试

- [ ] 性能基准测试
- [ ] 内存优化
- [ ] 单元测试
- [ ] 集成测试

---

## 8. 关键文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `include/readmigo_typesetting_bridge.h` | ✅ 已存在 | C API 头文件 |
| `src/typesetting_bridge.cpp` | ⚠️ 需扩展 | C 桥接层 |
| `src/typesetting_napi.cpp` | ❌ 需实现 | NAPI 模块 |
| `src/platform_harmony.cpp` | ❌ 需实现 | Harmony 平台适配器 |
| `typesetting/` | ❌ 需拷贝 | Git submodule from overseas |
| `entry/src/main/ets/typesetting/TypesettingService.ts` | ❌ 需实现 | ArkTS 封装 |
| `entry/src/main/cpp/CMakeLists.txt` | ❌ 需实现 | 构建配置 |

---

## 9. 参考文件

| 海外版文件 | 用途 |
|------------|------|
| `typesetting/bindings/jni/TypesettingJNI.cpp` | Android JNI 实现 |
| `typesetting/bindings/swift/TypesettingBridge.h` | iOS ObjC 桥接头文件 |
| `ios/Readmigo/Vendor/Typesetting/src/TypesettingBridge.mm` | iOS ObjC++ 实现 |
| `android/app/src/main/java/com/readmigo/typesetting/TypesettingService.kt` | Android Kotlin 封装 |
| `ios/Readmigo/Core/Typesetting/TypesettingService.swift` | iOS Swift 封装 |

---

## 10. 技术难点与解决方案

### 10.1 文本测量

**问题**: HarmonyOS 没有直接的 C++ 文本测量 API

**解决方案**:
1. 集成 HarfBuzz (纯 C++ 文本 shaping)
2. NAPI 回调到 ArkTS 调用 `textMeasure` API
3. 混合方案：HarfBuzz 为主，ArkUI 为辅

### 10.2 内存管理

**问题**: C++ 引擎和 ArkTS GC 之间的内存管理

**解决方案**:
- 使用 `Napi::External` 管理 C++ 指针
- 提供 `destroy()` 方法显式释放
- LRU 缓存限制最大章节数 (5 章)

### 10.3 性能

**问题**: NAPI 跨层调用开销

**解决方案**:
- 批量操作 (一次布局整章)
- 缓存布局结果
- 异步布局 (不阻塞 UI)

---

## 11. 下一步

1. **立即执行**: 拷贝海外版 `typesetting/` submodule
2. **本周完成**: 扩展 C API + 实现 `platform_harmony.cpp` 基础版
3. **下周完成**: NAPI 模块 + ArkTS 封装
4. **Week 3-4**: 完整功能 + 测试
