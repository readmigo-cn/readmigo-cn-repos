#!/usr/bin/env bash
# =============================================================================
# build-native.sh — Build libreadmigo_native.so for HarmonyOS NEXT (arm64-v8a)
#
# Usage:
#   ./scripts/build-native.sh [options]
#
# Options:
#   --debug       Build Debug variant with symbols (default)
#   --release     Build Release variant with optimisations (-O2, stripped)
#   --verbose     Print full Ninja output instead of progress summary
#   --clean       Remove build artefacts before building
#   --help        Print this message and exit
#
# Environment variables:
#   HARMONYOS_SDK_HOME   Path to the HarmonyOS SDK root.
#                        Defaults to ~/Library/Huawei/Sdk on macOS.
#
# Output:
#   apps/harmony-app/entry/libs/arm64-v8a/libreadmigo_native.so
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
_RED='\033[0;31m'
_GREEN='\033[0;32m'
_YELLOW='\033[1;33m'
_CYAN='\033[0;36m'
_BOLD='\033[1m'
_NC='\033[0m'

info()    { echo -e "${_CYAN}[INFO]${_NC}  $*"; }
success() { echo -e "${_GREEN}[OK]${_NC}    $*"; }
warn()    { echo -e "${_YELLOW}[WARN]${_NC}  $*"; }
error()   { echo -e "${_RED}[ERROR]${_NC} $*" >&2; }
bold()    { echo -e "${_BOLD}$*${_NC}"; }

# ---------------------------------------------------------------------------
# Resolve script / repo root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
BUILD_TYPE="Debug"
VERBOSE=false
CLEAN=false

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --debug)   BUILD_TYPE="Debug";   shift ;;
        --release) BUILD_TYPE="Release"; shift ;;
        --verbose) VERBOSE=true;         shift ;;
        --clean)   CLEAN=true;           shift ;;
        --help)
            grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            error "Run with --help for usage."
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# OS detection
# ---------------------------------------------------------------------------
OS="$(uname -s)"
case "${OS}" in
    Darwin) PLATFORM="macOS" ;;
    Linux)  PLATFORM="Linux" ;;
    *)
        error "Unsupported OS: ${OS}"
        error "This script supports macOS and Linux only."
        exit 1
        ;;
esac
info "Platform: ${PLATFORM}"

# ---------------------------------------------------------------------------
# Locate HarmonyOS SDK
# ---------------------------------------------------------------------------
locate_sdk() {
    # 1. Honour explicit env var.
    if [[ -n "${HARMONYOS_SDK_HOME:-}" ]]; then
        echo "${HARMONYOS_SDK_HOME}"
        return 0
    fi

    # 2. macOS default — DevEco Studio installs the SDK here.
    if [[ "${PLATFORM}" == "macOS" ]]; then
        local candidate="${HOME}/Library/Huawei/Sdk"
        if [[ -d "${candidate}" ]]; then
            echo "${candidate}"
            return 0
        fi
    fi

    # 3. Linux — common location used by CI runners / Docker images.
    local linux_candidate="/opt/harmonyos-sdk"
    if [[ -d "${linux_candidate}" ]]; then
        echo "${linux_candidate}"
        return 0
    fi

    return 1
}

if ! SDK_HOME="$(locate_sdk)"; then
    error "HarmonyOS SDK not found."
    error ""
    error "Set HARMONYOS_SDK_HOME to the SDK root, for example:"
    error "  export HARMONYOS_SDK_HOME=~/Library/Huawei/Sdk"
    error ""
    error "On macOS, install DevEco Studio and open it once to trigger SDK download."
    exit 1
fi
success "SDK: ${SDK_HOME}"

# The OHOS NDK ships with a CMake toolchain file.
# HarmonyOS NEXT SDK layout: <sdk>/<api-version>/native/
# Detect the newest installed API version directory automatically.
find_toolchain() {
    local toolchain=""
    # Search for the canonical ohos.toolchain.cmake path under the SDK root.
    # Use -maxdepth 6 to avoid deep traversal of large SDK trees.
    while IFS= read -r candidate; do
        toolchain="${candidate}"
    done < <(find "${SDK_HOME}" -maxdepth 6 -name "ohos.toolchain.cmake" 2>/dev/null | sort -V)

    if [[ -z "${toolchain}" ]]; then
        return 1
    fi
    echo "${toolchain}"
}

if ! TOOLCHAIN_FILE="$(find_toolchain)"; then
    error "ohos.toolchain.cmake not found under ${SDK_HOME}."
    error "Ensure the HarmonyOS Native SDK component is installed in DevEco Studio."
    exit 1
fi
success "Toolchain: ${TOOLCHAIN_FILE}"

# ---------------------------------------------------------------------------
# Path definitions
# ---------------------------------------------------------------------------
TYPESETTING_DIR="${REPO_ROOT}/native/typesetting"
BADGE_ENGINE_DIR="${REPO_ROOT}/native/badge-engine"
ENTRY_CPP_DIR="${REPO_ROOT}/apps/harmony-app/entry/src/main/cpp"
OUTPUT_DIR="${REPO_ROOT}/apps/harmony-app/entry/libs/arm64-v8a"

# Separate build directories per library step + configuration.
BUILD_BASE="${REPO_ROOT}/.build-native/${BUILD_TYPE}"
BUILD_TYPESETTING="${BUILD_BASE}/typesetting"
BUILD_BADGE_ENGINE="${BUILD_BASE}/badge-engine"
BUILD_NAPI="${BUILD_BASE}/napi"

# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------
if [[ "${CLEAN}" == "true" ]]; then
    info "Cleaning build artefacts..."
    rm -rf "${BUILD_BASE}"
    rm -f  "${OUTPUT_DIR}/libreadmigo_native.so"
    success "Clean complete."
fi

# ---------------------------------------------------------------------------
# Ninja verbosity flag
# ---------------------------------------------------------------------------
NINJA_FLAGS=()
if [[ "${VERBOSE}" == "true" ]]; then
    NINJA_FLAGS+=("-v")
fi

# ---------------------------------------------------------------------------
# Helper: run cmake + ninja with error attribution
# ---------------------------------------------------------------------------
run_build_step() {
    local step_name="$1"
    local src_dir="$2"
    local build_dir="$3"
    shift 3
    local extra_cmake_args=("$@")

    bold "━━━ Step: ${step_name} ━━━"

    mkdir -p "${build_dir}"

    info "Configuring ${step_name}..."
    if ! cmake \
        -S "${src_dir}" \
        -B "${build_dir}" \
        -G Ninja \
        -DCMAKE_TOOLCHAIN_FILE="${TOOLCHAIN_FILE}" \
        -DOHOS_ARCH=arm64-v8a \
        -DCMAKE_BUILD_TYPE="${BUILD_TYPE}" \
        "${extra_cmake_args[@]}" \
        2>&1; then
        error ""
        error "CMake configure FAILED for step: ${step_name}"
        error "  Source dir : ${src_dir}"
        error "  Build dir  : ${build_dir}"
        error "  Toolchain  : ${TOOLCHAIN_FILE}"
        error ""
        error "Common causes:"
        error "  - Missing SDK component (check DevEco Studio SDK Manager)"
        error "  - OHOS_ARCH mismatch (only arm64-v8a is supported)"
        error "  - Missing third-party dependency (e.g. nlohmann_json)"
        exit 1
    fi

    info "Compiling ${step_name}..."
    if ! cmake \
        --build "${build_dir}" \
        --config "${BUILD_TYPE}" \
        -- "${NINJA_FLAGS[@]}" \
        2>&1; then
        error ""
        error "Compile FAILED for step: ${step_name}"
        error "  Build dir: ${build_dir}"
        error ""
        error "Re-run with --verbose to see the exact compile command that failed."
        exit 1
    fi

    success "${step_name} built successfully."
}

# ---------------------------------------------------------------------------
# Step 1: Build typesetting static library
# ---------------------------------------------------------------------------
run_build_step "typesetting" \
    "${TYPESETTING_DIR}" \
    "${BUILD_TYPESETTING}" \
    -DTYPESETTING_PLATFORM_HARMONY=ON \
    -DTYPESETTING_BUILD_TESTS=OFF \
    -DTYPESETTING_BUILD_TOOLS=OFF

# ---------------------------------------------------------------------------
# Step 2: Build badge-engine static library
# ---------------------------------------------------------------------------
run_build_step "badge-engine" \
    "${BADGE_ENGINE_DIR}" \
    "${BUILD_BADGE_ENGINE}" \
    -DBADGE_ENGINE_BUILD_TESTS=OFF \
    -DBADGE_ENGINE_BUILD_EXAMPLES=OFF \
    -DBADGE_ENGINE_USE_FILAMENT=OFF   # Toggle ON when Filament SDK is present

# ---------------------------------------------------------------------------
# Step 3: Build NAPI bindings + link everything → libreadmigo_native.so
#
# We configure the top-level entry CMakeLists which references both static
# libraries via add_subdirectory.  CMake correctly handles the nested build
# because the sub-library build directories are already populated from
# Steps 1 & 2 — however, the top-level CMake will re-build them internally
# (inside ${BUILD_NAPI}) as add_subdirectory targets.  The two-step approach
# above serves mainly as an early-exit smoke-test for each library in
# isolation, giving clearer failure attribution.
# ---------------------------------------------------------------------------
bold "━━━ Step: NAPI bindings + link → libreadmigo_native.so ━━━"

mkdir -p "${BUILD_NAPI}"
mkdir -p "${OUTPUT_DIR}"

info "Configuring NAPI bridge + full link..."
if ! cmake \
    -S "${ENTRY_CPP_DIR}" \
    -B "${BUILD_NAPI}" \
    -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE="${TOOLCHAIN_FILE}" \
    -DOHOS_ARCH=arm64-v8a \
    -DCMAKE_BUILD_TYPE="${BUILD_TYPE}" \
    -DTYPESETTING_PLATFORM_HARMONY=ON \
    -DTYPESETTING_BUILD_TESTS=OFF \
    -DTYPESETTING_BUILD_TOOLS=OFF \
    -DBADGE_ENGINE_BUILD_TESTS=OFF \
    -DBADGE_ENGINE_BUILD_EXAMPLES=OFF \
    -DBADGE_ENGINE_USE_FILAMENT=OFF \
    2>&1; then
    error "CMake configure FAILED for NAPI bridge step."
    error "  Source dir : ${ENTRY_CPP_DIR}"
    error "  Build dir  : ${BUILD_NAPI}"
    exit 1
fi

info "Compiling NAPI bridge and linking libreadmigo_native.so..."
if ! cmake \
    --build "${BUILD_NAPI}" \
    --config "${BUILD_TYPE}" \
    --target readmigo_native \
    -- "${NINJA_FLAGS[@]}" \
    2>&1; then
    error ""
    error "Link FAILED for libreadmigo_native.so"
    error "  Build dir: ${BUILD_NAPI}"
    error ""
    error "Re-run with --verbose to see the linker command."
    exit 1
fi

# ---------------------------------------------------------------------------
# Copy output to the canonical location expected by hvigorw / DevEco Studio.
# The CMakeLists sets LIBRARY_OUTPUT_DIRECTORY to this path, but copying
# explicitly here ensures the file lands even if the property was overridden.
# ---------------------------------------------------------------------------
SO_SOURCE="$(find "${BUILD_NAPI}" -name "libreadmigo_native.so" | head -1)"
if [[ -z "${SO_SOURCE}" ]]; then
    error "libreadmigo_native.so not found in build directory: ${BUILD_NAPI}"
    error "CMake may have produced it under a different name; check the build log."
    exit 1
fi

cp "${SO_SOURCE}" "${OUTPUT_DIR}/libreadmigo_native.so"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Build complete: ${BUILD_TYPE}"
info   "  Output : ${OUTPUT_DIR}/libreadmigo_native.so"
info   "  Size   : $(du -sh "${OUTPUT_DIR}/libreadmigo_native.so" | cut -f1)"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "Next step: open apps/harmony-app in DevEco Studio and run Build → Build Hap(s)"
