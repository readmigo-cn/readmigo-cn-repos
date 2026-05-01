# HarmonyOS NDK CMake entry. DevEco passes:
#   -DCMAKE_TOOLCHAIN_FILE=<sdk>/native/build/cmake/ohos.toolchain.cmake
#   -DOHOS_ARCH=arm64-v8a
# This file pulls in napi-bridge (which pulls in native/typesetting), and produces
# libreadmigo_typesetting.so packaged into the HAP under libs/<arch>/.

cmake_minimum_required(VERSION 3.20)
project(readmigo_app_native LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Tell typesetting to compile the harmony platform adapter
set(TYPESETTING_PLATFORM_HARMONY ON CACHE BOOL "Use harmony platform adapter" FORCE)

# Tell napi-bridge to also build the .so
set(READMIGO_BUILD_NAPI ON CACHE BOOL "Build NAPI shared lib" FORCE)

# Resolve napi-bridge directory (4 levels up from entry/src/main/cpp/)
set(NAPI_BRIDGE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../napi-bridge")
add_subdirectory("${NAPI_BRIDGE_DIR}" napi_bridge_build)

# DevEco's NDK provides ace_napi.z; our shared lib must link it for napi_* symbols.
# This target is created inside napi-bridge/CMakeLists.txt (when READMIGO_BUILD_NAPI=ON).
target_link_libraries(readmigo_typesetting_napi PRIVATE libace_napi.z.so)
