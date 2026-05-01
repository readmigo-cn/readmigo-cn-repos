//
// typesetting_napi.cpp
// HarmonyOS NAPI 绑定：把 native/typesetting 的 C++ Engine 暴露给 ArkTS。
//
// 设计要点：
//   1. 用 napi_external 包住 TypesettingHandle*（含 Engine + 缓存），由 GC
//      finalizer 触发析构；ArkTS 侧只看到一个 opaque handle。
//   2. 所有 NAPI 入口都用 NAPI_TRY_BEGIN/END 包裹，把 NapiException 翻译成
//      JS 异常，业务逻辑里大胆抛 throw 不需要每行 if 检查 napi_status。
//   3. layout 结果（pages / sentences / hit-test）以纯 JS 对象返回，不再
//      使用 JSON 字符串桥（旧 bridge 保留兼容，但新 API 走结构化对象）。
//   4. 对于 ArkTS 端要绘制的 page 数据，返回的 TextRun 数组里坐标已经是
//      page 像素坐标，ArkTS 直接喂给 Canvas / Drawing kit。
//

#include <napi/native_api.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "common/napi_convert.h"
#include "common/napi_error.h"

#include "typesetting/document.h"
#include "typesetting/engine.h"
#include "typesetting/interaction.h"
#include "typesetting/layout.h"
#include "typesetting/layout_profile.h"
#include "typesetting/page.h"
#include "typesetting/platform.h"
#include "typesetting/platform_harmony.h"
#include "typesetting/style.h"

namespace readmigo {
namespace napi_bridge {
namespace {

namespace ts = typesetting;

// ---------------------------------------------------------------------------
// TypesettingHandle: 一个 ArkTS 句柄对应一个 Engine + 默认 Style/PageSize
// + 主题 / 字号等配置。多 chapter 状态由 Engine 内部 ChapterState 管理。
// ---------------------------------------------------------------------------
struct TypesettingHandle {
    std::shared_ptr<ts::PlatformAdapter> platform;
    std::unique_ptr<ts::Engine> engine;

    // 默认 Style：setLayoutProfile 时设定，layoutHTML 时套用。
    ts::Style defaultStyle;
    ts::PageSize defaultPageSize;

    // 互斥锁保护多线程访问（ArkTS Worker 可能并发调用查询接口）。
    std::mutex mu;
};

void TypesettingFinalize(napi_env /*env*/, void* data, void* /*hint*/) {
    auto* handle = static_cast<TypesettingHandle*>(data);
    delete handle;
}

TypesettingHandle* UnwrapHandle(napi_env env, napi_value value) {
    return UnwrapExternal<TypesettingHandle>(env, value);
}

// ---------------------------------------------------------------------------
// Style / PageSize 解析
// ---------------------------------------------------------------------------
ts::Style ParseStyle(napi_env env, napi_value obj, const ts::Style& base) {
    ts::Style style = base;
    if (auto v = TryGetStringProp(env, obj, "fontFamily"))
        style.font.family = *v;
    if (auto v = TryGetFloatProp(env, obj, "fontSize"))
        style.font.size = *v;
    if (auto v = TryGetFloatProp(env, obj, "lineSpacingMultiplier"))
        style.lineSpacingMultiplier = *v;
    if (auto v = TryGetFloatProp(env, obj, "letterSpacing"))
        style.letterSpacing = *v;
    if (auto v = TryGetFloatProp(env, obj, "wordSpacing"))
        style.wordSpacing = *v;
    if (auto v = TryGetFloatProp(env, obj, "paragraphSpacing"))
        style.paragraphSpacing = *v;
    if (auto v = TryGetFloatProp(env, obj, "textIndent"))
        style.textIndent = *v;
    if (auto v = TryGetFloatProp(env, obj, "marginTop"))
        style.marginTop = *v;
    if (auto v = TryGetFloatProp(env, obj, "marginBottom"))
        style.marginBottom = *v;
    if (auto v = TryGetFloatProp(env, obj, "marginLeft"))
        style.marginLeft = *v;
    if (auto v = TryGetFloatProp(env, obj, "marginRight"))
        style.marginRight = *v;
    if (auto v = TryGetBoolProp(env, obj, "hyphenation"))
        style.hyphenation = *v;
    if (auto v = TryGetStringProp(env, obj, "locale"))
        style.locale = *v;
    if (auto v = TryGetStringProp(env, obj, "alignment")) {
        if (*v == "left") style.alignment = ts::TextAlignment::Left;
        else if (*v == "center") style.alignment = ts::TextAlignment::Center;
        else if (*v == "right") style.alignment = ts::TextAlignment::Right;
        else style.alignment = ts::TextAlignment::Justified;
    }
    return style;
}

ts::PageSize ParsePageSize(napi_env env, napi_value obj,
                           const ts::PageSize& base) {
    ts::PageSize ps = base;
    if (auto v = TryGetFloatProp(env, obj, "width")) ps.width = *v;
    if (auto v = TryGetFloatProp(env, obj, "height")) ps.height = *v;
    return ps;
}

// ---------------------------------------------------------------------------
// 数据序列化：Page / Line / TextRun / Decoration → JS 对象
// ---------------------------------------------------------------------------
napi_value RunToJs(napi_env env, const ts::TextRun& r) {
    return MakeObject(env, {
        {"text", FromString(env, r.text)},
        {"x", FromFloat(env, r.x)},
        {"y", FromFloat(env, r.y)},
        {"width", FromFloat(env, r.width)},
        {"fontFamily", FromString(env, r.font.family)},
        {"fontSize", FromFloat(env, r.font.size)},
        {"fontWeight",
         FromInt32(env, static_cast<int32_t>(r.font.weight))},
        {"italic",
         FromBool(env, r.font.style == ts::FontStyle::Italic)},
        {"blockIndex", FromInt32(env, r.blockIndex)},
        {"inlineIndex", FromInt32(env, r.inlineIndex)},
        {"charOffset", FromInt32(env, r.charOffset)},
        {"charLength", FromInt32(env, r.charLength)},
        {"isLink", FromBool(env, r.isLink)},
        {"href", FromString(env, r.href)},
        {"isSuperscript", FromBool(env, r.isSuperscript)},
        {"isSubscript", FromBool(env, r.isSubscript)},
        {"smallCaps", FromBool(env, r.smallCaps)},
    });
}

napi_value LineToJs(napi_env env, const ts::Line& l) {
    napi_value runs = FromVector<ts::TextRun, decltype(&RunToJs)>(
        env, l.runs, RunToJs);
    return MakeObject(env, {
        {"x", FromFloat(env, l.x)},
        {"y", FromFloat(env, l.y)},
        {"width", FromFloat(env, l.width)},
        {"height", FromFloat(env, l.height)},
        {"ascent", FromFloat(env, l.ascent)},
        {"descent", FromFloat(env, l.descent)},
        {"isLastLineOfParagraph",
         FromBool(env, l.isLastLineOfParagraph)},
        {"endsWithHyphen", FromBool(env, l.endsWithHyphen)},
        {"runs", runs},
    });
}

napi_value DecorationToJs(napi_env env, const ts::Decoration& d) {
    const char* type = "hr";
    if (d.type == ts::DecorationType::ImagePlaceholder) type = "image";
    else if (d.type == ts::DecorationType::TableBorder) type = "table";
    return MakeObject(env, {
        {"type", FromCString(env, type)},
        {"x", FromFloat(env, d.x)},
        {"y", FromFloat(env, d.y)},
        {"width", FromFloat(env, d.width)},
        {"height", FromFloat(env, d.height)},
        {"imageSrc", FromString(env, d.imageSrc)},
        {"imageAlt", FromString(env, d.imageAlt)},
        {"borderWidth", FromFloat(env, d.borderWidth)},
    });
}

napi_value PageToJs(napi_env env, const ts::Page& p) {
    napi_value lines = FromVector<ts::Line, decltype(&LineToJs)>(
        env, p.lines, LineToJs);
    napi_value decos = FromVector<ts::Decoration, decltype(&DecorationToJs)>(
        env, p.decorations, DecorationToJs);
    return MakeObject(env, {
        {"pageIndex", FromInt32(env, p.pageIndex)},
        {"width", FromFloat(env, p.width)},
        {"height", FromFloat(env, p.height)},
        {"contentX", FromFloat(env, p.contentX)},
        {"contentY", FromFloat(env, p.contentY)},
        {"contentWidth", FromFloat(env, p.contentWidth)},
        {"contentHeight", FromFloat(env, p.contentHeight)},
        {"firstBlockIndex", FromInt32(env, p.firstBlockIndex)},
        {"lastBlockIndex", FromInt32(env, p.lastBlockIndex)},
        {"lines", lines},
        {"decorations", decos},
    });
}

napi_value TextRectToJs(napi_env env, const ts::TextRect& r) {
    return MakeObject(env, {
        {"x", FromFloat(env, r.x)},
        {"y", FromFloat(env, r.y)},
        {"width", FromFloat(env, r.width)},
        {"height", FromFloat(env, r.height)},
    });
}

napi_value WordRangeToJs(napi_env env, const ts::WordRange& w) {
    return MakeObject(env, {
        {"blockIndex", FromInt32(env, w.blockIndex)},
        {"charOffset", FromInt32(env, w.charOffset)},
        {"charLength", FromInt32(env, w.charLength)},
        {"text", FromString(env, w.text)},
    });
}

napi_value SentenceRangeToJs(napi_env env, const ts::SentenceRange& s) {
    return MakeObject(env, {
        {"blockIndex", FromInt32(env, s.blockIndex)},
        {"charOffset", FromInt32(env, s.charOffset)},
        {"charLength", FromInt32(env, s.charLength)},
        {"text", FromString(env, s.text)},
    });
}

// ---------------------------------------------------------------------------
// NAPI 入口函数
// ---------------------------------------------------------------------------

napi_value CreateEngine(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, /*minArgs*/ 0, /*maxArgs*/ 1);

    ts::HarmonyPlatformOptions platOpts;
    if (args.argc >= 1) {
        napi_value cfg = args.argv[0];
        if (auto v = TryGetFloatProp(env, cfg, "fontScale"))
            platOpts.defaultFontScale = *v;
        if (auto v = TryGetFloatProp(env, cfg, "lineHeightMultiplier"))
            platOpts.defaultLineHeightMultiplier = *v;
        if (auto v = TryGetStringProp(env, cfg, "locale"))
            platOpts.defaultLocale = *v;
    }

    auto* handle = new TypesettingHandle();
    handle->platform = ts::createHarmonyPlatformAdapter(platOpts);
    handle->engine = std::make_unique<ts::Engine>(handle->platform);
    handle->defaultStyle.font.family = "HarmonyOS Sans";
    handle->defaultStyle.font.size = 18.0f;
    handle->defaultStyle.locale = platOpts.defaultLocale;
    return WrapExternal<TypesettingHandle>(env, handle, TypesettingFinalize);
    NAPI_TRY_END(env);
}

napi_value DestroyEngine(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    // 立即析构而不是等 GC：让 ArkTS 显式释放 native 资源。
    void* data = nullptr;
    napi_get_value_external(env, args.argv[0], &data);
    if (data) {
        delete static_cast<TypesettingHandle*>(data);
    }
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// 设置默认 layoutProfile（屏幕尺寸 + 安全区 → 推荐 margin/字号），
// ArkTS 侧通常调用一次后所有 layoutHTML 都吃这个 profile。
napi_value SetLayoutProfile(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    napi_value cfg = args.argv[1];

    const float screenW = GetFloatProp(env, cfg, "screenWidth");
    const float screenH = GetFloatProp(env, cfg, "screenHeight");
    const float safeT = TryGetFloatProp(env, cfg, "safeTop").value_or(0);
    const float safeB = TryGetFloatProp(env, cfg, "safeBottom").value_or(0);
    const float safeL = TryGetFloatProp(env, cfg, "safeLeft").value_or(0);
    const float safeR = TryGetFloatProp(env, cfg, "safeRight").value_or(0);

    auto profile = ts::computeLayoutProfile(screenW, screenH, safeT, safeB,
                                            safeL, safeR);

    std::lock_guard<std::mutex> lk(h->mu);
    h->defaultStyle.marginTop = profile.marginTop;
    h->defaultStyle.marginBottom = profile.marginBottom;
    h->defaultStyle.marginLeft = profile.marginLeft;
    h->defaultStyle.marginRight = profile.marginRight;
    if (auto v = TryGetFloatProp(env, cfg, "fontSize"))
        h->defaultStyle.font.size = *v;
    else
        h->defaultStyle.font.size = profile.suggestedFontSize;
    if (auto v = TryGetFloatProp(env, cfg, "lineHeight"))
        h->defaultStyle.lineSpacingMultiplier = *v;
    else
        h->defaultStyle.lineSpacingMultiplier = profile.suggestedLineHeight;
    h->defaultPageSize.width = screenW;
    h->defaultPageSize.height = screenH;

    return MakeObject(env, {
        {"marginTop", FromFloat(env, profile.marginTop)},
        {"marginBottom", FromFloat(env, profile.marginBottom)},
        {"marginLeft", FromFloat(env, profile.marginLeft)},
        {"marginRight", FromFloat(env, profile.marginRight)},
        {"headerY", FromFloat(env, profile.headerY)},
        {"footerY", FromFloat(env, profile.footerY)},
        {"suggestedFontSize",
         FromFloat(env, profile.suggestedFontSize)},
        {"suggestedLineHeight",
         FromFloat(env, profile.suggestedLineHeight)},
    });
    NAPI_TRY_END(env);
}

// 设置主题（day/night/sepia 的差异通常体现在颜色，颜色由 ArkTS 端绘制时决定，
// 这里只更新 Style 中和排版相关的部分；颜色作为副作用记录在 handle 上供查询）。
napi_value SetTheme(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string theme = ToString(env, args.argv[1]);

    std::lock_guard<std::mutex> lk(h->mu);
    // TODO(W3): 当 typesetting 引擎暴露 theme 颜色字段后，把 theme 同步进去；
    // 目前只更新 hyphenation 之类不依赖颜色的字段，颜色由 ArkTS Canvas 决定。
    if (theme == "night") {
        h->defaultStyle.hyphenation = true;
    } else if (theme == "sepia") {
        h->defaultStyle.hyphenation = true;
    } else {
        h->defaultStyle.hyphenation = true;  // day
    }
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// 调整字号 / 行高（增量改 Style，不重新创建 Engine）。
napi_value SetTypography(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    napi_value cfg = args.argv[1];

    std::lock_guard<std::mutex> lk(h->mu);
    if (auto v = TryGetFloatProp(env, cfg, "fontSize"))
        h->defaultStyle.font.size = *v;
    if (auto v = TryGetFloatProp(env, cfg, "lineHeight"))
        h->defaultStyle.lineSpacingMultiplier = *v;
    if (auto v = TryGetStringProp(env, cfg, "fontFamily"))
        h->defaultStyle.font.family = *v;
    if (auto v = TryGetFloatProp(env, cfg, "letterSpacing"))
        h->defaultStyle.letterSpacing = *v;
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// layoutHtml(handle, htmlStr, chapterId, optionalOverrides)
napi_value LayoutHtml(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 5);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string html = ToString(env, args.argv[1]);
    const std::string chapterId = ToString(env, args.argv[2]);

    ts::Style style;
    ts::PageSize pageSize;
    {
        std::lock_guard<std::mutex> lk(h->mu);
        style = h->defaultStyle;
        pageSize = h->defaultPageSize;
    }
    if (args.argc >= 4) {
        style = ParseStyle(env, args.argv[3], style);
    }
    if (args.argc >= 5) {
        pageSize = ParsePageSize(env, args.argv[4], pageSize);
    }

    auto result = h->engine->layoutHTML(html, chapterId, style, pageSize);

    return MakeObject(env, {
        {"chapterId", FromString(env, result.chapterId)},
        {"pageCount", FromUint32(env, static_cast<uint32_t>(
                                          result.pages.size()))},
        {"totalBlocks", FromInt32(env, result.totalBlocks)},
        {"warningCount", FromUint32(env, static_cast<uint32_t>(
                                            result.warnings.size()))},
    });
    NAPI_TRY_END(env);
}

// layoutHtmlWithCss(handle, html, css, chapterId, ...)
napi_value LayoutHtmlWithCss(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 4, 6);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string html = ToString(env, args.argv[1]);
    const std::string css = ToString(env, args.argv[2]);
    const std::string chapterId = ToString(env, args.argv[3]);

    ts::Style style;
    ts::PageSize pageSize;
    {
        std::lock_guard<std::mutex> lk(h->mu);
        style = h->defaultStyle;
        pageSize = h->defaultPageSize;
    }
    if (args.argc >= 5) style = ParseStyle(env, args.argv[4], style);
    if (args.argc >= 6) pageSize = ParsePageSize(env, args.argv[5], pageSize);

    auto result = h->engine->layoutHTML(html, css, chapterId, style, pageSize);

    return MakeObject(env, {
        {"chapterId", FromString(env, result.chapterId)},
        {"pageCount", FromUint32(env, static_cast<uint32_t>(
                                          result.pages.size()))},
        {"totalBlocks", FromInt32(env, result.totalBlocks)},
        {"warningCount", FromUint32(env, static_cast<uint32_t>(
                                            result.warnings.size()))},
    });
    NAPI_TRY_END(env);
}

// relayout(handle, optionalOverrides)：复用上次 blocks 重新排版（改字号常用）。
napi_value Relayout(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);

    ts::Style style;
    ts::PageSize pageSize;
    {
        std::lock_guard<std::mutex> lk(h->mu);
        style = h->defaultStyle;
        pageSize = h->defaultPageSize;
    }
    if (args.argc >= 2) style = ParseStyle(env, args.argv[1], style);
    if (args.argc >= 3) pageSize = ParsePageSize(env, args.argv[2], pageSize);

    auto result = h->engine->relayout(style, pageSize);
    return MakeObject(env, {
        {"chapterId", FromString(env, result.chapterId)},
        {"pageCount", FromUint32(env, static_cast<uint32_t>(
                                          result.pages.size()))},
        {"totalBlocks", FromInt32(env, result.totalBlocks)},
    });
    NAPI_TRY_END(env);
}

napi_value SetChapterTitle(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const std::string title = ToString(env, args.argv[2]);
    h->engine->setChapterTitle(chapterId, title);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value EvictChapter(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    h->engine->evictChapter(chapterId);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value EvictAll(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    auto* h = UnwrapHandle(env, args.argv[0]);
    h->engine->evictAll();
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// renderPage(handle, chapterId, pageIndex) → Page JS 对象（含 lines/runs/decorations）
napi_value RenderPage(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);

    // Engine 的 PageInfo 提供 page 元信息；要拿完整 Page 数据需要在 chapter
    // state 里读 layout 缓存。Engine 当前没暴露 getPage(chapterId, idx)，
    // 因此我们调 hitTest/PageInfo 之外，先通过 PageInfo 检查越界，再交给
    // InteractionManager 暴露的接口拿完整 Lines。
    // TODO(W3-typesetting): 给 Engine 加 const Page* getPage(chapterId, idx)
    // 让 NAPI 不必通过 hit-test 间接访问。
    auto pi = h->engine->getPageInfo(chapterId, pageIndex);
    NAPI_THROW_IF(env, pi.totalPages == 0, ErrorCode::kErrLayout,
                  "chapter not laid out: " + chapterId);
    NAPI_THROW_IF(env, pageIndex < 0 || pageIndex >= pi.totalPages,
                  ErrorCode::kErrOutOfRange, "page index out of range");

    // 兜底：没有完整 page 暴露接口时返回 PageInfo + 空 lines，并标记 partial。
    return MakeObject(env, {
        {"pageIndex", FromInt32(env, pageIndex)},
        {"chapterTitle", FromString(env, pi.chapterTitle)},
        {"currentPage", FromInt32(env, pi.currentPage)},
        {"totalPages", FromInt32(env, pi.totalPages)},
        {"progress", FromDouble(env, pi.progress)},
        {"firstBlockIndex", FromInt32(env, pi.firstBlockIndex)},
        {"lastBlockIndex", FromInt32(env, pi.lastBlockIndex)},
        {"partial", FromBool(env, true)},  // 见上 TODO
    });
    NAPI_TRY_END(env);
}

napi_value GetPageInfo(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    auto pi = h->engine->getPageInfo(chapterId, pageIndex);
    return MakeObject(env, {
        {"chapterTitle", FromString(env, pi.chapterTitle)},
        {"currentPage", FromInt32(env, pi.currentPage)},
        {"totalPages", FromInt32(env, pi.totalPages)},
        {"progress", FromDouble(env, pi.progress)},
        {"firstBlockIndex", FromInt32(env, pi.firstBlockIndex)},
        {"lastBlockIndex", FromInt32(env, pi.lastBlockIndex)},
    });
    NAPI_TRY_END(env);
}

// hitTest(handle, chapterId, pageIndex, x, y) → { found, blockIndex, ... }
napi_value HitTest(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 5, 5);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    const float x = ToFloat(env, args.argv[3]);
    const float y = ToFloat(env, args.argv[4]);
    auto r = h->engine->hitTest(chapterId, pageIndex, x, y);
    return MakeObject(env, {
        {"found", FromBool(env, r.found)},
        {"blockIndex", FromInt32(env, r.blockIndex)},
        {"lineIndex", FromInt32(env, r.lineIndex)},
        {"runIndex", FromInt32(env, r.runIndex)},
        {"charOffset", FromInt32(env, r.charOffset)},
    });
    NAPI_TRY_END(env);
}

napi_value WordAtPoint(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 5, 5);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    const float x = ToFloat(env, args.argv[3]);
    const float y = ToFloat(env, args.argv[4]);
    auto w = h->engine->wordAtPoint(chapterId, pageIndex, x, y);
    return WordRangeToJs(env, w);
    NAPI_TRY_END(env);
}

napi_value GetSentences(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    auto v = h->engine->getSentences(chapterId, pageIndex);
    return FromVector<ts::SentenceRange, decltype(&SentenceRangeToJs)>(
        env, v, SentenceRangeToJs);
    NAPI_TRY_END(env);
}

napi_value GetAllSentences(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    auto v = h->engine->getAllSentences(chapterId);
    return FromVector<ts::SentenceRange, decltype(&SentenceRangeToJs)>(
        env, v, SentenceRangeToJs);
    NAPI_TRY_END(env);
}

napi_value GetRectsForRange(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 6, 6);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    const int32_t blockIndex = ToInt32(env, args.argv[3]);
    const int32_t charOffset = ToInt32(env, args.argv[4]);
    const int32_t charLength = ToInt32(env, args.argv[5]);
    auto v = h->engine->getRectsForRange(chapterId, pageIndex, blockIndex,
                                         charOffset, charLength);
    return FromVector<ts::TextRect, decltype(&TextRectToJs)>(env, v,
                                                              TextRectToJs);
    NAPI_TRY_END(env);
}

napi_value GetBlockRect(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 4, 4);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string chapterId = ToString(env, args.argv[1]);
    const int32_t pageIndex = ToInt32(env, args.argv[2]);
    const int32_t blockIndex = ToInt32(env, args.argv[3]);
    auto r = h->engine->getBlockRect(chapterId, pageIndex, blockIndex);
    return TextRectToJs(env, r);
    NAPI_TRY_END(env);
}

// measureText(handle, text, { fontFamily, fontSize, weight }) → { width, height }
napi_value MeasureText(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapHandle(env, args.argv[0]);
    const std::string text = ToString(env, args.argv[1]);
    napi_value fontObj = args.argv[2];

    ts::FontDescriptor desc;
    if (auto v = TryGetStringProp(env, fontObj, "family"))
        desc.family = *v;
    if (auto v = TryGetFloatProp(env, fontObj, "size"))
        desc.size = *v;
    if (auto v = TryGetInt32Prop(env, fontObj, "weight"))
        desc.weight = static_cast<ts::FontWeight>(*v);
    if (auto v = TryGetBoolProp(env, fontObj, "italic"))
        desc.style = *v ? ts::FontStyle::Italic : ts::FontStyle::Normal;

    auto m = h->platform->measureText(text, desc);
    return MakeObject(env, {
        {"width", FromFloat(env, m.width)},
        {"height", FromFloat(env, m.height)},
    });
    NAPI_TRY_END(env);
}

napi_value GetFontMetrics(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapHandle(env, args.argv[0]);
    napi_value fontObj = args.argv[1];

    ts::FontDescriptor desc;
    if (auto v = TryGetStringProp(env, fontObj, "family"))
        desc.family = *v;
    if (auto v = TryGetFloatProp(env, fontObj, "size"))
        desc.size = *v;

    auto m = h->platform->resolveFontMetrics(desc);
    return MakeObject(env, {
        {"ascent", FromFloat(env, m.ascent)},
        {"descent", FromFloat(env, m.descent)},
        {"leading", FromFloat(env, m.leading)},
        {"xHeight", FromFloat(env, m.xHeight)},
        {"capHeight", FromFloat(env, m.capHeight)},
        {"lineHeight", FromFloat(env, m.lineHeight())},
    });
    NAPI_TRY_END(env);
}

// 暴露层级布局信息：computeLayoutProfile 的纯函数版本，便于 ArkTS 在不创建
// engine 的情况下查询推荐 margin / 字号。
napi_value ComputeLayoutProfile(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    napi_value cfg = args.argv[0];
    const float w = GetFloatProp(env, cfg, "screenWidth");
    const float h = GetFloatProp(env, cfg, "screenHeight");
    const float st = TryGetFloatProp(env, cfg, "safeTop").value_or(0);
    const float sb = TryGetFloatProp(env, cfg, "safeBottom").value_or(0);
    const float sl = TryGetFloatProp(env, cfg, "safeLeft").value_or(0);
    const float sr = TryGetFloatProp(env, cfg, "safeRight").value_or(0);
    auto p = ts::computeLayoutProfile(w, h, st, sb, sl, sr);
    return MakeObject(env, {
        {"marginTop", FromFloat(env, p.marginTop)},
        {"marginBottom", FromFloat(env, p.marginBottom)},
        {"marginLeft", FromFloat(env, p.marginLeft)},
        {"marginRight", FromFloat(env, p.marginRight)},
        {"headerY", FromFloat(env, p.headerY)},
        {"footerY", FromFloat(env, p.footerY)},
        {"headerFontSize", FromFloat(env, p.headerFontSize)},
        {"footerFontSize", FromFloat(env, p.footerFontSize)},
        {"suggestedFontSize", FromFloat(env, p.suggestedFontSize)},
        {"suggestedLineHeight", FromFloat(env, p.suggestedLineHeight)},
    });
    NAPI_TRY_END(env);
}

// ---------------------------------------------------------------------------
// 模块注册
// ---------------------------------------------------------------------------
napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor props[] = {
        {"createEngine", nullptr, CreateEngine, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"destroyEngine", nullptr, DestroyEngine, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setLayoutProfile", nullptr, SetLayoutProfile, nullptr, nullptr,
         nullptr, napi_default, nullptr},
        {"setTheme", nullptr, SetTheme, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setTypography", nullptr, SetTypography, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"layoutHtml", nullptr, LayoutHtml, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"layoutHtmlWithCss", nullptr, LayoutHtmlWithCss, nullptr, nullptr,
         nullptr, napi_default, nullptr},
        {"relayout", nullptr, Relayout, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setChapterTitle", nullptr, SetChapterTitle, nullptr, nullptr,
         nullptr, napi_default, nullptr},
        {"evictChapter", nullptr, EvictChapter, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"evictAll", nullptr, EvictAll, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"renderPage", nullptr, RenderPage, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"getPageInfo", nullptr, GetPageInfo, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"hitTest", nullptr, HitTest, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"wordAtPoint", nullptr, WordAtPoint, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"getSentences", nullptr, GetSentences, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"getAllSentences", nullptr, GetAllSentences, nullptr, nullptr,
         nullptr, napi_default, nullptr},
        {"getRectsForRange", nullptr, GetRectsForRange, nullptr, nullptr,
         nullptr, napi_default, nullptr},
        {"getBlockRect", nullptr, GetBlockRect, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"measureText", nullptr, MeasureText, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"getFontMetrics", nullptr, GetFontMetrics, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"computeLayoutProfile", nullptr, ComputeLayoutProfile, nullptr,
         nullptr, nullptr, napi_default, nullptr},
    };
    napi_define_properties(env, exports,
                           sizeof(props) / sizeof(props[0]), props);
    return exports;
}

}  // namespace
}  // namespace napi_bridge
}  // namespace readmigo

extern "C" {

// HarmonyOS NAPI 模块注册（参考 OpenHarmony native_api 文档）。
// 模块名 typesetting：ArkTS 端 import typesetting from 'libtypesetting.so'。
static napi_module g_typesettingModule = {
    /* nm_version */ 1,
    /* nm_flags */ 0,
    /* nm_filename */ nullptr,
    /* nm_register_func */ readmigo::napi_bridge::Init,
    /* nm_modname */ "typesetting",
    /* nm_priv */ nullptr,
    {0},
};

__attribute__((constructor)) void RegisterTypesettingModule(void) {
    napi_module_register(&g_typesettingModule);
}

}  // extern "C"
