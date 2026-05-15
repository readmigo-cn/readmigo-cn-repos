#!/bin/bash

# =============================================================================
# DevEco Studio 自动下载脚本
# =============================================================================
# 功能：下载并安装 DevEco Studio NEXT
# 适用：macOS (Apple Silicon / Intel)
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "================================================================="
echo "  DevEco Studio 下载与安装助手"
echo "================================================================="
echo ""

# 检查是否已安装
if [ -d "/Applications/Deveco Studio.app" ]; then
    log_success "DevEco Studio 已安装"
    read -p "是否重新下载？(y/N): " reinstall
    if [[ ! "$reinstall" =~ ^[Yy]$ ]]; then
        log_info "打开 DevEco Studio..."
        open -a "Deveco Studio"
        exit 0
    fi
fi

# 检查磁盘空间
free_space=$(df -h / | tail -1 | awk '{print $4}')
log_info "可用磁盘空间：$free_space"

echo ""
log_info "DevEco Studio 下载选项："
echo ""
echo "  1. 官方网站下载（推荐）"
echo "     - 最新版本"
echo "     - 完整功能"
echo "     - 约 1.5-2GB"
echo ""
echo "  2. 华为云镜像下载"
echo "     - 国内加速"
echo "     - 约 1.5-2GB"
echo ""

read -p "请选择下载方式 (1/2): " choice

DOWNLOAD_URL=""
if [[ "$choice" == "1" ]]; then
    DOWNLOAD_URL="https://developer.huawei.com/consumer/cn/deveco-studio/"
    log_info "正在打开官方下载页面..."
    open "$DOWNLOAD_URL"
    
    echo ""
    echo "================================================================="
    echo "  请在浏览器中下载 DevEco Studio"
    echo "================================================================="
    echo ""
    echo "  下载完成后，请手动安装："
    echo "  1. 打开下载的 .dmg 文件"
    echo "  2. 拖拽 Deveco Studio.app 到 Applications 文件夹"
    echo "  3. 首次启动并同意许可协议"
    echo ""
    
    read -p "下载完成后按回车继续..."
    
elif [[ "$choice" == "2" ]]; then
    # 华为云镜像（示例链接，实际链接可能变化）
    DOWNLOAD_URL="https://repo.huaweicloud.com/DevecoStudio/Deveco-Studio-NEXT-beta1.dmg"
    log_info "开始从华为云镜像下载..."
    
    cd ~/Downloads
    if command -v wget &> /dev/null; then
        wget -c --show-progress "$DOWNLOAD_URL" -o "Deveco-Studio-NEXT.dmg"
    elif command -v curl &> /dev/null; then
        curl -L -# -o "Deveco-Studio-NEXT.dmg" "$DOWNLOAD_URL"
    else
        log_error "未找到 wget 或 curl，请手动下载"
        open "https://developer.huawei.com/consumer/cn/deveco-studio/"
        exit 1
    fi
    
    log_success "下载完成"
    
    # 挂载 DMG
    log_info "挂载 DMG 文件..."
    hdiutil attach "Deveco-Studio-NEXT.dmg"
    
    echo ""
    echo "================================================================="
    echo "  安装 DevEco Studio"
    echo "================================================================="
    echo ""
    echo "  请手动操作："
    echo "  1. 在打开的窗口中，拖拽 Deveco Studio 到 Applications"
    echo "  2. 完成后按回车继续"
    echo ""
    
    read -p "安装完成后按回车继续..."
    
    # 卸载 DMG
    hdiutil detach "/Volumes/Deveco Studio" 2>/dev/null || true
fi

# 验证安装
if [ -d "/Applications/Deveco Studio.app" ]; then
    log_success "DevEco Studio 安装完成！"
    
    read -p "是否现在打开 DevEco Studio？(y/N): " open_now
    if [[ "$open_now" =~ ^[Yy]$ ]]; then
        log_info "启动 DevEco Studio..."
        open -a "Deveco Studio"
    fi
    
    echo ""
    echo "================================================================="
    echo "  下一步配置"
    echo "================================================================="
    echo ""
    echo "  1. 首次启动配置"
    echo "     - 同意许可协议"
    echo "     - 选择 UI 主题"
    echo ""
    echo "  2. 下载 HarmonyOS SDK"
    echo "     - Settings → HarmonyOS SDK"
    echo "     - 勾选 SDK API 12+"
    echo "     - 点击 Apply 下载"
    echo ""
    echo "  3. 打开项目"
    echo "     - File → Open"
    echo "     - 选择 harmony-app"
    echo ""
    echo "  4. 配置签名"
    echo "     - 右键 entry → Open Module Settings → Signatures"
    echo "     - 添加签名配置"
    echo ""
    echo "  5. 配置 AGC"
    echo "     - 访问 AGC 控制台创建应用"
    echo "     - 下载 agconnect-services.json"
    echo "     - 放置到 entry/目录"
    echo ""
    echo "================================================================="
    echo ""
    echo "  详细文档：docs/DEVECO-INSTALL.md"
    echo ""
    
else
    log_error "安装未完成，请检查安装过程"
    exit 1
fi

log_success "所有步骤完成！"
