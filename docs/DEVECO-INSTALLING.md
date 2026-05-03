# ⏳ DevEco Studio 安装进行中

> **当前状态**: 等待下载完成  
> **日期**: 2026-04-26

---

## 📥 下载指引

### 步骤 1: 下载 DevEco Studio

官方下载页面已在浏览器中打开：
**https://developer.huawei.com/consumer/cn/deveco-studio/**

**下载说明**:
1. 点击页面上的 **"下载"** 按钮
2. 选择 **macOS** 版本（Apple Silicon 或 Intel）
3. 等待下载完成（约 1.5-2GB，可能需要 5-15 分钟）

---

## 📦 安装步骤

### 步骤 2: 安装应用

下载完成后：

```bash
# 1. 打开 Downloads 文件夹
open ~/Downloads

# 2. 双击打开 .dmg 文件
# 3. 拖拽 Deveco Studio.app 到 Applications 文件夹
```

### 步骤 3: 首次启动

```bash
# 启动 DevEco Studio
open -a "Deveco Studio"
```

**首次配置**:
1. 同意许可协议
2. 选择 UI 主题（推荐 Light）
3. 等待 IDE 初始化

---

## 🔧 SDK 配置

### 步骤 4: 下载 HarmonyOS SDK

在 DevEco Studio 中：

1. `Welcome` 页面 → `More Settings` → `Settings`
2. 导航到 `HarmonyOS SDK`
3. 勾选以下组件：
   - ✅ **SDK API 12** (或最新版本)
   - ✅ **DevEco-Test**
   - ✅ **Node.js** (内置)
   - ✅ **ohpm**
4. 点击 `Apply` 开始下载（约 2-3GB）

---

## 📂 打开项目

### 步骤 5: 打开 Readmigo 项目

```bash
# 方式 A: 从 DevEco Studio 菜单
# File → Open → 选择 apps/harmony-app

# 方式 B: 命令行（DevEco Studio 启动后）
open -a "Deveco Studio" /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app
```

---

## ✅ 验证安装

运行以下命令验证：

```bash
# 检查是否已安装
ls -la /Applications/Deveco\\ Studio.app

# 检查 SDK 是否安装
ls -la ~/Library/Huawei/Sdk

# 检查 ohpm 是否可用（在 DevEco Studio 终端）
ohpm --version
```

---

## 🚀 快速验证命令

```bash
# 一键检查安装状态
echo "=== DevEco Studio 安装检查 ==="
echo ""
echo "1. 应用安装:"
ls -d /Applications/Deveco\\ Studio.app 2>/dev/null && echo "   ✅ 已安装" || echo "   ❌ 未安装"
echo ""
echo "2. SDK 安装:"
ls -d ~/Library/Huawei/Sdk 2>/dev/null && echo "   ✅ 已安装" || echo "   ❌ 未安装"
echo ""
echo "3. 项目目录:"
ls -d /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app 2>/dev/null && echo "   ✅ 存在" || echo "   ❌ 不存在"
```

---

## 📋 安装后清单

安装完成后，请确认：

- [ ] DevEco Studio 可正常启动
- [ ] HarmonyOS SDK 已下载完成
- [ ] ohpm 命令可用
- [ ] 项目可打开（`apps/harmony-app`）
- [ ] 构建无错误（Build → Build Hap(s)）

---

## 🆘 需要帮助？

- **安装文档**: `docs/DEVECO-INSTALL.md`
- **环境搭建**: `docs/HARMONY-SETUP.md`
- **快速启动**: `QUICKSTART.md`
- **官方文档**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/deveco-studio-guide-V5

---

## ⏱️ 预计时间

| 步骤 | 预计时间 |
|------|---------|
| 下载 DevEco Studio | 5-15 分钟 |
| 安装应用 | 2-5 分钟 |
| 下载 SDK | 10-20 分钟 |
| 首次启动 | 2-5 分钟 |
| **总计** | **约 20-45 分钟** |

---

**提示**: 下载和安装过程中请保持网络连接稳定。
