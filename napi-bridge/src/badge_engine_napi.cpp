//
// badge_engine_napi.cpp
// HarmonyOS NAPI 绑定：把 native/badge-engine 的 C API 暴露给 ArkTS。
//
// 设计要点：
//   1. badge-engine 是 extern "C" 的，opaque handle 只有 BadgeEngine*。
//      用 napi_external 持有 BadgeHandle wrapper（含 BadgeEngine* + 线程
//      安全的 JS callback 句柄），GC 时通过 finalize 回调销毁。
//   2. 异步加载（loadBadge / loadModelData）返回 Promise，用 napi_async_work
//      在 worker 线程跑解析，回到主线程 resolve / reject。
//   3. C 层回调通过 napi_threadsafe_function 路由回 JS 主线程，避免在 render
//      线程直接调用 napi_call_function（HarmonyOS 要求 JS 调用必须在创建它
//      的 env 所在线程上）。
//   4. setSurface 入参的 surfaceId 是 ArkTS 端 XComponent 的 surfaceId（字符串
//      或数字），native 侧需调用 OH_NativeWindow_GetNativeWindow 取得
//      OHNativeWindow* 再传给 badge_engine_set_surface。这里给出 extern
//      声明 + TODO，编译时通过 libnative_window 链接。
//

#include <napi/native_api.h>

#include <atomic>
#include <cstdint>
#include <cstring>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "common/napi_convert.h"
#include "common/napi_error.h"

#include "badge_engine/badge_engine.h"
#include "badge_engine/types.h"

namespace readmigo {
namespace napi_bridge {
namespace {

// ---------------------------------------------------------------------------
// HarmonyOS NativeWindow forward declarations。真正符号位于 libnative_window.so
// 中，链接时通过 CMake target_link_libraries(... native_window) 引入。
// 这里只声明所需 ABI，避免在 NAPI bridge 拉入完整 OpenHarmony 头依赖。
// TODO(W3-runtime): 替换为 #include <native_window/external_window.h> 一旦
// HarmonyOS Toolchain headers 在 CI 中就绪。
// ---------------------------------------------------------------------------
struct OHNativeWindow;  // opaque
extern "C" OHNativeWindow* OH_NativeWindow_GetNativeWindowFromSurfaceId(
    uint64_t surfaceId, OHNativeWindow** window);

// ---------------------------------------------------------------------------
// BadgeHandle: ArkTS 持有的 opaque 句柄包装。
// ---------------------------------------------------------------------------
struct BadgeHandle {
    BadgeEngine* engine = nullptr;

    // JS 事件回调：通过 thread-safe function 跨线程调用。
    // 对应 ArkTS 端 setEventCallback((evt) => {...}) 注册的函数。
    napi_threadsafe_function tsfn = nullptr;
    std::atomic<bool> destroyed{false};
};

// 线程安全的回调载荷（badge-engine 调用回调时通过 user_data 派发）
struct EventPayload {
    BadgeEventType type;
    int32_t data;
    std::string dataStr;
};

void BadgeFinalize(napi_env env, void* data, void* /*hint*/) {
    auto* h = static_cast<BadgeHandle*>(data);
    if (!h) return;
    h->destroyed.store(true);
    if (h->engine) {
        // 解绑 callback 防止 native 线程在销毁时仍尝试调用 JS。
        badge_engine_set_callback(h->engine, nullptr, nullptr);
        badge_engine_destroy(h->engine);
        h->engine = nullptr;
    }
    if (h->tsfn) {
        napi_release_threadsafe_function(h->tsfn, napi_tsfn_release);
        h->tsfn = nullptr;
    }
    delete h;
}

BadgeHandle* UnwrapBadge(napi_env env, napi_value value) {
    auto* h = UnwrapExternal<BadgeHandle>(env, value);
    NAPI_THROW_IF(env, h->destroyed.load() || !h->engine,
                  ErrorCode::kErrNotInitialized,
                  "badge engine destroyed");
    return h;
}

// ---------------------------------------------------------------------------
// 线程安全 callback：native render 线程 → JS 主线程
// ---------------------------------------------------------------------------
void NativeBadgeCallback(const BadgeEvent* event, void* user_data) {
    auto* h = static_cast<BadgeHandle*>(user_data);
    if (!h || h->destroyed.load() || !h->tsfn) return;

    // 拷贝出来再丢到 tsfn 队列：原始指针在 native 线程返回后即失效。
    auto* payload = new EventPayload{
        event->type,
        event->data,
        event->data_str ? std::string(event->data_str) : std::string(),
    };
    auto status = napi_call_threadsafe_function(h->tsfn, payload,
                                                napi_tsfn_nonblocking);
    if (status != napi_ok) {
        delete payload;  // 提交失败需要自己释放，避免内存泄漏
    }
}

// JS 主线程消费 EventPayload，调用 ArkTS 注册的回调函数
void TsfnCallJs(napi_env env, napi_value jsCallback,
                void* /*context*/, void* dataPtr) {
    std::unique_ptr<EventPayload> payload(static_cast<EventPayload*>(dataPtr));
    if (!env || !jsCallback || !payload) return;

    napi_value evt = MakeObject(env, {
        {"type", FromInt32(env, static_cast<int32_t>(payload->type))},
        {"data", FromInt32(env, payload->data)},
        {"dataStr", FromString(env, payload->dataStr)},
    });

    napi_value globalThis = nullptr;
    napi_get_global(env, &globalThis);
    napi_value argv[1] = {evt};
    napi_value result = nullptr;
    napi_call_function(env, globalThis, jsCallback, 1, argv, &result);
}

// ---------------------------------------------------------------------------
// 异步任务：用于 loadBadge / loadModelData。
// ---------------------------------------------------------------------------
struct LoadAsyncCtx {
    napi_async_work work = nullptr;
    napi_deferred deferred = nullptr;
    BadgeHandle* handle = nullptr;
    std::string path;
    std::vector<uint8_t> blob;
    bool isBlob = false;
    int result = 0;
};

void LoadExecute(napi_env /*env*/, void* data) {
    auto* ctx = static_cast<LoadAsyncCtx*>(data);
    if (!ctx->handle || ctx->handle->destroyed.load() ||
        !ctx->handle->engine) {
        ctx->result = -1;
        return;
    }
    if (ctx->isBlob) {
        ctx->result = badge_engine_load_model_data(
            ctx->handle->engine, ctx->blob.data(),
            static_cast<uint32_t>(ctx->blob.size()));
    } else {
        ctx->result = badge_engine_load_badge(ctx->handle->engine,
                                              ctx->path.c_str());
    }
}

void LoadComplete(napi_env env, napi_status /*status*/, void* data) {
    std::unique_ptr<LoadAsyncCtx> ctx(static_cast<LoadAsyncCtx*>(data));
    if (ctx->result == 0) {
        napi_value v = FromInt32(env, ctx->result);
        napi_resolve_deferred(env, ctx->deferred, v);
    } else {
        napi_value err = MakeErrorObject(env, ErrorCode::kErrIO,
                                         "badge load failed");
        napi_reject_deferred(env, ctx->deferred, err);
    }
    napi_delete_async_work(env, ctx->work);
}

// ---------------------------------------------------------------------------
// NAPI 入口
// ---------------------------------------------------------------------------

napi_value CreateEngine(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    napi_value cfg = args.argv[0];

    BadgeEngineConfig c{};
    c.width = GetUint32Prop(env, cfg, "width");
    c.height = GetUint32Prop(env, cfg, "height");
    c.render_mode = static_cast<BadgeRenderMode>(
        TryGetInt32Prop(env, cfg, "renderMode")
            .value_or(BADGE_RENDER_EMBEDDED));

    // presets_path：保留 string 引用直到 badge_engine_create 返回。
    std::string presetsPath =
        TryGetStringProp(env, cfg, "presetsPath").value_or("");
    c.presets_path = presetsPath.empty() ? nullptr : presetsPath.c_str();

    BadgeEngine* eng = badge_engine_create(&c);
    NAPI_THROW_IF(env, !eng, ErrorCode::kErrNotInitialized,
                  "badge_engine_create returned null");

    auto* h = new BadgeHandle();
    h->engine = eng;
    return WrapExternal<BadgeHandle>(env, h, BadgeFinalize);
    NAPI_TRY_END(env);
}

napi_value DestroyEngine(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    void* data = nullptr;
    napi_get_value_external(env, args.argv[0], &data);
    if (data) {
        // 立即销毁；finalizer 后续触发时会跳过（destroyed=true）。
        BadgeFinalize(env, data, nullptr);
    }
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// setSurface(handle, surfaceId, width, height)
//   surfaceId 来自 ArkTS XComponent.getXComponentSurfaceId()，是字符串化的 uint64。
napi_value SetSurface(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 4, 4);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const std::string surfaceIdStr = ToString(env, args.argv[1]);
    const uint32_t width = ToUint32(env, args.argv[2]);
    const uint32_t height = ToUint32(env, args.argv[3]);

    uint64_t surfaceId = 0;
    try {
        surfaceId = std::stoull(surfaceIdStr);
    } catch (...) {
        NAPI_THROW_GENERIC(env, ErrorCode::kErrInvalidArg,
                           "surfaceId must be numeric string");
    }

    OHNativeWindow* window = nullptr;
    // TODO(W3-runtime): 在 HarmonyOS toolchain 头就绪后改为
    // OH_NativeWindow_GetNativeWindowFromSurfaceId(surfaceId, &window);
    OH_NativeWindow_GetNativeWindowFromSurfaceId(surfaceId, &window);
    NAPI_THROW_IF(env, !window, ErrorCode::kErrRender,
                  "failed to resolve native window from surfaceId");

    int rc = badge_engine_set_surface(h->engine,
                                      static_cast<void*>(window),
                                      width, height);
    NAPI_THROW_IF(env, rc != 0, ErrorCode::kErrRender,
                  "badge_engine_set_surface failed");
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// loadBadge(handle, path) → Promise<int>
napi_value LoadBadge(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const std::string path = ToString(env, args.argv[1]);

    napi_deferred deferred = nullptr;
    napi_value promise = nullptr;
    napi_create_promise(env, &deferred, &promise);

    auto* ctx = new LoadAsyncCtx();
    ctx->handle = h;
    ctx->deferred = deferred;
    ctx->path = path;
    ctx->isBlob = false;

    napi_value resourceName = FromCString(env, "BadgeLoadBadge");
    napi_create_async_work(env, nullptr, resourceName, LoadExecute,
                           LoadComplete, ctx, &ctx->work);
    napi_queue_async_work(env, ctx->work);
    return promise;
    NAPI_TRY_END(env);
}

// loadModelData(handle, ArrayBuffer) → Promise<int>
napi_value LoadModelData(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    auto buf = ToArrayBuffer(env, args.argv[1]);

    napi_deferred deferred = nullptr;
    napi_value promise = nullptr;
    napi_create_promise(env, &deferred, &promise);

    auto* ctx = new LoadAsyncCtx();
    ctx->handle = h;
    ctx->deferred = deferred;
    ctx->isBlob = true;
    // 拷贝出 blob：JS ArrayBuffer 在异步线程不可访问。
    if (buf.data && buf.length > 0) {
        ctx->blob.assign(buf.data, buf.data + buf.length);
    }

    napi_value resourceName = FromCString(env, "BadgeLoadModelData");
    napi_create_async_work(env, nullptr, resourceName, LoadExecute,
                           LoadComplete, ctx, &ctx->work);
    napi_queue_async_work(env, ctx->work);
    return promise;
    NAPI_TRY_END(env);
}

napi_value UnloadBadge(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    auto* h = UnwrapBadge(env, args.argv[0]);
    badge_engine_unload_badge(h->engine);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value SetRenderMode(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const int32_t mode = ToInt32(env, args.argv[1]);
    badge_engine_set_render_mode(h->engine,
                                 static_cast<BadgeRenderMode>(mode));
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value UpdateGyro(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 4, 4);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const float x = ToFloat(env, args.argv[1]);
    const float y = ToFloat(env, args.argv[2]);
    const float z = ToFloat(env, args.argv[3]);
    badge_engine_update_gyro(h->engine, x, y, z);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// onTouch(handle, { type, x, y, pointerCount, x2?, y2? })
napi_value OnTouch(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    napi_value evt = args.argv[1];

    BadgeTouchEvent ev{};
    ev.type = static_cast<BadgeTouchType>(GetInt32Prop(env, evt, "type"));
    ev.x = GetFloatProp(env, evt, "x");
    ev.y = GetFloatProp(env, evt, "y");
    ev.pointer_count = TryGetInt32Prop(env, evt, "pointerCount").value_or(1);
    ev.x2 = TryGetFloatProp(env, evt, "x2").value_or(0.0f);
    ev.y2 = TryGetFloatProp(env, evt, "y2").value_or(0.0f);
    badge_engine_on_touch(h->engine, &ev);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value PlayCeremony(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const int32_t type = ToInt32(env, args.argv[1]);
    badge_engine_play_ceremony(h->engine,
                               static_cast<BadgeCeremonyType>(type));
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value SetOrientation(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 5, 5);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const float rx = ToFloat(env, args.argv[1]);
    const float ry = ToFloat(env, args.argv[2]);
    const float rz = ToFloat(env, args.argv[3]);
    const float scale = ToFloat(env, args.argv[4]);
    badge_engine_set_orientation(h->engine, rx, ry, rz, scale);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value RenderFrame(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 1, 1);
    auto* h = UnwrapBadge(env, args.argv[0]);
    badge_engine_render_frame(h->engine);
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// snapshot(handle, width, height) → ArrayBuffer (RGBA 4 bytes per pixel)
napi_value Snapshot(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const uint32_t w = ToUint32(env, args.argv[1]);
    const uint32_t hgt = ToUint32(env, args.argv[2]);

    const size_t bytes = static_cast<size_t>(w) * hgt * 4;
    NAPI_THROW_IF(env, bytes == 0, ErrorCode::kErrInvalidArg,
                  "snapshot dimensions must be positive");

    // 直接在 ArrayBuffer 后端 buffer 上写，避免 1 次 memcpy。
    void* dst = nullptr;
    napi_value buffer = nullptr;
    napi_create_arraybuffer(env, bytes, &dst, &buffer);
    int rc = badge_engine_snapshot(h->engine,
                                   static_cast<uint8_t*>(dst), w, hgt);
    NAPI_THROW_IF(env, rc != 0, ErrorCode::kErrRender,
                  "badge_engine_snapshot failed");
    return buffer;
    NAPI_TRY_END(env);
}

// setFaceTexture(handle, face, ArrayBuffer, w, h)
napi_value SetFaceTexture(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 5, 5);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const int32_t face = ToInt32(env, args.argv[1]);
    auto buf = ToArrayBuffer(env, args.argv[2]);
    const uint32_t w = ToUint32(env, args.argv[3]);
    const uint32_t hgt = ToUint32(env, args.argv[4]);
    NAPI_THROW_IF(env, !buf.data || buf.length < static_cast<size_t>(w) * hgt * 4,
                  ErrorCode::kErrInvalidArg,
                  "rgba buffer too small for w*h*4");
    int rc = badge_engine_set_face_texture(
        h->engine, static_cast<BadgeFaceIndex>(face), buf.data, w, hgt);
    NAPI_THROW_IF(env, rc != 0, ErrorCode::kErrIO,
                  "badge_engine_set_face_texture failed");
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

napi_value SetFaceMaterial(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 3, 3);
    auto* h = UnwrapBadge(env, args.argv[0]);
    const int32_t face = ToInt32(env, args.argv[1]);
    const std::string materialJson = ToString(env, args.argv[2]);
    int rc = badge_engine_set_face_material(
        h->engine, static_cast<BadgeFaceIndex>(face), materialJson.c_str());
    NAPI_THROW_IF(env, rc != 0, ErrorCode::kErrParse,
                  "badge_engine_set_face_material failed");
    return MakeUndefined(env);
    NAPI_TRY_END(env);
}

// setEventCallback(handle, jsCallback)
//   注册 JS 回调，badge-engine 内部触发 BadgeEvent 时通过 tsfn 路由回 JS 主线程。
napi_value SetEventCallback(napi_env env, napi_callback_info info) {
    NAPI_TRY_BEGIN(env);
    auto args = GetCallbackArgs(env, info, 2, 2);
    auto* h = UnwrapBadge(env, args.argv[0]);
    napi_value jsCb = args.argv[1];

    napi_valuetype t = napi_undefined;
    napi_typeof(env, jsCb, &t);
    NAPI_THROW_IF(env, t != napi_function, ErrorCode::kErrInvalidArg,
                  "callback must be a function");

    // 释放旧的 tsfn（如果有），重新绑定新的
    if (h->tsfn) {
        napi_release_threadsafe_function(h->tsfn, napi_tsfn_release);
        h->tsfn = nullptr;
    }

    napi_value resourceName = FromCString(env, "BadgeEventCallback");
    napi_create_threadsafe_function(env, jsCb, nullptr, resourceName,
                                    /*max_queue_size*/ 0,
                                    /*initial_thread_count*/ 1,
                                    nullptr, nullptr, h, TsfnCallJs,
                                    &h->tsfn);
    badge_engine_set_callback(h->engine, NativeBadgeCallback, h);
    return MakeUndefined(env);
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
        {"setSurface", nullptr, SetSurface, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"loadBadge", nullptr, LoadBadge, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"loadModelData", nullptr, LoadModelData, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"unloadBadge", nullptr, UnloadBadge, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setRenderMode", nullptr, SetRenderMode, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"updateGyro", nullptr, UpdateGyro, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"onTouch", nullptr, OnTouch, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"playCeremony", nullptr, PlayCeremony, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setOrientation", nullptr, SetOrientation, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"renderFrame", nullptr, RenderFrame, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"snapshot", nullptr, Snapshot, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setFaceTexture", nullptr, SetFaceTexture, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setFaceMaterial", nullptr, SetFaceMaterial, nullptr, nullptr, nullptr,
         napi_default, nullptr},
        {"setEventCallback", nullptr, SetEventCallback, nullptr, nullptr,
         nullptr, napi_default, nullptr},
    };
    napi_define_properties(env, exports,
                           sizeof(props) / sizeof(props[0]), props);

    // 暴露常量枚举（render mode / touch type / ceremony / face / event）
    napi_value constants = MakeObject(env, {
        {"RENDER_EMBEDDED", FromInt32(env, BADGE_RENDER_EMBEDDED)},
        {"RENDER_FULLSCREEN", FromInt32(env, BADGE_RENDER_FULLSCREEN)},
        {"TOUCH_DOWN", FromInt32(env, BADGE_TOUCH_DOWN)},
        {"TOUCH_MOVE", FromInt32(env, BADGE_TOUCH_MOVE)},
        {"TOUCH_UP", FromInt32(env, BADGE_TOUCH_UP)},
        {"TOUCH_CANCEL", FromInt32(env, BADGE_TOUCH_CANCEL)},
        {"CEREMONY_UNLOCK", FromInt32(env, BADGE_CEREMONY_UNLOCK)},
        {"FACE_FRONT", FromInt32(env, BADGE_FACE_FRONT)},
        {"FACE_ICON", FromInt32(env, BADGE_FACE_ICON)},
        {"FACE_BACK", FromInt32(env, BADGE_FACE_BACK)},
        {"EVENT_CEREMONY_PHASE", FromInt32(env, BADGE_EVENT_CEREMONY_PHASE)},
        {"EVENT_CEREMONY_DONE", FromInt32(env, BADGE_EVENT_CEREMONY_DONE)},
        {"EVENT_FLIP_TO_BACK", FromInt32(env, BADGE_EVENT_FLIP_TO_BACK)},
        {"EVENT_FLIP_TO_FRONT", FromInt32(env, BADGE_EVENT_FLIP_TO_FRONT)},
        {"EVENT_HAPTIC", FromInt32(env, BADGE_EVENT_HAPTIC)},
        {"EVENT_SOUND", FromInt32(env, BADGE_EVENT_SOUND)},
        {"EVENT_READY", FromInt32(env, BADGE_EVENT_READY)},
    });
    napi_set_named_property(env, exports, "constants", constants);
    return exports;
}

}  // namespace
}  // namespace napi_bridge
}  // namespace readmigo

extern "C" {

// HarmonyOS 模块名 badge_engine：ArkTS 端 import badge from 'libbadge_engine.so'。
static napi_module g_badgeModule = {
    /* nm_version */ 1,
    /* nm_flags */ 0,
    /* nm_filename */ nullptr,
    /* nm_register_func */ readmigo::napi_bridge::Init,
    /* nm_modname */ "badge_engine",
    /* nm_priv */ nullptr,
    {0},
};

__attribute__((constructor)) void RegisterBadgeEngineModule(void) {
    napi_module_register(&g_badgeModule);
}

}  // extern "C"
