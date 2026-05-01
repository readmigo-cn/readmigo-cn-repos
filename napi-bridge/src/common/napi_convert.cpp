#include "napi_convert.h"

#include <cstring>
#include <vector>

namespace readmigo {
namespace napi_bridge {

namespace {

// 内部辅助：根据 napi_status 抛 NapiException
[[noreturn]] void Fail(ErrorCode code, const char* msg) {
    throw NapiException(code, msg);
}

napi_valuetype TypeOf(napi_env env, napi_value value) {
    napi_valuetype t = napi_undefined;
    napi_typeof(env, value, &t);
    return t;
}

bool IsNullish(napi_env env, napi_value value) {
    const auto t = TypeOf(env, value);
    return t == napi_undefined || t == napi_null;
}

}  // namespace

// ---------------------------------------------------------------------------
// JS → C++
// ---------------------------------------------------------------------------

bool ToBool(napi_env env, napi_value value) {
    bool result = false;
    if (napi_get_value_bool(env, value, &result) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected boolean");
    }
    return result;
}

int32_t ToInt32(napi_env env, napi_value value) {
    int32_t result = 0;
    if (napi_get_value_int32(env, value, &result) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected int32");
    }
    return result;
}

uint32_t ToUint32(napi_env env, napi_value value) {
    uint32_t result = 0;
    if (napi_get_value_uint32(env, value, &result) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected uint32");
    }
    return result;
}

int64_t ToInt64(napi_env env, napi_value value) {
    int64_t result = 0;
    if (napi_get_value_int64(env, value, &result) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected int64");
    }
    return result;
}

double ToDouble(napi_env env, napi_value value) {
    double result = 0;
    if (napi_get_value_double(env, value, &result) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected number");
    }
    return result;
}

float ToFloat(napi_env env, napi_value value) {
    return static_cast<float>(ToDouble(env, value));
}

std::string ToString(napi_env env, napi_value value) {
    size_t length = 0;
    if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) !=
        napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected string");
    }
    std::vector<char> buffer(length + 1, '\0');
    size_t copied = 0;
    if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(),
                                   &copied) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "failed to read string");
    }
    return std::string(buffer.data(), copied);
}

std::optional<std::string> ToOptionalString(napi_env env, napi_value value) {
    if (IsNullish(env, value)) return std::nullopt;
    return ToString(env, value);
}

std::optional<double> ToOptionalDouble(napi_env env, napi_value value) {
    if (IsNullish(env, value)) return std::nullopt;
    return ToDouble(env, value);
}

std::optional<int32_t> ToOptionalInt32(napi_env env, napi_value value) {
    if (IsNullish(env, value)) return std::nullopt;
    return ToInt32(env, value);
}

ArrayBufferView ToArrayBuffer(napi_env env, napi_value value) {
    bool isArrayBuffer = false;
    napi_is_arraybuffer(env, value, &isArrayBuffer);

    ArrayBufferView view;
    if (isArrayBuffer) {
        void* raw = nullptr;
        size_t length = 0;
        if (napi_get_arraybuffer_info(env, value, &raw, &length) != napi_ok) {
            Fail(ErrorCode::kErrInvalidArg, "failed to read ArrayBuffer");
        }
        view.data = static_cast<const uint8_t*>(raw);
        view.length = length;
        return view;
    }

    // 兼容 typed array（Uint8Array 等）：解构出底层 ArrayBuffer + offset。
    bool isTyped = false;
    napi_is_typedarray(env, value, &isTyped);
    if (!isTyped) {
        Fail(ErrorCode::kErrInvalidArg, "expected ArrayBuffer or TypedArray");
    }
    napi_typedarray_type type;
    size_t length = 0;
    napi_value buffer = nullptr;
    size_t byteOffset = 0;
    void* base = nullptr;
    if (napi_get_typedarray_info(env, value, &type, &length, &base, &buffer,
                                 &byteOffset) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "failed to read TypedArray");
    }
    view.data = static_cast<const uint8_t*>(base);
    // typed array 的 length 是元素数；这里只用于二进制载荷，按字节算。
    size_t elementSize = 1;
    switch (type) {
        case napi_int8_array:
        case napi_uint8_array:
        case napi_uint8_clamped_array:
            elementSize = 1; break;
        case napi_int16_array:
        case napi_uint16_array:
            elementSize = 2; break;
        case napi_int32_array:
        case napi_uint32_array:
        case napi_float32_array:
            elementSize = 4; break;
        case napi_float64_array:
        case napi_bigint64_array:
        case napi_biguint64_array:
            elementSize = 8; break;
    }
    view.length = length * elementSize;
    return view;
}

// ---------------------------------------------------------------------------
// C++ → JS
// ---------------------------------------------------------------------------

napi_value FromBool(napi_env env, bool v) {
    napi_value out = nullptr;
    napi_get_boolean(env, v, &out);
    return out;
}

napi_value FromInt32(napi_env env, int32_t v) {
    napi_value out = nullptr;
    napi_create_int32(env, v, &out);
    return out;
}

napi_value FromUint32(napi_env env, uint32_t v) {
    napi_value out = nullptr;
    napi_create_uint32(env, v, &out);
    return out;
}

napi_value FromInt64(napi_env env, int64_t v) {
    napi_value out = nullptr;
    napi_create_int64(env, v, &out);
    return out;
}

napi_value FromDouble(napi_env env, double v) {
    napi_value out = nullptr;
    napi_create_double(env, v, &out);
    return out;
}

napi_value FromFloat(napi_env env, float v) {
    return FromDouble(env, static_cast<double>(v));
}

napi_value FromString(napi_env env, const std::string& v) {
    napi_value out = nullptr;
    napi_create_string_utf8(env, v.c_str(), v.size(), &out);
    return out;
}

napi_value FromCString(napi_env env, const char* v) {
    napi_value out = nullptr;
    if (!v) {
        napi_get_null(env, &out);
        return out;
    }
    napi_create_string_utf8(env, v, NAPI_AUTO_LENGTH, &out);
    return out;
}

napi_value MakeUndefined(napi_env env) {
    napi_value out = nullptr;
    napi_get_undefined(env, &out);
    return out;
}

napi_value MakeNull(napi_env env) {
    napi_value out = nullptr;
    napi_get_null(env, &out);
    return out;
}

napi_value MakeArrayBufferCopy(napi_env env, const uint8_t* data,
                               size_t length) {
    void* dst = nullptr;
    napi_value buffer = nullptr;
    if (napi_create_arraybuffer(env, length, &dst, &buffer) != napi_ok) {
        Fail(ErrorCode::kErrInternal, "napi_create_arraybuffer failed");
    }
    if (data && length > 0 && dst) {
        std::memcpy(dst, data, length);
    }
    return buffer;
}

napi_value MakeUint8Array(napi_env env, const uint8_t* data, size_t length) {
    napi_value buffer = MakeArrayBufferCopy(env, data, length);
    napi_value typedArr = nullptr;
    if (napi_create_typedarray(env, napi_uint8_array, length, buffer, 0,
                               &typedArr) != napi_ok) {
        Fail(ErrorCode::kErrInternal, "napi_create_typedarray failed");
    }
    return typedArr;
}

// ---------------------------------------------------------------------------
// 对象属性
// ---------------------------------------------------------------------------

napi_value GetProp(napi_env env, napi_value obj, const char* name) {
    napi_value value = nullptr;
    if (napi_get_named_property(env, obj, name, &value) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, name);
    }
    return value;
}

bool HasProp(napi_env env, napi_value obj, const char* name) {
    bool has = false;
    napi_has_named_property(env, obj, name, &has);
    return has;
}

std::string GetStringProp(napi_env env, napi_value obj, const char* name) {
    return ToString(env, GetProp(env, obj, name));
}

double GetNumberProp(napi_env env, napi_value obj, const char* name) {
    return ToDouble(env, GetProp(env, obj, name));
}

int32_t GetInt32Prop(napi_env env, napi_value obj, const char* name) {
    return ToInt32(env, GetProp(env, obj, name));
}

uint32_t GetUint32Prop(napi_env env, napi_value obj, const char* name) {
    return ToUint32(env, GetProp(env, obj, name));
}

bool GetBoolProp(napi_env env, napi_value obj, const char* name) {
    return ToBool(env, GetProp(env, obj, name));
}

float GetFloatProp(napi_env env, napi_value obj, const char* name) {
    return ToFloat(env, GetProp(env, obj, name));
}

std::optional<std::string> TryGetStringProp(napi_env env, napi_value obj,
                                            const char* name) {
    if (!HasProp(env, obj, name)) return std::nullopt;
    napi_value v = GetProp(env, obj, name);
    if (IsNullish(env, v)) return std::nullopt;
    return ToString(env, v);
}

std::optional<double> TryGetNumberProp(napi_env env, napi_value obj,
                                       const char* name) {
    if (!HasProp(env, obj, name)) return std::nullopt;
    napi_value v = GetProp(env, obj, name);
    if (IsNullish(env, v)) return std::nullopt;
    return ToDouble(env, v);
}

std::optional<int32_t> TryGetInt32Prop(napi_env env, napi_value obj,
                                       const char* name) {
    if (!HasProp(env, obj, name)) return std::nullopt;
    napi_value v = GetProp(env, obj, name);
    if (IsNullish(env, v)) return std::nullopt;
    return ToInt32(env, v);
}

std::optional<bool> TryGetBoolProp(napi_env env, napi_value obj,
                                   const char* name) {
    if (!HasProp(env, obj, name)) return std::nullopt;
    napi_value v = GetProp(env, obj, name);
    if (IsNullish(env, v)) return std::nullopt;
    return ToBool(env, v);
}

std::optional<float> TryGetFloatProp(napi_env env, napi_value obj,
                                     const char* name) {
    auto d = TryGetNumberProp(env, obj, name);
    if (!d.has_value()) return std::nullopt;
    return static_cast<float>(d.value());
}

void SetProp(napi_env env, napi_value obj, const char* name, napi_value value) {
    napi_set_named_property(env, obj, name, value);
}

napi_value MakeEmptyObject(napi_env env) {
    napi_value obj = nullptr;
    napi_create_object(env, &obj);
    return obj;
}

napi_value MakeObject(napi_env env, std::initializer_list<PropEntry> props) {
    napi_value obj = MakeEmptyObject(env);
    for (const auto& p : props) {
        napi_set_named_property(env, obj, p.name, p.value);
    }
    return obj;
}

// ---------------------------------------------------------------------------
// 数组
// ---------------------------------------------------------------------------

uint32_t GetArrayLength(napi_env env, napi_value arr) {
    uint32_t len = 0;
    if (napi_get_array_length(env, arr, &len) != napi_ok) {
        Fail(ErrorCode::kErrInvalidArg, "expected array");
    }
    return len;
}

napi_value GetElement(napi_env env, napi_value arr, uint32_t index) {
    napi_value value = nullptr;
    if (napi_get_element(env, arr, index, &value) != napi_ok) {
        Fail(ErrorCode::kErrOutOfRange, "array index out of range");
    }
    return value;
}

napi_value MakeArray(napi_env env, size_t length) {
    napi_value arr = nullptr;
    napi_create_array_with_length(env, length, &arr);
    return arr;
}

void SetElement(napi_env env, napi_value arr, uint32_t index,
                napi_value value) {
    napi_set_element(env, arr, index, value);
}

// ---------------------------------------------------------------------------
// 回调参数提取
// ---------------------------------------------------------------------------

CallbackArgs GetCallbackArgs(napi_env env, napi_callback_info info,
                             size_t minArgs, size_t maxArgs) {
    if (maxArgs > 8) maxArgs = 8;

    CallbackArgs args;
    args.argc = maxArgs;
    if (napi_get_cb_info(env, info, &args.argc, args.argv, &args.thisArg,
                         &args.userData) != napi_ok) {
        Fail(ErrorCode::kErrInternal, "napi_get_cb_info failed");
    }
    if (args.argc < minArgs) {
        Fail(ErrorCode::kErrInvalidArg, "missing required arguments");
    }
    return args;
}

}  // namespace napi_bridge
}  // namespace readmigo
