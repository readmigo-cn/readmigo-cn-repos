cmake_minimum_required(VERSION 3.20)
project(typesetting VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(TYPESETTING_PLATFORM_HARMONY "Build Harmony platform adapter" OFF)

# Library sources
file(GLOB_RECURSE SOURCES src/*.cpp)
file(GLOB_RECURSE HEADERS include/typesetting/*.h)

# Apple: add ObjC++ platform adapter
if(APPLE)
    enable_language(OBJCXX)
    list(APPEND SOURCES src/platform_apple.mm)
endif()

if(TYPESETTING_PLATFORM_HARMONY)
    list(APPEND SOURCES src/platform_harmony.cpp)
endif()

add_library(typesetting STATIC ${SOURCES} ${HEADERS})

target_include_directories(typesetting
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

# Platform-specific linking
if(APPLE)
    find_library(CORE_TEXT CoreText)
    find_library(CORE_FOUNDATION CoreFoundation)
    find_library(CORE_GRAPHICS CoreGraphics)
    target_link_libraries(typesetting PRIVATE ${CORE_TEXT} ${CORE_FOUNDATION} ${CORE_GRAPHICS})

    # macOS CLI needs AppKit; iOS needs UIKit (handled via TARGET_OS_IPHONE)
    if(NOT CMAKE_SYSTEM_NAME STREQUAL "iOS")
        find_library(APPKIT AppKit)
        target_link_libraries(typesetting PRIVATE ${APPKIT})
    endif()
endif()

if(TYPESETTING_PLATFORM_HARMONY)
    target_compile_definitions(typesetting PUBLIC TYPESETTING_PLATFORM_HARMONY=1)
endif()

# Tests
option(TYPESETTING_BUILD_TESTS "Build tests" ON)
if(TYPESETTING_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# CLI tools (macOS only)
option(TYPESETTING_BUILD_TOOLS "Build CLI tools" OFF)
if(TYPESETTING_BUILD_TOOLS AND APPLE AND NOT CMAKE_SYSTEM_NAME STREQUAL "iOS")
    add_subdirectory(tools)
endif()
