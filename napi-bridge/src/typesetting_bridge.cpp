#include "readmigo_typesetting_bridge.h"

#include "typesetting/engine.h"
#include "typesetting/platform_harmony.h"
#include "typesetting/style.h"

#include <memory>
#include <new>
#include <string>
#include <utility>

namespace {

struct TypesettingBridgeEngine {
  std::shared_ptr<typesetting::PlatformAdapter> platform;
  std::unique_ptr<typesetting::Engine> engine;
};

typesetting::Style buildStyle(const ReadmigoTypesettingLayoutOptions* options) {
  typesetting::Style style;
  style.font.family = "HarmonyOS Sans";
  style.font.size = options && options->font_size > 0 ? options->font_size : 18.0f;
  style.locale = (options && options->locale) ? options->locale : "zh-CN";
  return style;
}

typesetting::PageSize buildPageSize(const ReadmigoTypesettingLayoutOptions* options) {
  typesetting::PageSize pageSize;
  pageSize.width = options && options->page_width > 0 ? options->page_width : 390.0f;
  pageSize.height = options && options->page_height > 0 ? options->page_height : 844.0f;
  return pageSize;
}

std::string buildChapterId(const ReadmigoTypesettingLayoutOptions* options) {
  if (options && options->chapter_id && options->chapter_id[0] != '\0') {
    return options->chapter_id;
  }
  return "chapter-1";
}

}  // namespace

extern "C" {

ReadmigoTypesettingHandle readmigo_typesetting_create(
    const ReadmigoTypesettingCreateOptions* options) {
  typesetting::HarmonyPlatformOptions platformOptions;
  if (options) {
    if (options->font_scale > 0) {
      platformOptions.defaultFontScale = options->font_scale;
    }
    if (options->line_height_multiplier > 0) {
      platformOptions.defaultLineHeightMultiplier = options->line_height_multiplier;
    }
    if (options->default_locale) {
      platformOptions.defaultLocale = options->default_locale;
    }
  }

  auto* bridge = new (std::nothrow) TypesettingBridgeEngine();
  if (!bridge) {
    return nullptr;
  }

  bridge->platform = typesetting::createHarmonyPlatformAdapter(std::move(platformOptions));
  bridge->engine = std::make_unique<typesetting::Engine>(bridge->platform);
  return reinterpret_cast<ReadmigoTypesettingHandle>(bridge);
}

void readmigo_typesetting_destroy(ReadmigoTypesettingHandle handle) {
  delete reinterpret_cast<TypesettingBridgeEngine*>(handle);
}

int readmigo_typesetting_layout_html(
    ReadmigoTypesettingHandle handle,
    const char* html,
    const ReadmigoTypesettingLayoutOptions* options,
    ReadmigoTypesettingLayoutSummary* out_summary) {
  if (!handle || !html || !out_summary) {
    return -1;
  }

  auto* bridge = reinterpret_cast<TypesettingBridgeEngine*>(handle);
  const auto style = buildStyle(options);
  const auto pageSize = buildPageSize(options);
  const auto chapterId = buildChapterId(options);

  const auto result = bridge->engine->layoutHTML(html, chapterId, style, pageSize);
  out_summary->page_count = static_cast<uint32_t>(result.pages.size());
  out_summary->total_blocks = static_cast<uint32_t>(result.totalBlocks);
  out_summary->warning_count = static_cast<uint32_t>(result.warnings.size());
  return 0;
}

}  // extern "C"
