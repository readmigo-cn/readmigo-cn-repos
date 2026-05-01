#include "readmigo_typesetting_bridge.h"

#include <node_api.h>

#include <string>
#include <vector>

namespace {

struct TypesettingExternalHolder {
  ReadmigoTypesettingHandle handle = nullptr;
};

void throwTypeError(napi_env env, const char* message) {
  napi_throw_type_error(env, nullptr, message);
}

bool getString(napi_env env, napi_value value, std::string* out) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok) {
    return false;
  }

  std::vector<char> buffer(length + 1, '\0');
  if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(), &length) != napi_ok) {
    return false;
  }

  out->assign(buffer.data(), length);
  return true;
}

bool getFloat(napi_env env, napi_value value, float* out) {
  double number = 0;
  if (napi_get_value_double(env, value, &number) != napi_ok) {
    return false;
  }
  *out = static_cast<float>(number);
  return true;
}

napi_value createTypesettingEngine(napi_env env, napi_callback_info info) {
  ReadmigoTypesettingCreateOptions options {
    .font_scale = 1.0f,
    .line_height_multiplier = 1.35f,
    .default_locale = "zh-CN",
  };

  auto handle = readmigo_typesetting_create(&options);
  if (!handle) {
    napi_throw_error(env, nullptr, "Failed to create typesetting engine");
    return nullptr;
  }

  auto* holder = new TypesettingExternalHolder();
  holder->handle = handle;

  napi_value external;
  napi_create_external(
      env,
      holder,
      [](napi_env, void* data, void*) {
        auto* holder = static_cast<TypesettingExternalHolder*>(data);
        if (holder && holder->handle) {
          readmigo_typesetting_destroy(holder->handle);
          holder->handle = nullptr;
        }
        delete holder;
      },
      nullptr,
      &external);
  return external;
}

napi_value destroyTypesettingEngine(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

  if (argc < 1) {
    throwTypeError(env, "Expected external engine handle");
    return nullptr;
  }

  void* data = nullptr;
  if (napi_get_value_external(env, argv[0], &data) != napi_ok) {
    throwTypeError(env, "Invalid engine handle");
    return nullptr;
  }

  auto* holder = static_cast<TypesettingExternalHolder*>(data);
  if (holder && holder->handle) {
    readmigo_typesetting_destroy(holder->handle);
    holder->handle = nullptr;
  }

  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

napi_value layoutHtml(napi_env env, napi_callback_info info) {
  size_t argc = 6;
  napi_value argv[6];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

  if (argc < 5) {
    throwTypeError(env, "Expected handle, html, chapterId, width, height, [fontSize]");
    return nullptr;
  }

  void* data = nullptr;
  if (napi_get_value_external(env, argv[0], &data) != napi_ok) {
    throwTypeError(env, "Invalid engine handle");
    return nullptr;
  }

  auto* holder = static_cast<TypesettingExternalHolder*>(data);
  if (!holder || !holder->handle) {
    throwTypeError(env, "Typesetting engine has been destroyed");
    return nullptr;
  }

  std::string html;
  std::string chapterId;
  float width = 0;
  float height = 0;
  float fontSize = 18.0f;

  if (!getString(env, argv[1], &html) ||
      !getString(env, argv[2], &chapterId) ||
      !getFloat(env, argv[3], &width) ||
      !getFloat(env, argv[4], &height)) {
    throwTypeError(env, "Invalid layoutHtml arguments");
    return nullptr;
  }

  if (argc >= 6 && !getFloat(env, argv[5], &fontSize)) {
    throwTypeError(env, "Invalid fontSize");
    return nullptr;
  }

  ReadmigoTypesettingLayoutOptions options {
    .chapter_id = chapterId.c_str(),
    .page_width = width,
    .page_height = height,
    .font_size = fontSize,
    .locale = "zh-CN",
  };
  ReadmigoTypesettingLayoutSummary summary {};

  if (readmigo_typesetting_layout_html(holder->handle, html.c_str(), &options, &summary) != 0) {
    napi_throw_error(env, nullptr, "Failed to layout html");
    return nullptr;
  }

  napi_value result;
  napi_create_object(env, &result);

  napi_value pageCount;
  napi_create_uint32(env, summary.page_count, &pageCount);
  napi_set_named_property(env, result, "pageCount", pageCount);

  napi_value totalBlocks;
  napi_create_uint32(env, summary.total_blocks, &totalBlocks);
  napi_set_named_property(env, result, "totalBlocks", totalBlocks);

  napi_value warningCount;
  napi_create_uint32(env, summary.warning_count, &warningCount);
  napi_set_named_property(env, result, "warningCount", warningCount);

  return result;
}

// 共享：取 handle + 解析 chapter_id + page_index
struct CallContext {
  ReadmigoTypesettingHandle handle = nullptr;
  std::string chapterId;
};

bool extractContext(napi_env env, napi_value handleVal, napi_value chapterVal, CallContext* out) {
  void* data = nullptr;
  if (napi_get_value_external(env, handleVal, &data) != napi_ok) {
    throwTypeError(env, "Invalid engine handle");
    return false;
  }
  auto* holder = static_cast<TypesettingExternalHolder*>(data);
  if (!holder || !holder->handle) {
    throwTypeError(env, "Typesetting engine has been destroyed");
    return false;
  }
  out->handle = holder->handle;
  if (!getString(env, chapterVal, &out->chapterId)) {
    throwTypeError(env, "Invalid chapterId");
    return false;
  }
  return true;
}

napi_value jsonToString(napi_env env, char* json) {
  if (!json) {
    napi_value n;
    napi_get_null(env, &n);
    return n;
  }
  napi_value out;
  napi_create_string_utf8(env, json, NAPI_AUTO_LENGTH, &out);
  readmigo_typesetting_free_json(json);
  return out;
}

napi_value getPageJson(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 3) {
    throwTypeError(env, "Expected (handle, chapterId, pageIndex)");
    return nullptr;
  }
  CallContext ctx;
  if (!extractContext(env, argv[0], argv[1], &ctx)) return nullptr;
  uint32_t pageIndex = 0;
  if (napi_get_value_uint32(env, argv[2], &pageIndex) != napi_ok) {
    throwTypeError(env, "Invalid pageIndex");
    return nullptr;
  }
  return jsonToString(env, readmigo_typesetting_get_page_json(ctx.handle, ctx.chapterId.c_str(), pageIndex));
}

napi_value getChapterAnchorsJson(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 2) {
    throwTypeError(env, "Expected (handle, chapterId)");
    return nullptr;
  }
  CallContext ctx;
  if (!extractContext(env, argv[0], argv[1], &ctx)) return nullptr;
  return jsonToString(env, readmigo_typesetting_get_chapter_anchors_json(ctx.handle, ctx.chapterId.c_str()));
}

napi_value hitTestJson(napi_env env, napi_callback_info info) {
  size_t argc = 5;
  napi_value argv[5];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 5) {
    throwTypeError(env, "Expected (handle, chapterId, pageIndex, x, y)");
    return nullptr;
  }
  CallContext ctx;
  if (!extractContext(env, argv[0], argv[1], &ctx)) return nullptr;
  uint32_t pageIndex = 0;
  float x = 0, y = 0;
  if (napi_get_value_uint32(env, argv[2], &pageIndex) != napi_ok ||
      !getFloat(env, argv[3], &x) ||
      !getFloat(env, argv[4], &y)) {
    throwTypeError(env, "Invalid coords");
    return nullptr;
  }
  return jsonToString(env, readmigo_typesetting_hit_test_json(ctx.handle, ctx.chapterId.c_str(), pageIndex, x, y));
}

napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
      {"createTypesettingEngine", nullptr, createTypesettingEngine, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"destroyTypesettingEngine", nullptr, destroyTypesettingEngine, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"layoutHtml", nullptr, layoutHtml, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"getPageJson", nullptr, getPageJson, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"getChapterAnchorsJson", nullptr, getChapterAnchorsJson, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"hitTestJson", nullptr, hitTestJson, nullptr, nullptr, nullptr, napi_default, nullptr},
  };

  napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
