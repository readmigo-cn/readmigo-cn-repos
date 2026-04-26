# HarmonyOS 开发环境搭建指南

> **适用平台**: macOS (Apple Silicon / Intel)  
> **目标版本**: HarmonyOS NEXT 5.0+ (API 12+)  
> **创建日期**: 2026-04-26

---

## 系统要求

### 最低配置
- **操作系统**: macOS 12.0+ (Monterey 或更高)
- **CPU**: Intel i5 或 Apple Silicon M1+
- **内存**: 8GB RAM (推荐 16GB+)
- **磁盘**: 50GB 可用空间 (推荐 100GB+)
- **Java**: JDK 17+

### 当前系统状态 ✅
```
macOS: 26.4.1 (Apple Silicon)
Node.js: v24.11.1 ✅
pnpm: 10.11.0 ✅
Java: OpenJDK 17.0.16 ✅
磁盘空间: 171GB 可用 ✅
```

---

## 步骤 1: 注册华为开发者账号

### 1.1 访问华为开发者联盟
```
URL: https://developer.huawei.com/consumer/cn/
```

### 1.2 注册/登录
1. 点击右上角"登录"
2. 使用华为账号登录（没有则注册）
3. 完成实名认证（个人开发者需要身份证，企业需要营业执照）

### 1.3 创建应用
1. 访问 AGC (AppGallery Connect): https://developer.huawei.com/consumer/cn/service/josp/agc/index.html
2. 点击"我的项目" → "添加项目"
3. 项目名称：`Readmigo`
4. 点击"添加应用" → 选择"HarmonyOS 应用"

### 1.4 下载配置文件
1. 进入应用管理页面
2. 下载 `agconnect-services.json`
3. 将文件放置到：`apps/harmony-app/entry/agconnect-services.json`

---

## 步骤 2: 下载和安装 DevEco Studio

### 2.1 下载地址
**官方下载页面**: https://developer.huawei.com/consumer/cn/deveco-studio/

**直接下载链接** (选择最新版本):
```
https://developer.huawei.com/consumer/cn/deveco-studio/
```

### 2.2 安装步骤 (macOS)

```bash
# 1. 下载完成后，解压 DMG 文件
# 2. 拖拽 DevEco Studio 到 Applications 文件夹
# 3. 首次启动 DevEco Studio

# 或者使用命令行安装（如果已下载）
sudo mkdir -p /Applications
sudo cp -R /Volumes/DevecoStudio/DevecoStudio.app /Applications/
```

### 2.3 首次配置
1. 启动 DevEco Studio
2. 导入设置（选择"Do not import settings"）
3. 接受许可协议
4. 选择 UI 主题（推荐 Light）
5. 等待 IDE 初始化完成

---

## 步骤 3: 安装 HarmonyOS SDK

### 3.1 通过 DevEco Studio 安装（推荐）

1. 打开 DevEco Studio
2. 点击 `Welcome` 页面的 `More Settings` → `Settings`
3. 导航到 `HarmonyOS SDK`
4. 勾选以下组件:
   - ✅ **SDK API 12** (或最新版本)
   - ✅ **DevEco-Test** (测试框架)
   - ✅ **Node.js** (内置)
   - ✅ **ohpm** (包管理器)
5. 点击 `Apply` 开始下载和安装

### 3.2 SDK 安装位置
```
macOS: ~/Library/Huawei/Sdk
```

### 3.3 配置 SDK 环境变量
```bash
# 添加到 ~/.zshrc 或 ~/.bash_profile
export HARMONYOS_SDK_HOME="$HOME/Library/Huawei/Sdk"
export PATH="$PATH:$HARMONYOS_SDK_HOME/toolchains"
```

---

## 步骤 4: 配置 ohpm (Open Harmony Package Manager)

### 4.1 检查 ohpm 安装
```bash
# 在 DevEco Studio 终端中运行
ohpm --version
```

### 4.2 配置 ohpm 镜像（中国大陆加速）
```bash
# 设置国内镜像源
ohpm config set registry https://ohpm-openharmony.cn/npm/

# 或者使用华为云镜像
ohpm config set registry https://mirrors.huaweicloud.com/repository/ohpm/
```

### 4.3 验证配置
```bash
ohpm config get registry
```

---

## 步骤 5: 配置签名证书

### 5.1 自动生成签名配置（推荐）

1. 在 DevEco Studio 中打开项目
2. 右键点击 `entry` → `Open Module Settings`
3. 选择 `Signatures`
4. 点击 `+` 添加新签名配置
5. 填写信息:
   - **Alias**: `readmigo`
   - **Password**: (设置密码，记住它)
   - **Validity**: 25 年
   - **Certificate**: 自动生成
6. 点击 `OK` 保存

### 5.2 手动创建签名（可选）

```bash
# 1. 生成密钥库
keytool -genkey -v -keystore readmigo.keystore -alias readmigo -keyalg RSA -keysize 2048 -validity 10000

# 2. 放置到项目目录
# apps/harmony-app/entry/readmigo.keystore
```

### 5.3 配置 build-profile.json5
```json5
{
  "app": {
    "signingConfigs": {
      "readmigo": {
        "type": "HarmonyOS",
        "material": {
          "certpath": "/path/to/readmigo.cer",
          "keyAlias": "readmigo",
          "keyPassword": "your-password",
          "storeFile": "/path/to/readmigo.p7b",
          "storePassword": "your-password"
        }
      }
    }
  }
}
```

---

## 步骤 6: 安装项目依赖

```bash
# 1. 进入项目根目录
cd /Users/HONGBGU/Documents/readmigo-cn-repos

# 2. 安装根依赖
pnpm install

# 3. 进入 harmony-app 目录
cd apps/harmony-app

# 4. 安装鸿蒙应用依赖
ohpm install
```

---

## 步骤 7: 验证开发环境

### 7.1 检查工具链
```bash
# 检查 ohpm
ohpm --version

# 检查 hvigor (鸿蒙构建工具)
hvigor --version

# 检查 Node.js
node --version

# 检查 pnpm
pnpm --version
```

### 7.2 在 DevEco Studio 中验证

1. 打开 DevEco Studio
2. `File` → `Open` → 选择 `/Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app`
3. 等待项目索引完成
4. 点击 `Build` → `Build Hap(s) / APP(s)` → `Build Hap(s)`
5. 如果构建成功，环境配置完成 ✅

---

## 步骤 8: 配置真机调试（可选）

### 8.1 启用开发者模式
1. 打开华为设备设置
2. 进入 `关于手机`
3. 连续点击 `版本号` 7 次，启用开发者模式
4. 返回设置，进入 `系统和更新` → `开发人员选项`
5. 开启 `USB 调试`

### 8.2 连接设备
1. 使用 USB 线连接设备到 Mac
2. 在设备上授权 USB 调试
3. 在 DevEco Studio 中，设备应出现在顶部设备选择器

### 8.3 配置调试证书
1. 访问 https://developer.huawei.com/consumer/cn/service/josp/agc/index.html
2. 进入 `我的项目` → `Readmigo`
3. `添加设备` → 填写设备信息
4. 下载调试证书 (.p7b)
5. 在 DevEco Studio 中导入证书

---

## 常见问题

### Q1: DevEco Studio 下载慢
**解决**: 使用华为云镜像或等待非高峰时段下载

### Q2: SDK 安装失败
**解决**: 
1. 检查磁盘空间
2. 手动下载 SDK 压缩包
3. 在 Settings 中指定 SDK 路径

### Q3: ohpm install 报错
**解决**:
```bash
# 清除缓存
ohpm cache clean

# 删除 node_modules 和 ohpm-lock.yaml
rm -rf node_modules ohpm-lock.yaml

# 重新安装
ohpm install
```

### Q4: 签名证书错误
**解决**:
1. 删除旧签名配置
2. 重新生成签名
3. 确保 build-profile.json5 配置正确

### Q5: 设备无法识别
**解决**:
```bash
# macOS 可能需要安装 USB 驱动
# 访问华为官网下载 HiSuite
# 安装后重启 DevEco Studio
```

---

## 下一步

环境搭建完成后:

1. ✅ 在 DevEco Studio 中打开项目
2. ✅ 运行 `pnpm install` 安装依赖
3. ✅ 配置 `agconnect-services.json`
4. ✅ 构建并运行到模拟器/真机
5. ✅ 开始开发功能

---

## 参考资源

- **DevEco Studio 官方文档**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/deveco-studio-guide-V5
- **HarmonyOS SDK API 参考**: https://developer.huawei.com/consumer/cn/doc/harmonyos-reference/
- **ArkTS 语言指南**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/arkts-guide-V5
- **AGC 服务接入**: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/agc-service-access-V5

---

**最后更新**: 2026-04-26  
**维护者**: Readmigo CN Team
