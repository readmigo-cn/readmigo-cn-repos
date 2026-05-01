#pragma once
//
// napi_convert.h
// 双向类型转换工具：C++ 标准类型 ↔ napi_value。
// 设计原则：
//   1. 转换失败抛 NapiException（kErrInvalidArg），由 NAPI 入口的 try/catch
//      统一翻译成 JS TypeError，避免每个调用点都写一遍错误处理。
//   2. To<T>(env, value) 表示 JS → C++；From(env, cppValue) 表示 C++ → JS。
//   3. 对 std::optional / std::vector / std::pair 提供模板特化，让上层 NAPI
//      函数尽量贴近业务表达，不再手写 array 遍历。
//

#include <napi/native_api.h>

#include <cstddef>
#include <cstdint>
#include <initializer_list>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "napi_error.h"

namespace readmigo {
namespace napi_bridge {

// ---------------------------------------------------------------------------
// 基础读取（JS → C++）。失败时抛 NapiException(kErrInvalidArg)。
// ---------------------------------------------------------------------------
bool ToBool(napi_env env, napi_value value);
int32_t ToInt32(napi_env env, napi_value value);
uint32_t ToUint32(napi_env env, napi_value value);
int64_t ToInt64(napi_env env, napi_value value);
double ToDouble(napi_env env, napi_value value);
float ToFloat(napi_env env, napi_value value);
std::string ToString(napi_env env, napi_value value);

// 可空读取：JS undefined / null 时返回 std::nullopt。
std::optional<std::string> ToOptionalString(napi_env env, napi_value value);
std::optional<double> ToOptionalDouble(napi_env env, napi_value value);
std::optional<int32_t> ToOptionalInt32(napi_env env, napi_value value);

// ArrayBuffer 读取：返回数据指针 + 长度。指针生命周期由 JS GC 管理，
// 调用者必须在同步调用范围内使用，避免逃逸。
struct ArrayBufferView {
    const uint8_t* data = nullptr;
    size_t length = 0;
};
ArrayBufferView ToArrayBuffer(napi_env env, napi_value value);

// ---------------------------------------------------------------------------
// 基础写入（C++ → JS）。
// ---------------------------------------------------------------------------
napi_value FromBool(napi_env env, bool v);
napi_value FromInt32(napi_env env, int32_t v);
napi_value FromUint32(napi_env env, uint32_t v);
napi_value FromInt64(napi_env env, int64_t v);
napi_value FromDouble(napi_env env, double v);
napi_value FromFloat(napi_env env, float v);
napi_value FromString(napi_env env, const std::string& v);
napi_value FromCString(napi_env env, const char* v);
napi_value MakeUndefined(napi_env env);
napi_value MakeNull(napi_env env);

// 创建 ArrayBuffer 并拷贝入数据（C++ → JS）。常用于回传 RGBA 像素帧。
napi_value MakeArrayBufferCopy(napi_env env, const uint8_t* data, size_t length);

// 创建 Uint8Array 视图（共享底层 ArrayBuffer）
napi_value MakeUint8Array(napi_env env, const uint8_t* data, size_t length);

// ---------------------------------------------------------------------------
// 对象属性访问。Get* 在属性缺失或类型不对时抛 NapiException；
// TryGet* 返回 std::optional，表示属性可缺省。
// ---------------------------------------------------------------------------
napi_value GetProp(napi_env env, napi_value obj, const char* name);
bool HasProp(napi_env env, napi_value obj, const char* name);

std::string GetStringProp(napi_env env, napi_value obj, const char* name);
double GetNumberProp(napi_env env, napi_value obj, const char* name);
int32_t GetInt32Prop(napi_env env, napi_value obj, const char* name);
uint32_t GetUint32Prop(napi_env env, napi_value obj, const char* name);
bool GetBoolProp(napi_env env, napi_value obj, const char* name);
float GetFloatProp(napi_env env, napi_value obj, const char* name);

std::optional<std::string> TryGetStringProp(napi_env env, napi_value obj,
                                            const char* name);
std::optional<double> TryGetNumberProp(napi_env env, napi_value obj,
                                       const char* name);
std::optional<int32_t> TryGetInt32Prop(napi_env env, napi_value obj,
                                       const char* name);
std::optional<bool> TryGetBoolProp(napi_env env, napi_value obj,
                                   const char* name);
std::optional<float> TryGetFloatProp(napi_env env, napi_value obj,
                                     const char* name);

void SetProp(napi_env env, napi_value obj, const char* name, napi_value value);

// ---------------------------------------------------------------------------
// 对象工厂：用 initializer_list 一次性构造多个属性。
// ---------------------------------------------------------------------------
struct PropEntry {
    const char* name;
    napi_value value;
};
napi_value MakeObject(napi_env env, std::initializer_list<PropEntry> props);
napi_value MakeEmptyObject(napi_env env);

// ---------------------------------------------------------------------------
// 数组与元组转换
// ---------------------------------------------------------------------------
uint32_t GetArrayLength(napi_env env, napi_value arr);
napi_value GetElement(napi_env env, napi_value arr, uint32_t index);
napi_value MakeArray(napi_env env, size_t length);
void SetElement(napi_env env, napi_value arr, uint32_t index, napi_value value);

// std::vector<T> → JS array，T 必须有 From*(env, T) 重载或自定义转换器。
template <typename T, typename Converter>
napi_value FromVector(napi_env env, const std::vector<T>& vec,
                      Converter convert) {
    napi_value arr = MakeArray(env, vec.size());
    for (size_t i = 0; i < vec.size(); ++i) {
        SetElement(env, arr, static_cast<uint32_t>(i),
                   convert(env, vec[i]));
    }
    return arr;
}

// JS array → std::vector<T>
template <typename T, typename Converter>
std::vector<T> ToVector(napi_env env, napi_value arr, Converter convert) {
    const uint32_t len = GetArrayLength(env, arr);
    std::vector<T> result;
    result.reserve(len);
    for (uint32_t i = 0; i < len; ++i) {
        result.push_back(convert(env, GetElement(env, arr, i)));
    }
    return result;
}

// std::pair<A, B> → [A, B] tuple（JS 中以 2-元素数组表示）
template <typename A, typename B, typename ConvA, typename ConvB>
napi_value FromPair(napi_env env, const std::pair<A, B>& p,
                    ConvA convA, ConvB convB) {
    napi_value arr = MakeArray(env, 2);
    SetElement(env, arr, 0, convA(env, p.first));
    SetElement(env, arr, 1, convB(env, p.second));
    return arr;
}

// std::optional<T> → T | undefined
template <typename T, typename Converter>
napi_value FromOptional(napi_env env, const std::optional<T>& opt,
                        Converter convert) {
    if (!opt.has_value()) {
        return MakeUndefined(env);
    }
    return convert(env, opt.value());
}

// ---------------------------------------------------------------------------
// 函数参数提取：在 NAPI 入口处一次拿到 argc / argv / this，并校验 minArgs。
// ---------------------------------------------------------------------------
struct CallbackArgs {
    size_t argc = 0;
    napi_value argv[8] = {};   // 最多支持 8 个参数，业务上够用
    napi_value thisArg = nullptr;
    void* userData = nullptr;
};
CallbackArgs GetCallbackArgs(napi_env env, napi_callback_info info,
                             size_t minArgs, size_t maxArgs = 8);

// ---------------------------------------------------------------------------
// External 句柄包装：把 C++ 对象的裸指针包成 napi_external，并在 GC 时调用
// finalize 回调释放资源。模板封装让 typesetting / badge_engine 共用同一套
// 句柄管理逻辑，避免每次写 napi_create_external + 手写 finalizer 的样板。
// ---------------------------------------------------------------------------
template <typename T>
napi_value WrapExternal(napi_env env, T* ptr,
                        void (*finalize)(napi_env, void*, void*) = nullptr) {
    napi_value external = nullptr;
    napi_create_external(env, ptr, finalize, nullptr, &external);
    return external;
}

template <typename T>
T* UnwrapExternal(napi_env env, napi_value value) {
    void* data = nullptr;
    if (napi_get_value_external(env, value, &data) != napi_ok || !data) {
        throw NapiException(ErrorCode::kErrNotInitialized,
                            "engine handle is null or destroyed");
    }
    return static_cast<T*>(data);
}

}  // namespace napi_bridge
}  // namespace readmigo
