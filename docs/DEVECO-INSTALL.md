# DevEco Studio 下载与安装指南

> **版本**: HarmonyOS NEXT 5.0+ (API 12+)  
> **平台**: macOS (Apple Silicon / Intel)  
> **日期**: 2026-04-26

---

## 🚀 快速安装

### 方式 1: 手动下载（推荐）

#### 步骤 1: 访问官网下载

**官方下载页面**: https://developer.huawei.com/consumer/cn/deveco-studio/

1. 打开上述链接
2. 点击 "下载" 按钮
3. 选择 **macOS** 版本（约 1.5-2GB）
4. 等待下载完成

#### 步骤 2: 安装

1. 打开下载的 `.dmg` 文件
2. 拖拽 `Deveco Studio.app` 到 `Applications` 文件夹
3. 首次启动：
   - 右键点击 `Deveco Studio.app` → `打开`
   - 同意许可协议
   - 选择 UI 主题（推荐 Light）

#### 步骤 3: 配置 SDK

1. 启动后，进入 `Welcome` 界面
2. 点击 `More Settings` → `Settings`
3. 导航到 `HarmonyOS SDK`
4. 勾选以下组件：
   - ✅ **SDK API 12** (或最新版本)
   - ✅ **DevEco-Test** (测试框架)
   - ✅ **Node.js** (内置)
   - ✅ **ohpm** (包管理器)
5. 点击 `Apply` 开始下载（约 2-3GB）

---

### 方式 2: 使用自动下载脚本

```bash
# 运行自动下载脚本
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos
./scripts/download-deveco.sh
```

> 注意：脚本需要约 4-5GB 可用空间

---

## 📋 安装检查清单

安装完成后，请确认以下项目：

- [ ] **DevEco Studio** 已安装到 `/Applications/Deveco Studio.app`
- [ ] **首次启动** 成功并完成初始化
- [ ] **HarmonyOS SDK** 已下载（SDK API 12+）
- [ ] **ohpm** 可用（在 DevEco Studio 终端运行 `ohpm --version`）
- [ ] **项目已打开** (`apps/harmony-app`)
- [ ] **构建成功** (Build → Build Hap(s) 无错误)

---

## 🔧 打开项目

### 方式 A: 从 DevEco Studio 打开

1. 启动 `Deveco Studio`
2. `File` → `Open...`
3. 选择路径：`/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app`
4. 点击 `OK`
5. 等待项目索引完成（首次需要几分钟）

### 方式 B: 使用命令行

```bash
# 如果 DevEco Studio 已安装
open -a "Deveco Studio" /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app
```

---

## 📦 项目配置

### 1. 安装依赖

在 DevEco Studio 终端中运行：

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app
ohpm install
```

### 2. 配置签名

1. 右键点击 `entry` → `Open Module Settings`
2. 选择 `Signatures`
3. 点击 `+` 添加新签名
4. 填写信息：
   - **Alias**: `readmigo`
   - **Password**: (设置密码)
   - **Validity**: 25 年
5. 点击 `OK` 保存

### 3. 配置 AGC

1. 访问：https://developer.huawei.com/consumer/cn/service/josp/agc/
2. 登录华为开发者账号
3. 创建项目 `Readmigo`
4. 添加应用 → HarmonyOS 应用
5. 下载 `agconnect-services.json`
6. 放置到：`apps/harmony-app/entry/agconnect-services.json`

---

## 🏗️ 构建与运行

### 构建 HAP

```
Build → Build Hap(s) → Build Hap(s)
```

或使用快捷键：`Command + F9`

### 运行到模拟器

1. 点击顶部工具栏的 `Device Manager`
2. 创建/选择模拟器（推荐：HarmonyOS NEXT, API 12）
3. 启动模拟器
4. 点击 `Run` 按钮（绿色三角形）或 `Shift + F10`

### 运行到真机（需要调试证书）

1. 连接华为设备（USB）
2. 启用开发者模式和 USB 调试
3. 在设备管理器中信任设备
4. 点击 `Run` 按钮

---

## 🐛 常见问题

### Q1: DevEco Studio 无法打开
**解决**: 
```bash
# 清除缓存
rm -rf ~/Library/Application\ Support/DevecoStudio*
# 重启应用
```

### Q2: SDK 下载失败
**解决**:
1. 检查网络连接
2. 在 Settings → HarmonyOS SDK 中重试
3. 或手动下载：https://developer.huawei.com/consumer/cn/deveco-studio/

### Q3: ohpm install 报错
**解决**:
```bash
# 清除缓存
ohpm cache clean

# 删除依赖重新安装
rm -rf node_modules ohpm-lock.yaml
ohpm install
```

### Q4: 构建报错 "SDK not found"
**解决**:
1. 在 DevEco Studio 中：File → Settings → HarmonyOS SDK
2. 确认 SDK 路径：`~/Library/Huawei/Sdk`
3. 重新下载 SDK 组件

---

## 📚 参考资源

- **DevEco Studio 官方文档**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/deveco-studio-guide-V5
- **HarmonyOS SDK API**: https://developer.huawei.com/consumer/cn/doc/harmonyos-reference/
- **ArkTS 语言指南**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/arkts-guide-V5
- **开发者论坛**: https://developer.huawei.com/consumer/cn/forum/

---

## ✅ 安装完成后

安装完成后，请运行以下命令验证：

```bash
# 检查 DevEco Studio 是否可启动
open -a "Deveco Studio"

# 检查 SDK 是否安装
ls -la ~/Library/Huawei/Sdk

# 检查 ohpm 是否可用
ohpm --version
```

---

**最后更新**: 2026-04-26  
**维护者**: Readmigo CN Team
