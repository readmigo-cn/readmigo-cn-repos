# DevEco Studio 真机部署 SOP

> 本文档规范米果智读在 HarmonyOS 真机上的本地开发、部署与调试流程。  
> 目标读者：开发工程师、QA 工程师  
> 创建日期：2026-05-01

---

## 1. 概述与目标

本 SOP 涵盖以下场景：

| 场景 | 目标 | 用户 |
|------|------|------|
| 首次部署 | 从零到一把应用运行在真机上 | 新加入的工程师 |
| 迭代开发 | 快速验证代码修改 | 日常开发工程师 |
| 真机调试 | 定位崩溃、性能、兼容性问题 | QA / 性能优化工程师 |
| 多设备适配 | 一键验证多个设备的显示 / 功能 | 测试团队 |

---

## 2. 前置条件检查清单

### 2.1 开发机环境

- [ ] DevEco Studio 5.0+ 已安装
  ```bash
  which deveco || echo "DevEco not found"
  ```

- [ ] JDK 17+ 已安装
  ```bash
  java -version
  # 应显示 Java 17 或更高版本
  ```

- [ ] HarmonyOS NEXT SDK 已下载（对应版本，如 API 12+）
  - 在 DevEco 中检查：`Settings → SDK Manager → SDK Versions`

- [ ] Node.js 18+ 与 pnpm 已安装（用于 ArkTS 依赖）
  ```bash
  node --version && pnpm --version
  ```

### 2.2 真机设备

- [ ] HarmonyOS 4.0+ 或 HarmonyOS NEXT
  - 在设置中确认：`Settings → About Phone → Version`

- [ ] 已开启开发者选项
  ```
  Settings → About Phone → tap "Build Number" 7 times
  → Developer Options appears
  ```

- [ ] 已开启 USB 调试
  ```
  Settings → Developer Options → USB Debugging → ON
  ```

- [ ] 已允许信任当前连接的开发机
  - 连接后，真机会显示信任提示，点击"允许"

### 2.3 签名证书

- [ ] 调试证书已生成（参见 `docs/deployment/01-harmonyos-signing.md`）
- [ ] 当前连接的设备 UDID 已添加到 Debug Profile
- [ ] DevEco 已识别签名配置
  - 在 `File → Project Structure → Signing Configs` 中验证

---

## 3. 真机连接

### 3.1 USB 连接（推荐首次连接方式）

**第 1 步**：用 USB-C 线连接真机与开发机

**第 2 步**：开启 USB 调试模式

在真机端设置：
```
Settings → Developer Options → USB Debugging → ON
USB Connection Mode → File Transfer / Charge & Transfer
```

**第 3 步**：验证连接

```bash
hdc list targets
```

**预期输出**：
```
Connected Devices

Device ID                  Status  Device Name
-------                   ------  -----------
FA6AY1A0181001XX          Online  Mate60Pro
```

若显示 `Offline`，检查以下：
1. 真机上的信任提示是否已点击"允许"
2. 对 USB 线的稳定性进行检查
3. 在真机重新开启 USB 调试

### 3.2 WiFi 调试（无线连接）

**前提**：真机与开发机在同一 WiFi 网络

**第 1 步**：先用 USB 连接一次（建立信任）

**第 2 步**：在真机上获取 IP 地址

```
Settings → About Phone → IP Address
# 记下 IP，例如 192.168.1.100
```

**第 3 步**：启用 WiFi 调试

```bash
hdc shell setprop persist.hdc.usb.en 0
hdc shell setprop persist.hdc.wifi.en 1
hdc shell getprop ro.hdc.wifi.port
# 通常返回 10000 或类似端口
```

**第 4 步**：连接到真机

```bash
hdc connect 192.168.1.100:10000
# 或简写
hdc connect 192.168.1.100
```

**第 5 步**：验证

```bash
hdc list targets
```

**优势 / 劣势**：
- ✅ 便于开发机移动
- ✅ 多设备同时连接更灵活
- ❌ WiFi 延迟可能比 USB 高
- ❌ 网络不稳定时易断连

### 3.3 多设备同时调试（Multi-Device）

若多台真机已连接，DevEco 会自动列出所有设备。

在 `Run` 或 `Debug` 时选择目标设备：

```
Run → Select Device → 选择目标设备 → OK
```

或通过命令行指定：

```bash
hdc -t <Device ID> install readmigo.hap
```

---

## 4. 首次部署（First Run）

### 4.1 打开项目

```
File → Open → /Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app
```

DevEco 会自动加载项目配置。

### 4.2 Sync 依赖

点击 IDE 顶部的 `Sync Now`（若 `build.gradle` 等文件变更）

或使用菜单：
```
File → Sync Project → Sync Now
```

**这一步会**：
- 下载 HarmonyOS SDK 依赖
- 解析 ohpm 第三方包
- 编译 ArkTS / C++ 代码

**预期耗时**：3-10 分钟（首次），后续 1-2 分钟（增量）

**若卡顿**：
- 检查网络连接
- 更新依赖镜像：`~/.npmrc` 中确认使用 `https://registry.npmmirror.com/`

### 4.3 配置签名

打开 `File → Project Structure → Signing Configs`

- **Debug**：应指向 `auto-generated`（DevEco 自动管理）
- **Release**：应指向 AGC 申请的发布证书

点击 `Apply` 保存。

### 4.4 选择运行设备并部署

点击 `Run` 按钮（或 Ctrl+R / Cmd+R）

1. **若只有一台设备连接**：
   - DevEco 自动选择该设备
   - 编译 + 签名 + 安装 + 启动

2. **若多台设备连接**：
   - 弹出设备选择对话框
   - 选择目标设备
   - 继续编译 + 部署

**预期输出**：

在 DevEco 的 Build 和 Logcat 窗口中：

```
Build Success
Installing APK...
Installation successful
Starting app...
App started: com.readmigo.harmony.cn
```

### 4.5 首次运行遇到的常见弹窗

| 弹窗 | 操作 |
|------|------|
| **"信任此应用？"** | 点击 **Allow** / **信任** |
| **"允许应用发送通知？"** | 根据需要选择 Allow / Deny |
| **"开发者选项警告"** | 点击 **Proceed** / **继续** |
| **"安装来源未知的应用"** | 进入 Settings → Security，启用 `Allow Installation from Unknown Sources` |

完成后，应用应在真机上启动，显示米果智读的启动页面。

---

## 5. 日常迭代循环（Development Cycle）

### 5.1 修改代码后快速重新部署

**修改代码** → **保存** → **点击 Run 按钮**

DevEco 会：
1. 增量编译（仅重新编译修改的文件）
2. 自动签名（调试证书）
3. 卸载旧版本应用
4. 安装新版本
5. 自动启动

**耗时**：15-45 秒（取决于修改量）

### 5.2 热重载（Hot Reload）⭐

若修改的仅为 ArkTS UI 代码（不涉及 C++ 或核心逻辑），可使用热重载：

**DevEco 5.0+ 支持**：
- 修改代码 → Ctrl+Shift+R（Win） / Cmd+Shift+R（Mac）
- 应用在真机上立即刷新，**无需重新安装**

**不支持热重载的修改**：
- C++ 原生代码（typesetting / badge-engine 的 .so 改动）
- 权限声明 / 配置文件变更
- 模块结构变更

若热重载失败，回退到常规 Run（完整重装）。

### 5.3 保留数据的重新部署

默认情况下，卸载应用会清除本地数据。若要保留数据重新部署：

```bash
# 方法 1：使用 adb（如果安装了 Android Tools）
adb shell pm install-multiple --keep-data readmigo.hap

# 方法 2：使用 hdc 的 force-stop（不卸载）
hdc shell am force-stop com.readmigo.harmony.cn
# 然后再次点击 Run，会覆盖安装而不清除数据
```

---

## 6. 真机调试工具与功能

### 6.1 查看应用日志（Logcat）

DevEco 的 **Logcat** 窗口实时显示来自真机的日志。

**打开 Logcat**：
```
View → Tool Windows → Logcat
```

**按应用进程过滤**：
```
// 在 Logcat 搜索框中输入
com.readmigo.harmony.cn
```

**按日志等级过滤**：
- Verbose（V）：所有消息
- Debug（D）：调试信息
- Info（I）：普通信息
- Warning（W）：警告
- Error（E）：错误

**ArkTS 日志输出示例**（从代码中）：

在 ArkTS / ArkUI 代码中：
```typescript
import { hilog } from '@kit.PerformanceAnalysisKit';

hilog.info(0x0001, 'readmigo', 'User opened book: %s', bookId);
```

对应的 Logcat 输出：
```
D/readmigo: User opened book: book123
```

### 6.2 断点调试

**设置断点**：
- 在代码编辑器的行号边距点击，或按 Ctrl+F8

**启动调试**：
- 点击 `Debug` 按钮（不是 `Run`）
- DevEco 会暂停在第一个断点

**调试操作**：
| 快捷键 | 操作 |
|--------|------|
| **F8** | 跳过当前行（Step Over） |
| **F7** | 进入函数（Step Into） |
| **Shift+F8** | 退出函数（Step Out） |
| **F9** | 继续执行（Continue） |

**查看变量值**：
- 在 `Debug Console` 窗口中悬停鼠标查看，或添加到 Watch

### 6.3 ArkTS / JavaScript 代码调试

DevEco 内置 **ArkTS Debugger**，可调试 ArkUI 代码：

1. 点击 `Debug` 按钮启动
2. 应用启动后，打开 `Debug Console`
3. 可在 ArkTS 代码中设置断点

### 6.4 C++ 原生代码调试（NDK）

若需调试 typesetting / badge-engine 的 C++ 代码：

**前提**：
- 编译时使用 Debug 配置（不是 Release）
- `.so` 文件包含调试符号（Debug symbols）

**启动 C++ 调试**：
1. 在 C++ 代码中设置断点
2. 点击 `Debug` 启动
3. DevEco 会调用 `lldb`（LLVM Debugger）
4. 在 `Debug Console` 中查看 C++ 调用栈

**常见命令**：
```
(lldb) bt           # 打印调用栈
(lldb) print var    # 打印变量值
(lldb) continue     # 继续执行
```

### 6.5 性能分析（Profiler）

DevEco 内置性能分析工具，可监控：
- **CPU 使用率**
- **内存占用**
- **FPS（帧率）**
- **网络 I/O**
- **电池耗电**

**打开 Profiler**：
```
View → Tool Windows → Profiler
```

**启动性能记录**：
1. 点击 `Record` 按钮
2. 在真机上操作应用（例如翻页、滑动）
3. 点击 `Stop` 停止记录
4. 分析性能数据

**关键指标**：
| 指标 | 目标 | 警告阈值 |
|------|------|---------|
| **FPS** | 60 FPS | < 50 FPS（卡顿） |
| **内存** | < 150 MB | > 200 MB（泄漏） |
| **CPU** | < 30% | > 80%（过载） |

---

## 7. 真机日志与日志导出

### 7.1 实时日志查看

使用 `hdc` 命令查看真机 hilog：

```bash
hdc shell hilog
# 或过滤特定标签
hdc shell hilog | grep readmigo
```

### 7.2 日志导出

将真机日志导出到本地文件供分析：

```bash
hdc shell hilog > readmigo-device-log.txt
# 或指定导出时长（如 10 秒）
hdc shell hilog -n 1000 > crash-log.txt
```

### 7.3 崩溃日志收集

当应用崩溃时，HarmonyOS 会生成 crash dump。查看方法：

**在 DevEco Logcat 中查找**：
```
// 搜索关键字
SIGSEGV
SIGABRT
Crash
Exception
```

**导出完整 crash 日志**：

```bash
# 列出所有崩溃日志
hdc shell ls /data/log/faultlog/

# 导出特定 crash 文件
hdc file recv /data/log/faultlog/crash_20260501_120000.log ./
```

### 7.4 应用生成的内部日志文件

米果智读在开发期可在应用内生成日志文件（存于 App Sandbox）：

```
/data/data/com.readmigo.harmony.cn/files/logs/
```

**导出内部日志**：

```bash
hdc file recv /data/data/com.readmigo.harmony.cn/files/logs/ ./readmigo-logs/
```

---

## 8. 截图与录屏

### 8.1 截图

**方式 1**：使用 hdc 命令

```bash
hdc shell screencap /tmp/screenshot.png
hdc file recv /tmp/screenshot.png ./screenshot.png
```

**方式 2**：真机快捷键（通常为音量键 + 电源键）

具体组合因设备而异，参见真机使用手册。

### 8.2 录屏

**启动录屏**：

```bash
hdc shell screenrecord /tmp/screen.mp4
# Ctrl+C 停止
```

**下载录屏文件**：

```bash
hdc file recv /tmp/screen.mp4 ./screen.mp4
```

**调整录屏参数**（分辨率、比特率）：

```bash
hdc shell screenrecord --size 1440x3200 --bit-rate 8000000 /tmp/screen.mp4
```

---

## 9. 多机部署与自动化测试

### 9.1 一键部署到所有连接的设备

需求：同时在多台真机上安装和运行应用。

**脚本示例**（Bash）：

```bash
#!/bin/bash
# deploy-all-devices.sh

# 获取所有已连接设备
devices=$(hdc list targets | grep "Online" | awk '{print $1}')

for device in $devices; do
    echo "Deploying to $device..."
    hdc -t $device install apps/harmony-app/build/outputs/default/readmigo.hap
    hdc -t $device shell am start com.readmigo.harmony.cn/.MainActivity
    echo "Deployed to $device ✓"
done

echo "All devices deployed!"
```

**使用方法**：

```bash
chmod +x deploy-all-devices.sh
./deploy-all-devices.sh
```

### 9.2 真机测试矩阵

根据 `docs/devices/procurement-list.md` 中的设备清单，建立测试矩阵：

| 设备 | 屏幕尺寸 | HarmonyOS 版本 | 核心测试项 |
|------|---------|--------|---------|
| Mate 60 Pro | 6.7" | NEXT | 基础功能 + UI 质量 |
| P70 | 6.5" | NEXT | 中档性能 |
| Pura 70 | 6.8" | NEXT | 备用验证 |
| Honor Magic 6 Pro | 6.6" | 4.0+ | 生态兼容性 |
| MatePad Pro 13.2" | 13.2" | NEXT | 大屏阅读 |
| MatePad 11.5" | 11.5" | NEXT | 平板文本换行 |
| Mate X5（折叠） | 6.4/8.0" | NEXT | 折叠屏切换 |

**自动化回归检查清单**：
- [ ] 应用启动无崩溃（所有 7 台设备）
- [ ] 阅读功能正常（翻页、字体切换）
- [ ] typesetting 排版无乱码
- [ ] 内存占用 < 150 MB（长时间阅读）
- [ ] FPS 稳定 60（UI 流畅度）

---

## 10. 常见问题与故障排查

### 问题 1：真机连不上（hdc list targets 无显示）

**症状**：
```
Connected Devices
(empty)
```

**排查步骤**：

1. **确认 USB 数据线**：
   - 使用原装或高质量数据线
   - 尝试不同 USB 接口

2. **真机端检查**：
   - 是否开启 USB 调试？`Settings → Developer Options → USB Debugging`
   - 是否已点击"允许信任此设备"的弹窗？

3. **开发机端检查**：
   - 是否安装了 DevEco Studio？
   - `which hdc` 确认 hdc 命令可用
   - 若未找到，手动添加到 PATH：
     ```bash
     export PATH=$PATH:/Applications/DevEco\ Studio.app/Contents/tools/hdc
     ```

4. **重启 USB 调试**：
   ```bash
   hdc stop
   hdc start
   hdc list targets
   ```

5. **重启真机**：
   ```
   Settings → Power → Restart
   ```

---

### 问题 2：安装 HAP 失败（Installation failed）

**症状**：
```
Installation failed
Error: INSTALL_FAILED_NO_MATCHING_ABIS
```

**可能原因与解决**：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `INSTALL_FAILED_NO_MATCHING_ABIS` | HAP 中的 .so 文件架构与设备不匹配 | 重新编译，确认 `abiFilters` 包含设备架构（arm64-v8a 等） |
| `INSTALL_FAILED_INVALID_APK` | HAP 包损坏或签名错误 | 重新编译，验证签名证书 |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | 尝试安装更低版本 | 在真机上卸载旧版本，或增加 versionCode |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | 设备存储不足 | 删除旧文件或应用，腾出空间 |

**调试命令**：

```bash
# 查看设备存储情况
hdc shell df

# 卸载之前的版本
hdc uninstall com.readmigo.harmony.cn

# 清理缓存
hdc shell rm -rf /data/data/com.readmigo.harmony.cn/
hdc shell rm -rf /data/cache/com.readmigo.harmony.cn/
```

---

### 问题 3：应用启动后立即崩溃（黑屏或闪退）

**症状**：
- 应用安装成功
- 点击启动后，3-5 秒内白屏或黑屏后退出

**排查步骤**：

1. **查看 crash 日志**：
   ```bash
   hdc shell hilog | grep "SIGSEGV\|SIGABRT\|Exception"
   ```

2. **常见原因**：
   - C++ 引擎（typesetting）加载失败 → 检查 `.so` 文件是否完整
   - 权限问题 → 检查 `permissions` 声明
   - 初始化失败 → 检查 ArkTS 代码中 `onCreate()` 的错误

3. **增加调试日志**：
   在 ArkTS 启动代码中添加：
   ```typescript
   import { hilog } from '@kit.PerformanceAnalysisKit';
   
   hilog.info(0x0001, 'readmigo', 'AppScope.onCreate called');
   // ... 逐步添加日志，定位崩溃位置
   ```

4. **检查 native bridge 加载**：
   ```typescript
   // 在模块初始化代码中
   try {
     napi.load('typesetting'); // 加载 native module
     hilog.info(0x0001, 'readmigo', 'Native module loaded successfully');
   } catch (e) {
     hilog.error(0x0001, 'readmigo', 'Native module load failed: %s', e.message);
   }
   ```

---

### 问题 4：typesetting（排版引擎）渲染乱码或崩溃

**症状**：
- 应用运行正常，但某些书籍的文本显示为乱码
- 或者特定的排版场景导致应用崩溃

**排查步骤**：

1. **确认 .so 文件是否加载**：
   ```bash
   hdc shell find /data/app/ -name "libtypesetting.so"
   ```

2. **检查字体文件是否存在**：
   ```bash
   hdc shell ls -la /system/fonts/ | grep -i noto
   ```

3. **查看 C++ 调试日志**：
   - 使用 `hdc shell hilog | grep typesetting`
   - 或在 C++ 代码中添加日志输出

4. **在 Mate 60 Pro 上复现**：
   - 作为旗舰设备，应首先验证此设备是否复现问题
   - 若只在部分设备上出现，可能是字体或系统版本差异

---

### 问题 5：真机性能不达预期（FPS 低于 60）

**症状**：
- 翻页或滑动时卡顿
- DevEco Profiler 显示 FPS 在 30-50 之间

**排查与优化**：

1. **找出性能瓶颈**：
   - 在 DevEco Profiler 中记录性能数据
   - 查看 CPU / 内存 / GPU 哪个最先打满

2. **常见优化方向**：
   | 瓶颈 | 优化方案 |
   |------|---------|
   | CPU 过高 | 减少 ArkUI 刷新频率；优化排版算法 |
   | 内存泄漏 | 检查事件监听是否释放；清理缓存 |
   | GPU 过高 | 减少透明度混合；优化动画 |

3. **使用真机对标**：
   - 在 Mate 60 Pro 上测试性能基线
   - 若基线也低于 60 FPS，则需代码优化
   - 若基线达到 60 FPS，其他设备的卡顿可能是硬件限制

---

### 问题 6：C++ 引擎加载失败（NAPI Bridge）

**症状**：
```
Error: Failed to load native module 'typesetting'
```

**排查步骤**：

1. **确认编译产物**：
   ```bash
   find apps/harmony-app -name "libtypesetting.so"
   ```

2. **检查 NAPI 绑定**：
   在 `napi-bridge/` 目录中，确认 `index.ts` 正确导出了 typesetting 函数

3. **验证 HAP 打包**：
   ```bash
   # 解开 HAP 包（HAP 本质是 ZIP）
   unzip -l apps/harmony-app/build/outputs/default/readmigo.hap | grep libtypesetting.so
   ```

4. **查看加载错误日志**：
   ```bash
   hdc shell hilog | grep "dlopen\|symbol not found"
   ```

---

## 11. 快速命令对照表

### hdc 基础命令

| 命令 | 说明 |
|------|------|
| `hdc list targets` | 列出已连接设备 |
| `hdc connect <IP>:<PORT>` | WiFi 连接 |
| `hdc shell param get ro.serialno` | 获取设备 UDID |
| `hdc install <HAP>` | 安装应用 |
| `hdc uninstall <bundleName>` | 卸载应用 |
| `hdc shell am start <bundleName>/<Activity>` | 启动应用 |
| `hdc shell am force-stop <bundleName>` | 强制停止应用 |

### hdc 调试命令

| 命令 | 说明 |
|------|------|
| `hdc shell hilog` | 查看实时日志 |
| `hdc shell screencap <path>` | 截图 |
| `hdc shell screenrecord <path>` | 录屏 |
| `hdc file recv <remote> <local>` | 从设备拉取文件 |
| `hdc file send <local> <remote>` | 上传文件到设备 |
| `hdc shell verify <HAP>` | 验证 HAP 签名 |

### DevEco 快捷键

| 快捷键 | 操作 |
|--------|------|
| **Ctrl+R** / **Cmd+R** | Run（编译 + 部署 + 启动） |
| **Ctrl+D** / **Cmd+D** | Debug（调试模式运行） |
| **Ctrl+Shift+R** / **Cmd+Shift+R** | Hot Reload（ArkTS UI 热重载） |
| **Ctrl+F8** | 设置 / 取消断点 |
| **Ctrl+Shift+F10** | 重新运行 |

---

## 12. 米果智读 项目特定步骤

### 12.1 首次部署前的关键检查

1. **确认 native 模块已编译**：
   ```bash
   ls -la apps/harmony-app/build/intermediates/libs/*/libtypesetting.so
   ls -la apps/harmony-app/build/intermediates/libs/*/libbadge_engine.so
   ```

2. **确认 NAPI bridge 可用**：
   ```bash
   grep -r "typesetting" napi-bridge/index.ts
   ```

3. **运行一次完整编译**（不只是增量）：
   在 DevEco 中：`Build → Rebuild Project`

### 12.2 调试 typesetting 排版问题

若遇到文本渲染异常：

1. **在米果真机（Mate 60 Pro）上首先复现**
2. **启用排版引擎日志**：
   在 `native/typesetting/src/` 中找到排版初始化代码，添加调试输出
3. **导出崩溃 dump**：
   ```bash
   hdc shell ls /data/log/faultlog/ | grep readmigo
   hdc file recv /data/log/faultlog/crash*.log ./
   ```

### 12.3 验证 native bridge 加载成功

在应用启动的 ArkTS 代码（`AppScope/app.ets`）中添加：

```typescript
import { hilog } from '@kit.PerformanceAnalysisKit';

function verifyNativeBridge() {
  try {
    // 尝试调用 typesetting 的简单函数
    const result = typesetting.getVersion?.();
    hilog.info(0x0001, 'readmigo', 'Native bridge OK: version %s', result);
    return true;
  } catch (e) {
    hilog.error(0x0001, 'readmigo', 'Native bridge ERROR: %s', e.message);
    return false;
  }
}

// 在 app.onCreate() 中调用
if (!verifyNativeBridge()) {
  hilog.warn(0x0001, 'readmigo', 'Native bridge verification failed, app may crash');
}
```

---

## 13. 崩溃上报与远程诊断

### 13.1 集成 Sentry 错误追踪

米果智读已集成 Sentry 用于崩溃上报（参见 `docs/deployment/` 其他文档）。

真机上的崩溃会自动上报到 Sentry 项目 `readmigo-harmony` 中。

**查看上报的崩溃**：
1. 登录 Sentry：https://sentry.readmigo.app/
2. 选择项目：`readmigo-harmony`
3. 查看 `Issues` 标签页

### 13.2 本地崩溃日志与远程同步

若设备离线时发生崩溃，可先导出本地日志再手动上报：

```bash
hdc shell hilog > crash-log.txt
# 将此文件附加到 GitHub Issues 或 Sentry
```

---

## 14. 检查清单（真机部署）

完整的真机部署验证清单：

- [ ] 真机 USB 连接成功，`hdc list targets` 显示设备
- [ ] 真机开启 USB 调试 + 信任开发机
- [ ] 调试证书已配置，DevEco `Project Structure` 中签名可见
- [ ] `Sync Now` 完成，依赖已下载
- [ ] 首次 `Run` 成功，应用在真机上启动
- [ ] 应用启动后，Logcat 无崩溃日志（无 SIGSEGV / SIGABRT）
- [ ] 验证 native bridge（typesetting 正常加载）
- [ ] 尝试基本功能（阅读、翻页、设置字体）
- [ ] 检查 FPS 与内存占用（Profiler 显示 60 FPS，内存 < 150 MB）
- [ ] 拍照截图与录屏正常工作
- [ ] 多设备部署脚本已备好（用于后续 QA 回归）

---

## 参考资源

- **HarmonyOS NEXT 开发指南**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/
- **DevEco Studio 文档**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-overview
- **hdc 调试工具**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/hdc-overview
- **应用签名**：`docs/deployment/01-harmonyos-signing.md`

