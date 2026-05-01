#include "readmigo_typesetting_bridge.h"

#include "typesetting/engine.h"
#include "typesetting/platform_harmony.h"
#include "typesetting/style.h"
#include "typesetting/page.h"

#include <cstdlib>
#include <cstring>
#include <memory>
#include <new>
#include <sstream>
#include <string>
#include <unordered_map>
#include <utility>

namespace {

struct TypesettingBridgeEngine {
  std::shared_ptr<typesetting::PlatformAdapter> platform;
  std::unique_ptr<typesetting::Engine> engine;
  // 缓存上一次 layout 结果，按 chapterId 索引，供 getPage / hit-test 使用
  std::unordered_map<std::string, typesetting::LayoutResult> cache;
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

// ---------- JSON helpers (minimal, no external dep) ----------

void appendEscaped(std::ostringstream& os, const std::string& s) {
  os << '"';
  for (unsigned char c : s) {
    switch (c) {
      case '"':  os << "\\\""; break;
      case '\\': os << "\\\\"; break;
      case '\n': os << "\\n";  break;
      case '\r': os << "\\r";  break;
      case '\t': os << "\\t";  break;
      default:
        if (c < 0x20) {
          char buf[8];
          std::snprintf(buf, sizeof(buf), "\\u%04x", c);
          os << buf;
        } else {
          os << static_cast<char>(c);
        }
    }
  }
  os << '"';
}

void serializeRun(std::ostringstream& os, const typesetting::TextRun& r) {
  os << '{';
  os << "\"x\":" << r.x;
  os << ",\"y\":" << r.y;
  os << ",\"w\":" << r.width;
  os << ",\"fontSize\":" << r.font.size;
  os << ",\"blockIndex\":" << r.blockIndex;
  os << ",\"inlineIndex\":" << r.inlineIndex;
  os << ",\"charOffset\":" << r.charOffset;
  os << ",\"charLength\":" << r.charLength;
  os << ",\"isLink\":" << (r.isLink ? "true" : "false");
  os << ",\"text\":"; appendEscaped(os, r.text);
  os << '}';
}

void serializeLine(std::ostringstream& os, const typesetting::Line& l) {
  os << "{\"x\":" << l.x
     << ",\"y\":" << l.y
     << ",\"w\":" << l.width
     << ",\"h\":" << l.height
     << ",\"ascent\":" << l.ascent
     << ",\"descent\":" << l.descent
     << ",\"runs\":[";
  for (size_t i = 0; i < l.runs.size(); ++i) {
    if (i > 0) os << ',';
    serializeRun(os, l.runs[i]);
  }
  os << "]}";
}

void serializeDecoration(std::ostringstream& os, const typesetting::Decoration& d) {
  const char* type = "hr";
  if (d.type == typesetting::DecorationType::ImagePlaceholder) type = "img";
  else if (d.type == typesetting::DecorationType::TableBorder) type = "table";
  os << "{\"type\":\"" << type << "\""
     << ",\"x\":" << d.x
     << ",\"y\":" << d.y
     << ",\"w\":" << d.width
     << ",\"h\":" << d.height;
  if (d.type == typesetting::DecorationType::ImagePlaceholder) {
    os << ",\"src\":"; appendEscaped(os, d.imageSrc);
    os << ",\"alt\":"; appendEscaped(os, d.imageAlt);
  }
  os << '}';
}

std::string serializePage(const typesetting::Page& p) {
  std::ostringstream os;
  os << "{\"pageIndex\":" << p.pageIndex
     << ",\"width\":" << p.width
     << ",\"height\":" << p.height
     << ",\"contentX\":" << p.contentX
     << ",\"contentY\":" << p.contentY
     << ",\"contentWidth\":" << p.contentWidth
     << ",\"contentHeight\":" << p.contentHeight
     << ",\"firstBlockIndex\":" << p.firstBlockIndex
     << ",\"lastBlockIndex\":" << p.lastBlockIndex
     << ",\"lines\":[";
  for (size_t i = 0; i < p.lines.size(); ++i) {
    if (i > 0) os << ',';
    serializeLine(os, p.lines[i]);
  }
  os << "],\"decorations\":[";
  for (size_t i = 0; i < p.decorations.size(); ++i) {
    if (i > 0) os << ',';
    serializeDecoration(os, p.decorations[i]);
  }
  os << "]}";
  return os.str();
}

char* dupCString(const std::string& s) {
  char* mem = static_cast<char*>(std::malloc(s.size() + 1));
  if (!mem) return nullptr;
  std::memcpy(mem, s.data(), s.size());
  mem[s.size()] = '\0';
  return mem;
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

  auto result = bridge->engine->layoutHTML(html, chapterId, style, pageSize);
  out_summary->page_count = static_cast<uint32_t>(result.pages.size());
  out_summary->total_blocks = static_cast<uint32_t>(result.totalBlocks);
  out_summary->warning_count = static_cast<uint32_t>(result.warnings.size());

  bridge->cache[chapterId] = std::move(result);
  return 0;
}

char* readmigo_typesetting_get_page_json(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    uint32_t page_index) {
  if (!handle) return nullptr;
  auto* bridge = reinterpret_cast<TypesettingBridgeEngine*>(handle);
  const std::string key = (chapter_id && chapter_id[0]) ? chapter_id : "chapter-1";
  auto it = bridge->cache.find(key);
  if (it == bridge->cache.end()) return nullptr;
  if (page_index >= it->second.pages.size()) return nullptr;
  return dupCString(serializePage(it->second.pages[page_index]));
}

char* readmigo_typesetting_get_chapter_anchors_json(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id) {
  if (!handle) return nullptr;
  auto* bridge = reinterpret_cast<TypesettingBridgeEngine*>(handle);
  const std::string key = (chapter_id && chapter_id[0]) ? chapter_id : "chapter-1";
  auto it = bridge->cache.find(key);
  if (it == bridge->cache.end()) return nullptr;

  std::ostringstream os;
  os << '[';
  bool first = true;
  for (const auto& page : it->second.pages) {
    if (!first) os << ',';
    first = false;
    os << "{\"pageIndex\":" << page.pageIndex
       << ",\"firstBlockIndex\":" << page.firstBlockIndex
       << ",\"lastBlockIndex\":" << page.lastBlockIndex
       << '}';
  }
  os << ']';
  return dupCString(os.str());
}

// Helper: 在 run.text 中找到包含 charIdx 的 word 边界（字母+撇号）
static void findWordBounds(const std::string& text, size_t charIdx, size_t* outStart, size_t* outLen) {
  if (text.empty()) {
    *outStart = 0;
    *outLen = 0;
    return;
  }
  if (charIdx >= text.size()) charIdx = text.size() - 1;

  auto isWordChar = [](char c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '\'' || c == '-';
  };

  // 不在词内则向左/右各扩 8 字符寻找最近词
  if (!isWordChar(text[charIdx])) {
    size_t left = charIdx;
    size_t right = charIdx;
    bool found = false;
    for (int d = 1; d <= 8 && !found; ++d) {
      if (charIdx >= static_cast<size_t>(d) && isWordChar(text[charIdx - d])) {
        charIdx -= d;
        found = true;
      } else if (charIdx + d < text.size() && isWordChar(text[charIdx + d])) {
        charIdx += d;
        found = true;
      }
    }
    if (!found) {
      *outStart = charIdx;
      *outLen = 1;
      return;
    }
  }

  size_t start = charIdx;
  while (start > 0 && isWordChar(text[start - 1])) --start;
  size_t end = charIdx;
  while (end + 1 < text.size() && isWordChar(text[end + 1])) ++end;
  *outStart = start;
  *outLen = end - start + 1;
}

char* readmigo_typesetting_hit_test_json(
    ReadmigoTypesettingHandle handle,
    const char* chapter_id,
    uint32_t page_index,
    float x,
    float y) {
  if (!handle) return nullptr;
  auto* bridge = reinterpret_cast<TypesettingBridgeEngine*>(handle);
  const std::string key = (chapter_id && chapter_id[0]) ? chapter_id : "chapter-1";
  auto it = bridge->cache.find(key);
  if (it == bridge->cache.end()) return nullptr;
  if (page_index >= it->second.pages.size()) return nullptr;

  const auto& page = it->second.pages[page_index];
  for (const auto& line : page.lines) {
    if (y < line.y - line.ascent || y > line.y + line.descent) continue;
    for (const auto& run : line.runs) {
      if (x < run.x || x > run.x + run.width) continue;
      // 字符精度：按比例估算被点字符
      // TODO(W3): 用 PlatformAdapter::measure_text 拿真实字宽做二分
      size_t charIdx = 0;
      if (run.charLength > 0 && run.width > 0) {
        const float ratio = (x - run.x) / run.width;
        charIdx = static_cast<size_t>(ratio * static_cast<float>(run.charLength));
        if (charIdx >= run.text.size()) charIdx = run.text.size() - 1;
      }
      size_t wStart = 0, wLen = 0;
      findWordBounds(run.text, charIdx, &wStart, &wLen);
      const std::string word = run.text.substr(wStart, wLen);

      std::ostringstream os;
      os << "{\"blockIndex\":" << run.blockIndex
         << ",\"inlineIndex\":" << run.inlineIndex
         << ",\"charOffset\":" << (run.charOffset + static_cast<int>(wStart))
         << ",\"charLength\":" << static_cast<int>(wLen)
         << ",\"text\":";
      appendEscaped(os, word);
      os << '}';
      return dupCString(os.str());
    }
  }
  return nullptr;
}

void readmigo_typesetting_free_json(char* json_str) {
  if (json_str) std::free(json_str);
}

}  // extern "C"
