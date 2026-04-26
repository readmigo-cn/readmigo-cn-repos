#!/bin/bash

# =============================================================================
# Readmigo HarmonyOS 开发环境自动安装脚本
# =============================================================================
# 适用系统：macOS (Apple Silicon / Intel)
# 功能：自动下载并配置 DevEco Studio、HarmonyOS SDK、ohpm
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统
check_system() {
    log_info "检查系统环境..."
    
    if [[ "$(uname)" != "Darwin" ]]; then
        log_error "此脚本仅支持 macOS 系统"
        exit 1
    fi
    
    # 检查磁盘空间
    local free_space=$(df -h / | tail -1 | awk '{print $4}')
    log_info "可用磁盘空间：$free_space"
    
    # 检查 Java
    if command -v java &> /dev/null; then
        local java_version=$(java -version 2>&1 | head -1)
        log_success "Java 已安装：$java_version"
    else
        log_warning "Java 未安装，DevEco Studio 需要 JDK 17+"
    fi
    
    # 检查 Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v)
        log_success "Node.js 已安装：$node_version"
    else
        log_warning "Node.js 未安装"
    fi
}

# 下载 DevEco Studio
download_deveco() {
    log_info "开始下载 DevEco Studio..."
    
    local DOWNLOAD_DIR="$HOME/Downloads"
    local DEVICO_URL="https://developer.huawei.com/consumer/cn/deveco-studio/"
    
    echo ""
    log_info "请访问官方下载页面："
    echo "  $DEVICO_URL"
    echo ""
    log_info "选择最新版本的 macOS 安装包 (DMG 格式)"
    echo ""
    
    # 检查是否已安装
    if [ -d "/Applications/Deveco Studio.app" ]; then
        log_success "DevEco Studio 已安装在 /Applications/Deveco Studio.app"
        read -p "是否重新下载？(y/N): " reinstall
        if [[ ! "$reinstall" =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    echo ""
    log_info "下载完成后，请手动安装："
    echo "  1. 打开下载的 DMG 文件"
    echo "  2. 拖拽 DevEco Studio 到 Applications 文件夹"
    echo "  3. 首次启动并同意许可协议"
    echo ""
}

# 配置 SDK
setup_sdk() {
    log_info "配置 HarmonyOS SDK..."
    
    local SDK_DIR="$HOME/Library/Huawei/Sdk"
    
    if [ -d "$SDK_DIR" ]; then
        log_success "SDK 已安装在 $SDK_DIR"
    else
        log_info "SDK 将安装在 $SDK_DIR"
        log_info "首次启动 DevEco Studio 后会自动下载 SDK"
    fi
    
    # 添加环境变量
    local ENV_FILE="$HOME/.zshrc"
    if ! grep -q "HARMONYOS_SDK_HOME" "$ENV_FILE" 2>/dev/null; then
        echo "" >> "$ENV_FILE"
        echo "# HarmonyOS SDK" >> "$ENV_FILE"
        echo "export HARMONYOS_SDK_HOME=\"$HOME/Library/Huawei/Sdk\"" >> "$ENV_FILE"
        echo "export PATH=\"\$PATH:\$HARMONYOS_SDK_HOME/toolchains\"" >> "$ENV_FILE"
        log_success "已添加 SDK 环境变量到 $ENV_FILE"
        log_info "请运行 'source $ENV_FILE' 或重新打开终端以生效"
    fi
}

# 配置 ohpm
setup_ohpm() {
    log_info "配置 ohpm..."
    
    local OHPM_CONFIG_DIR="$HOME/.ohpm"
    mkdir -p "$OHPM_CONFIG_DIR"
    
    # 创建 ohpm 配置
    cat > "$OHPM_CONFIG_DIR/ohpm-config.json" << 'EOF'
{
  "registry": "https://ohpm-openharmony.cn/npm/",
  "testServer": "https://ohpm-openharmony.cn"
}
EOF
    
    log_success "ohpm 配置已创建 (使用国内镜像源)"
}

# 创建项目配置文件
setup_project_config() {
    log_info "配置项目..."
    
    local PROJECT_DIR="/Users/HONGBGU/Documents/readmigo-cn-repos"
    local HARMONY_APP_DIR="$PROJECT_DIR/apps/harmony-app"
    
    # 检查项目目录
    if [ ! -d "$HARMONY_APP_DIR" ]; then
        log_error "项目目录不存在：$HARMONY_APP_DIR"
        exit 1
    fi
    
    # 创建 agconnect-services.json 示例
    local AGC_FILE="$HARMONY_APP_DIR/entry/agconnect-services.json"
    if [ ! -f "$AGC_FILE" ]; then
        cp "$HARMONY_APP_DIR/entry/agconnect-services.json.example" "$AGC_FILE" 2>/dev/null || {
            log_warning "agconnect-services.json.example 不存在"
            log_info "请在华为 AGC 控制台创建应用后下载 agconnect-services.json"
            log_info "放置到：$AGC_FILE"
        }
    fi
    
    # 安装依赖
    log_info "安装项目依赖..."
    cd "$PROJECT_DIR"
    
    if command -v pnpm &> /dev/null; then
        pnpm install
        log_success "根依赖安装完成"
    else
        log_warning "pnpm 未安装，请先安装 pnpm: npm install -g pnpm"
    fi
    
    cd "$HARMONY_APP_DIR"
    if command -v ohpm &> /dev/null; then
        ohpm install
        log_success "鸿蒙应用依赖安装完成"
    else
        log_warning "ohpm 未安装，请先在 DevEco Studio 中配置"
    fi
}

# 创建签名配置
setup_signing() {
    log_info "创建签名配置..."
    
    local PROJECT_DIR="/Users/HONGBGU/Documents/readmigo-cn-repos"
    local HARMONY_APP_DIR="$PROJECT_DIR/apps/harmony-app"
    local SIGNING_DIR="$HARMONY_APP_DIR/signing"
    
    mkdir -p "$SIGNING_DIR"
    
    # 创建签名配置文件
    cat > "$SIGNING_DIR/signing-config.json" << 'EOF'
{
  "signings": [
    {
      "name": "readmigo",
      "type": "HarmonyOS",
      "material": {
        "certpath": "",
        "keyAlias": "readmigo",
        "keyPassword": "",
        "storeFile": "",
        "storePassword": ""
      }
    }
  ]
}
EOF
    
    log_info "签名配置模板已创建：$SIGNING_DIR/signing-config.json"
    log_warning "请在 DevEco Studio 中生成实际签名文件后更新此配置"
}

# 打印下一步指引
print_next_steps() {
    echo ""
    echo "================================================================="
    log_success "开发环境配置完成！"
    echo "================================================================="
    echo ""
    echo "下一步操作："
    echo ""
    echo "1. 启动 DevEco Studio"
    echo "   - 从 Applications 文件夹打开"
    echo "   - 或运行：open -a 'Deveco Studio'"
    echo ""
    echo "2. 打开项目"
    echo "   - File → Open → 选择 apps/harmony-app"
    echo ""
    echo "3. 配置 SDK"
    echo "   - Settings → HarmonyOS SDK"
    echo "   - 勾选 SDK API 12+ 和相关组件"
    echo "   - 点击 Apply 开始下载"
    echo ""
    echo "4. 配置签名"
    echo "   - 右键 entry → Open Module Settings → Signatures"
    echo "   - 添加新签名配置 (Alias: readmigo)"
    echo ""
    echo "5. 配置 AGC"
    echo "   - 访问 https://developer.huawei.com/consumer/cn/service/josp/agc/"
    echo "   - 创建项目和应用"
    echo "   - 下载 agconnect-services.json 到 entry/目录"
    echo ""
    echo "6. 构建运行"
    echo "   - Build → Build Hap(s)"
    echo "   - 或运行到模拟器/真机"
    echo ""
    echo "================================================================="
    echo ""
    echo "参考文档：docs/HARMONY-SETUP.md"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "================================================================="
    echo "  Readmigo HarmonyOS 开发环境安装脚本"
    echo "================================================================="
    echo ""
    
    check_system
    
    echo ""
    read -p "是否继续安装？(y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "安装已取消"
        exit 0
    fi
    
    download_deveco
    setup_sdk
    setup_ohpm
    setup_project_config
    setup_signing
    print_next_steps
    
    log_success "所有步骤完成！"
}

# 运行主函数
main "$@"
