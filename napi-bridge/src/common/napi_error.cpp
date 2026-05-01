#include "napi_error.h"

#include <string>

namespace readmigo {
namespace napi_bridge {

const char* ErrorCodeToString(ErrorCode code) {
    switch (code) {
        case ErrorCode::kErrOk:             return "OK";
        case ErrorCode::kErrInvalidArg:     return "INVALID_ARG";
        case ErrorCode::kErrNotInitialized: return "NOT_INITIALIZED";
        case ErrorCode::kErrIO:             return "IO";
        case ErrorCode::kErrParse:          return "PARSE";
        case ErrorCode::kErrLayout:         return "LAYOUT";
        case ErrorCode::kErrRender:         return "RENDER";
        case ErrorCode::kErrOutOfRange:     return "OUT_OF_RANGE";
        case ErrorCode::kErrNotSupported:   return "NOT_SUPPORTED";
        case ErrorCode::kErrInternal:       return "INTERNAL";
    }
    return "UNKNOWN";
}

// HarmonyOS NAPI 不支持自定义 error subclass，统一用 napi_throw_error
// 把 code 当作字符串挂到 error.code 上，保持和 Node.js 习惯一致。
void ThrowJsError(napi_env env, ErrorCode code, const std::string& message) {
    const std::string codeStr = std::to_string(static_cast<int32_t>(code));
    napi_throw_error(env, codeStr.c_str(), message.c_str());
}

void ThrowJsTypeError(napi_env env, const std::string& message) {
    const std::string codeStr =
        std::to_string(static_cast<int32_t>(ErrorCode::kErrInvalidArg));
    napi_throw_type_error(env, codeStr.c_str(), message.c_str());
}

void ThrowJsRangeError(napi_env env, const std::string& message) {
    const std::string codeStr =
        std::to_string(static_cast<int32_t>(ErrorCode::kErrOutOfRange));
    napi_throw_range_error(env, codeStr.c_str(), message.c_str());
}

void ThrowFromException(napi_env env, const NapiException& ex) {
    ThrowJsError(env, ex.code(), ex.message());
}

napi_value MakeErrorObject(napi_env env,
                           ErrorCode code,
                           const std::string& message) {
    napi_value obj = nullptr;
    if (napi_create_object(env, &obj) != napi_ok) {
        return nullptr;
    }

    napi_value codeVal = nullptr;
    napi_create_int32(env, static_cast<int32_t>(code), &codeVal);
    napi_set_named_property(env, obj, "code", codeVal);

    napi_value codeNameVal = nullptr;
    napi_create_string_utf8(env, ErrorCodeToString(code), NAPI_AUTO_LENGTH,
                            &codeNameVal);
    napi_set_named_property(env, obj, "codeName", codeNameVal);

    napi_value msgVal = nullptr;
    napi_create_string_utf8(env, message.c_str(), NAPI_AUTO_LENGTH, &msgVal);
    napi_set_named_property(env, obj, "message", msgVal);

    return obj;
}

}  // namespace napi_bridge
}  // namespace readmigo
