#pragma once
//
// napi/native_api.h — IDE stub for host development
//
// 这个文件**只供 IDE / clangd 解析使用**，不参与实际编译。
// 真实编译时，HarmonyOS NDK 工具链会提供自己的 `napi/native_api.h`，
// CMake/build-native.sh 通过 `-isystem ${HARMONYOS_SDK}/native/sysroot/...`
// 优先匹配真实头文件。
//
// 这个 stub 只声明 `napi-bridge/src/` 用到的最小子集，让宿主 IDE（macOS clang）
// 不报红、不级联出 std::string undefined 等假错。
//
// 修改原则：
//   - 仅添加 napi-bridge 实际用到的 type/function 声明
//   - 不写实现（IDE 不需要 link）
//   - 与 HarmonyOS 官方头文件签名保持一致
//

#include <cstddef>
#include <cstdint>

#ifdef __cplusplus
extern "C" {
#endif

// ---------------------------------------------------------------------------
// 不透明句柄（HarmonyOS NDK 头中也是 forward-declared struct pointer）
// ---------------------------------------------------------------------------
struct napi_env__;
struct napi_value__;
struct napi_ref__;
struct napi_handle_scope__;
struct napi_escapable_handle_scope__;
struct napi_callback_info__;
struct napi_deferred__;
struct napi_async_work__;
struct napi_threadsafe_function__;

typedef struct napi_env__* napi_env;
typedef struct napi_value__* napi_value;
typedef struct napi_ref__* napi_ref;
typedef struct napi_handle_scope__* napi_handle_scope;
typedef struct napi_escapable_handle_scope__* napi_escapable_handle_scope;
typedef struct napi_callback_info__* napi_callback_info;
typedef struct napi_deferred__* napi_deferred;
typedef struct napi_async_work__* napi_async_work;
typedef struct napi_threadsafe_function__* napi_threadsafe_function;

// ---------------------------------------------------------------------------
// 状态码
// ---------------------------------------------------------------------------
typedef enum {
    napi_ok,
    napi_invalid_arg,
    napi_object_expected,
    napi_string_expected,
    napi_name_expected,
    napi_function_expected,
    napi_number_expected,
    napi_boolean_expected,
    napi_array_expected,
    napi_generic_failure,
    napi_pending_exception,
    napi_cancelled,
    napi_escape_called_twice,
    napi_handle_scope_mismatch,
    napi_callback_scope_mismatch,
    napi_queue_full,
    napi_closing,
    napi_bigint_expected,
    napi_date_expected,
    napi_arraybuffer_expected,
    napi_detachable_arraybuffer_expected,
    napi_would_deadlock
} napi_status;

// ---------------------------------------------------------------------------
// 类型枚举
// ---------------------------------------------------------------------------
typedef enum {
    napi_undefined,
    napi_null,
    napi_boolean,
    napi_number,
    napi_string,
    napi_symbol,
    napi_object,
    napi_function,
    napi_external,
    napi_bigint
} napi_valuetype;

typedef enum {
    napi_int8_array,
    napi_uint8_array,
    napi_uint8_clamped_array,
    napi_int16_array,
    napi_uint16_array,
    napi_int32_array,
    napi_uint32_array,
    napi_float32_array,
    napi_float64_array,
    napi_bigint64_array,
    napi_biguint64_array
} napi_typedarray_type;

typedef enum {
    napi_default            = 0,
    napi_writable           = 1 << 0,
    napi_enumerable         = 1 << 1,
    napi_configurable       = 1 << 2,
    napi_static             = 1 << 10,
    napi_default_method     = napi_writable | napi_configurable,
    napi_default_jsproperty = napi_writable | napi_enumerable | napi_configurable
} napi_property_attributes;

typedef enum {
    napi_tsfn_release,
    napi_tsfn_abort
} napi_threadsafe_function_release_mode;

typedef enum {
    napi_tsfn_nonblocking,
    napi_tsfn_blocking
} napi_threadsafe_function_call_mode;

// ---------------------------------------------------------------------------
// 回调签名
// ---------------------------------------------------------------------------
typedef napi_value (*napi_callback)(napi_env env, napi_callback_info info);
typedef void (*napi_finalize)(napi_env env, void* finalize_data, void* finalize_hint);
typedef void (*napi_async_execute_callback)(napi_env env, void* data);
typedef void (*napi_async_complete_callback)(napi_env env, napi_status status, void* data);
typedef void (*napi_threadsafe_function_call_js)(napi_env env,
                                                 napi_value js_callback,
                                                 void* context,
                                                 void* data);

// ---------------------------------------------------------------------------
// PropertyDescriptor
// ---------------------------------------------------------------------------
typedef struct {
    const char* utf8name;
    napi_value name;
    napi_callback method;
    napi_callback getter;
    napi_callback setter;
    napi_value value;
    napi_property_attributes attributes;
    void* data;
} napi_property_descriptor;

typedef struct {
    void* nm_priv;
    int nm_version;
    unsigned int nm_flags;
    const char* nm_filename;
    napi_value (*nm_register_func)(napi_env env, napi_value exports);
    const char* nm_modname;
    void* reserved[4];
} napi_module;

typedef struct {
    const char* error_message;
    void* engine_reserved;
    uint32_t engine_error_code;
    napi_status error_code;
} napi_extended_error_info;

// ---------------------------------------------------------------------------
// 核心 API（仅声明 napi-bridge 实际用到的子集）
// ---------------------------------------------------------------------------
// 错误处理
napi_status napi_throw_error(napi_env env, const char* code, const char* msg);
napi_status napi_throw_type_error(napi_env env, const char* code, const char* msg);
napi_status napi_throw_range_error(napi_env env, const char* code, const char* msg);
napi_status napi_throw(napi_env env, napi_value error);
napi_status napi_create_error(napi_env env, napi_value code, napi_value msg, napi_value* result);
napi_status napi_get_last_error_info(napi_env env, const napi_extended_error_info** result);
napi_status napi_is_exception_pending(napi_env env, bool* result);
napi_status napi_fatal_exception(napi_env env, napi_value err);

// 值创建
napi_status napi_create_int32(napi_env env, int32_t value, napi_value* result);
napi_status napi_create_uint32(napi_env env, uint32_t value, napi_value* result);
napi_status napi_create_int64(napi_env env, int64_t value, napi_value* result);
napi_status napi_create_double(napi_env env, double value, napi_value* result);
napi_status napi_create_bigint_int64(napi_env env, int64_t value, napi_value* result);
napi_status napi_create_bigint_uint64(napi_env env, uint64_t value, napi_value* result);
napi_status napi_get_boolean(napi_env env, bool value, napi_value* result);
napi_status napi_create_string_utf8(napi_env env, const char* str, size_t length, napi_value* result);
napi_status napi_create_array(napi_env env, napi_value* result);
napi_status napi_create_array_with_length(napi_env env, size_t length, napi_value* result);
napi_status napi_create_object(napi_env env, napi_value* result);
napi_status napi_create_arraybuffer(napi_env env, size_t byte_length, void** data, napi_value* result);
napi_status napi_get_undefined(napi_env env, napi_value* result);
napi_status napi_get_null(napi_env env, napi_value* result);
napi_status napi_get_global(napi_env env, napi_value* result);

// 值读取
napi_status napi_get_value_int32(napi_env env, napi_value value, int32_t* result);
napi_status napi_get_value_uint32(napi_env env, napi_value value, uint32_t* result);
napi_status napi_get_value_int64(napi_env env, napi_value value, int64_t* result);
napi_status napi_get_value_double(napi_env env, napi_value value, double* result);
napi_status napi_get_value_bigint_int64(napi_env env, napi_value value, int64_t* result, bool* lossless);
napi_status napi_get_value_bool(napi_env env, napi_value value, bool* result);
napi_status napi_get_value_string_utf8(napi_env env, napi_value value, char* buf, size_t bufsize, size_t* result);
napi_status napi_get_arraybuffer_info(napi_env env, napi_value arraybuffer, void** data, size_t* byte_length);

// 类型查询
napi_status napi_typeof(napi_env env, napi_value value, napi_valuetype* result);
napi_status napi_is_array(napi_env env, napi_value value, bool* result);
napi_status napi_is_arraybuffer(napi_env env, napi_value value, bool* result);
napi_status napi_get_array_length(napi_env env, napi_value value, uint32_t* result);

// 对象 / 属性
napi_status napi_set_property(napi_env env, napi_value object, napi_value key, napi_value value);
napi_status napi_get_property(napi_env env, napi_value object, napi_value key, napi_value* result);
napi_status napi_has_property(napi_env env, napi_value object, napi_value key, bool* result);
napi_status napi_set_named_property(napi_env env, napi_value object, const char* utf8name, napi_value value);
napi_status napi_get_named_property(napi_env env, napi_value object, const char* utf8name, napi_value* result);
napi_status napi_set_element(napi_env env, napi_value object, uint32_t index, napi_value value);
napi_status napi_get_element(napi_env env, napi_value object, uint32_t index, napi_value* result);
napi_status napi_define_properties(napi_env env, napi_value object, size_t property_count, const napi_property_descriptor* properties);

// 函数 / 调用
napi_status napi_create_function(napi_env env, const char* utf8name, size_t length, napi_callback cb, void* data, napi_value* result);
napi_status napi_get_cb_info(napi_env env, napi_callback_info cbinfo, size_t* argc, napi_value* argv, napi_value* this_arg, void** data);
napi_status napi_call_function(napi_env env, napi_value recv, napi_value func, size_t argc, const napi_value* argv, napi_value* result);

// External / finalize
napi_status napi_create_external(napi_env env, void* data, napi_finalize finalize_cb, void* finalize_hint, napi_value* result);
napi_status napi_get_value_external(napi_env env, napi_value value, void** result);
napi_status napi_wrap(napi_env env, napi_value js_object, void* native_object, napi_finalize finalize_cb, void* finalize_hint, napi_ref* result);
napi_status napi_unwrap(napi_env env, napi_value js_object, void** result);

// Promise / async
napi_status napi_create_promise(napi_env env, napi_deferred* deferred, napi_value* promise);
napi_status napi_resolve_deferred(napi_env env, napi_deferred deferred, napi_value resolution);
napi_status napi_reject_deferred(napi_env env, napi_deferred deferred, napi_value rejection);
napi_status napi_create_async_work(napi_env env, napi_value async_resource, napi_value async_resource_name, napi_async_execute_callback execute, napi_async_complete_callback complete, void* data, napi_async_work* result);
napi_status napi_queue_async_work(napi_env env, napi_async_work work);
napi_status napi_delete_async_work(napi_env env, napi_async_work work);

// 引用计数
napi_status napi_create_reference(napi_env env, napi_value value, uint32_t initial_refcount, napi_ref* result);
napi_status napi_delete_reference(napi_env env, napi_ref ref);
napi_status napi_reference_ref(napi_env env, napi_ref ref, uint32_t* result);
napi_status napi_reference_unref(napi_env env, napi_ref ref, uint32_t* result);
napi_status napi_get_reference_value(napi_env env, napi_ref ref, napi_value* result);

// HandleScope
napi_status napi_open_handle_scope(napi_env env, napi_handle_scope* result);
napi_status napi_close_handle_scope(napi_env env, napi_handle_scope scope);

// ThreadsafeFunction
napi_status napi_create_threadsafe_function(napi_env env, napi_value func, napi_value async_resource, napi_value async_resource_name, size_t max_queue_size, size_t initial_thread_count, void* thread_finalize_data, napi_finalize thread_finalize_cb, void* context, napi_threadsafe_function_call_js call_js_cb, napi_threadsafe_function* result);
napi_status napi_call_threadsafe_function(napi_threadsafe_function func, void* data, napi_threadsafe_function_call_mode is_blocking);
napi_status napi_release_threadsafe_function(napi_threadsafe_function func, napi_threadsafe_function_release_mode mode);
napi_status napi_acquire_threadsafe_function(napi_threadsafe_function func);

// 模块注册
void napi_module_register(napi_module* mod);

#ifdef __cplusplus
}
#endif

// 辅助宏（与 HarmonyOS 官方头一致）
#ifndef NAPI_AUTO_LENGTH
#define NAPI_AUTO_LENGTH SIZE_MAX
#endif

#ifndef NAPI_MODULE
#define NAPI_MODULE(modname, regfunc) \
    extern "C" __attribute__((constructor)) void _register_##modname(void) { \
        static napi_module m = { \
            nullptr, 1, 0, __FILE__, regfunc, #modname, {0,0,0,0} \
        }; \
        napi_module_register(&m); \
    }
#endif
