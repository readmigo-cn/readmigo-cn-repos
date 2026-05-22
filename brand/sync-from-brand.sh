#!/bin/bash

# sync-from-brand.sh
# 从海外品牌仓库同步资产到 HarmonyOS 应用
# 脚本检测 brand repo 的 dist/harmony/ 是否存在，若不存在则提示等待

set -e

BRAND_REPO="/Users/HONGBGU/Documents/readmigo-repos/brand"
HARMONY_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../harmony-app" && pwd)"
ENTRY_MEDIA_DIR="${HARMONY_APP_DIR}/entry/src/main/resources/base/media"
APPSCOPE_MEDIA_DIR="${HARMONY_APP_DIR}/AppScope/resources/base/media"

echo "=================================================="
echo "HarmonyOS 品牌资产同步脚本"
echo "=================================================="
echo "Brand 源路径: ${BRAND_REPO}"
echo "HarmonyOS App: ${HARMONY_APP_DIR}"
echo ""

# 检查 brand repo 是否存在
if [ ! -d "${BRAND_REPO}" ]; then
    echo "ERROR: Brand repo 不存在于 ${BRAND_REPO}"
    exit 1
fi

# 检查 HarmonyOS 输出目录是否存在
HARMONY_DIST="${BRAND_REPO}/dist/harmony"
if [ ! -d "${HARMONY_DIST}" ]; then
    echo "WARNING: Brand repo 尚未生成 HarmonyOS 输出"
    echo ""
    echo "TODO: 等待 Brand 仓库生成 dist/harmony/ 目录"
    echo ""
    echo "集成步骤："
    echo "1. 进入 Brand 仓库: cd ${BRAND_REPO}"
    echo "2. 构建设计 Token: pnpm build:tokens"
    echo "3. 此时应生成 dist/harmony/ 输出"
    echo ""
    echo "或手动添加资产："
    echo "  mkdir -p ${HARMONY_DIST}/{app-icon,splash,logo,media}"
    echo "  # 复制对应资产文件"
    echo ""
    exit 0
fi

echo "检测到 Brand HarmonyOS 输出: ${HARMONY_DIST}"
echo ""

# 创建目标目录
mkdir -p "${ENTRY_MEDIA_DIR}"
mkdir -p "${APPSCOPE_MEDIA_DIR}"

# 同步 Entry media（功能图标、启动图）
if [ -d "${HARMONY_DIST}/media" ]; then
    echo "同步 Entry media 资源..."
    rsync -av --delete "${HARMONY_DIST}/media/" "${ENTRY_MEDIA_DIR}/" || {
        echo "WARNING: Entry media 同步部分失败，继续..."
    }
else
    echo "SKIP: ${HARMONY_DIST}/media 不存在"
fi

# 同步 AppScope media（应用图标）
if [ -d "${HARMONY_DIST}/app-icon" ]; then
    echo "同步 AppScope 应用图标..."
    rsync -av "${HARMONY_DIST}/app-icon/app_icon.png" "${APPSCOPE_MEDIA_DIR}/" || {
        echo "WARNING: 应用图标同步失败，继续..."
    }
else
    echo "SKIP: ${HARMONY_DIST}/app-icon 不存在"
fi

# 同步 splash 图
if [ -d "${HARMONY_DIST}/splash" ]; then
    echo "同步启动图..."
    rsync -av "${HARMONY_DIST}/splash/start_window_background.png" "${ENTRY_MEDIA_DIR}/" || {
        echo "WARNING: 启动图同步失败，继续..."
    }
else
    echo "SKIP: ${HARMONY_DIST}/splash 不存在"
fi

# 同步 logo（SVG）
if [ -d "${HARMONY_DIST}/logo" ]; then
    echo "同步 Logo 资源..."
    rsync -av "${HARMONY_DIST}/logo/"*.svg "${ENTRY_MEDIA_DIR}/" || {
        echo "WARNING: Logo 同步失败，继续..."
    }
else
    echo "SKIP: ${HARMONY_DIST}/logo 不存在"
fi

echo ""
echo "=================================================="
echo "同步完成"
echo "=================================================="
echo ""
echo "下一步："
echo "1. 检查资源文件："
echo "   ls -la ${ENTRY_MEDIA_DIR}"
echo "   ls -la ${APPSCOPE_MEDIA_DIR}"
echo ""
echo "2. 查看占位说明："
echo "   cat ${ENTRY_MEDIA_DIR}/PLACEHOLDER.md"
echo "   cat ${APPSCOPE_MEDIA_DIR}/PLACEHOLDER.md"
echo ""
echo "3. 在 DevEco Studio 中构建并验证应用图标和启动图"
echo ""
