#pragma once
//
// napi_error.h
// 统一的 NAPI 错误处理工具：在 C++ 端抛 NapiException，在 JS 边界
// 转成 JS Error 对象。所有 typesetting / badge_engine NAPI 函数都应当用
// NAPI_THROW_* 宏触发 JS 异常，避免直接 napi_throw_error 让消息不一致。
//

#include <napi/native_api.h>

#include <exception>
#include <string>

namespace readmigo {
namespace napi_bridge {

// ---------------------------------------------------------------------------
// 错误码：所有跨 ArkTS 边界的错误码必须在此枚举中定义，方便上层做 i18n。
// ---------------------------------------------------------------------------
enum class ErrorCode : int32_t {
    kErrOk             = 0,
    kErrInvalidArg     = 1001,    // 参数类型不对 / 缺失
    kErrNotInitialized = 1002,    // 引擎/句柄已被销毁或未创建
    kErrIO             = 1003,    // 文件读写失败
    kErrParse          = 1004,    // HTML / CSS / GLB 解析失败
    kErrLayout         = 1005,    // 排版失败（chapter 不存在等）
    kErrRender         = 1006,    // 渲染失败 / surface 未绑定
    kErrOutOfRange     = 1007,    // 索引越界（pageIndex / blockIndex）
    kErrNotSupported   = 1008,    // 当前平台 / 配置不支持
    kErrInternal       = 1099,    // 兜底错误
};

const char* ErrorCodeToString(ErrorCode code);

// ---------------------------------------------------------------------------
// NapiException：C++ 内部传递错误，最终在 NAPI 入口处转成 JS 异常。
// 设计上不直接继承 std::exception 的 C 字符串生命周期，而是持有 std::string，
// 避免 NAPI 跨线程拷贝时悬垂指针。
// ---------------------------------------------------------------------------
class NapiException : public std::exception {
public:
    NapiException(ErrorCode code, std::string message)
        : code_(code), message_(std::move(message)) {}

    ErrorCode code() const noexcept { return code_; }
    const std::string& message() const noexcept { return message_; }
    const char* what() const noexcept override { return message_.c_str(); }

private:
    ErrorCode code_;
    std::string message_;
};

// ---------------------------------------------------------------------------
// 抛 JS 异常的辅助函数。注意：napi_throw_* 设置 pending exception 后必须
// 立刻 return nullptr，调用者不要再继续操作 env，否则会触发 undefined behavior。
// ---------------------------------------------------------------------------
void ThrowJsError(napi_env env, ErrorCode code, const std::string& message);
void ThrowJsTypeError(napi_env env, const std::string& message);
void ThrowJsRangeError(napi_env env, const std::string& message);

// 将 C++ NapiException 转换成 JS 异常并抛出
void ThrowFromException(napi_env env, const NapiException& ex);

// 构造结构化错误对象 { code, codeName, message } 用于 Promise.reject 路径
napi_value MakeErrorObject(napi_env env, ErrorCode code, const std::string& message);

// ---------------------------------------------------------------------------
// 便捷宏。所有宏在抛异常之后会 return nullptr，避免遗漏 early return。
// ---------------------------------------------------------------------------
#define NAPI_THROW_TYPE(env, msg)                                              \
    do {                                                                       \
        ::readmigo::napi_bridge::ThrowJsTypeError((env), (msg));               \
        return nullptr;                                                        \
    } while (0)

#define NAPI_THROW_RANGE(env, msg)                                             \
    do {                                                                       \
        ::readmigo::napi_bridge::ThrowJsRangeError((env), (msg));              \
        return nullptr;                                                        \
    } while (0)

#define NAPI_THROW_GENERIC(env, code, msg)                                     \
    do {                                                                       \
        ::readmigo::napi_bridge::ThrowJsError((env), (code), (msg));           \
        return nullptr;                                                        \
    } while (0)

#define NAPI_THROW_IF(env, condition, code, msg)                               \
    do {                                                                       \
        if ((condition)) {                                                     \
            ::readmigo::napi_bridge::ThrowJsError((env), (code), (msg));       \
            return nullptr;                                                    \
        }                                                                      \
    } while (0)

// 用 try/catch 包住函数体，把 NapiException / std::exception 转成 JS 异常。
// 用法：
//     napi_value Foo(napi_env env, napi_callback_info info) {
//         NAPI_TRY_BEGIN(env);
//         ...
//         NAPI_TRY_END(env);
//     }
#define NAPI_TRY_BEGIN(env) try {
#define NAPI_TRY_END(env)                                                      \
    }                                                                          \
    catch (const ::readmigo::napi_bridge::NapiException& __ex) {               \
        ::readmigo::napi_bridge::ThrowFromException((env), __ex);              \
        return nullptr;                                                        \
    }                                                                          \
    catch (const std::exception& __std_ex) {                                   \
        ::readmigo::napi_bridge::ThrowJsError(                                 \
            (env),                                                             \
            ::readmigo::napi_bridge::ErrorCode::kErrInternal,                  \
            __std_ex.what());                                                  \
        return nullptr;                                                        \
    }                                                                          \
    catch (...) {                                                              \
        ::readmigo::napi_bridge::ThrowJsError(                                 \
            (env),                                                             \
            ::readmigo::napi_bridge::ErrorCode::kErrInternal,                  \
            "unknown C++ exception");                                          \
        return nullptr;                                                        \
    }

}  // namespace napi_bridge
}  // namespace readmigo
