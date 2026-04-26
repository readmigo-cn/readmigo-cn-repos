cmake_minimum_required(VERSION 3.20)
project(readmigo_napi_bridge LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(READMIGO_BUILD_NAPI "Build Harmony NAPI bridge" OFF)
set(TYPESETTING_PLATFORM_HARMONY ON CACHE BOOL "Build Harmony platform adapter" FORCE)

add_subdirectory(../native/typesetting native_typesetting_build)

add_library(readmigo_typesetting_bridge STATIC
    src/typesetting_bridge.cpp
)

target_include_directories(readmigo_typesetting_bridge
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_SOURCE_DIR}/src
        ${CMAKE_CURRENT_SOURCE_DIR}/../native/typesetting/include
)

target_link_libraries(readmigo_typesetting_bridge
    PUBLIC
        typesetting
)

if(READMIGO_BUILD_NAPI)
    add_library(readmigo_typesetting_napi SHARED
        src/typesetting_napi.cpp
    )

    target_include_directories(readmigo_typesetting_napi
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/include
            ${CMAKE_CURRENT_SOURCE_DIR}/src
            ${CMAKE_CURRENT_SOURCE_DIR}/../native/typesetting/include
    )

    target_link_libraries(readmigo_typesetting_napi
        PRIVATE
            readmigo_typesetting_bridge
    )
endif()
