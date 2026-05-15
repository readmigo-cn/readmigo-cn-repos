# HarmonyOS 应用签名证书申请 SOP

> 本文档规范米果智读 (com.readmigo.harmony.cn) 的签名证书申请、管理与验证流程。  
> 目标读者：开发工程师、技术负责人  
> 创建日期：2026-05-01

---

## 1. 背景与概述

HarmonyOS 应用上架华为应用市场（AppGallery）前，**必须**完成应用签名。签名机制确保：

- **身份认证**：证明应用发布者身份
- **完整性保护**：防止应用被篡改
- **信任链**：建立用户与开发者的信任关系

米果智读采用**两阶段签名策略**：
- **调试阶段**（开发 / QA 测试）：本地调试证书 + 特定设备 UDID
- **发布阶段**（上架 / 生产）：华为签发的发布证书 + 应用市场分发

---

## 2. 前置条件

### 2.1 企业账号与实名认证

在启动签名证书申请前，需完成以下步骤：

1. **华为开发者账号**（企业认证）：
   - 账号主体：北京瑞光科技有限公司（已完成企业实名认证）
   - 账号状态：已通过审核
   - 账号角色：Admin（可申请证书）

2. **AppGallery Connect 项目创建**：
   - 项目名称：`Readmigo CN`
   - 应用包名（bundleName）：`com.readmigo.harmony.cn`
   - 应用名称：米果智读
   - 数据处理区域：中国（华东）

### 2.2 DevEco Studio 环境

- DevEco Studio 5.0+（含证书管理工具）
- HarmonyOS NEXT SDK 已下载
- JDK 17+ 已安装（`java -version` 确认）

### 2.3 真机设备（仅调试证书需要）

- 华为真机已连接（USB / WiFi）
- 开启开发者选项 + USB 调试
- 获取设备 UDID（用于调试证书绑定）

---

## 3. 证书类型详解

### 3.1 调试证书（Debug Certificate）

**用途**：开发期本地安装与测试

| 属性 | 值 |
|------|-----|
| 有效期 | 1 年 |
| 绑定设备 | 特定 UDID（最多 100 台/年） |
| 签名密钥 | 本地存储（私钥不离开本地） |
| 分发 | 仅支持真机 USB / WiFi 部署 |
| 备注 | 过期后需重新申请；不影响发布证书 |

**何时使用**：
- 首次本地运行应用
- 修改代码后快速迭代测试
- QA 真机功能验证

### 3.2 发布证书（Release Certificate）

**用途**：上架华为应用市场

| 属性 | 值 |
|------|-----|
| 有效期 | 根据申请，通常 1-3 年 |
| 绑定设备 | 无（面向所有用户） |
| 签名密钥 | **华为托管**（用户不持有） |
| 分发 | 应用市场、测试分发（内测）、自签分发 |
| 备注 | 由华为生成与签发；密钥永久保管 |

**何时使用**：
- 应用上架前最后一次编译
- 灰度测试版本
- 正式发布版本

### 3.3 Provisioning Profile（配置文件）

**用途**：声明应用与设备的绑定关系

| 类型 | 作用 | 绑定对象 |
|------|------|---------|
| Debug Profile | 调试部署 | bundleName + 设备 UDID 列表 |
| Release Profile | 应用市场分发 | bundleName + 应用市场分发权限 |

---

## 4. 证书申请流程（DevEco Studio 自动化方式）⭐ **推荐**

### 4.1 初次配置

**第 1 步**：启动 DevEco Studio，打开米果智读项目

```
File → Open → readmigo-cn-repos/harmony-app
```

**第 2 步**：打开项目结构配置

```
File → Project Structure → Signing Configs
```

**第 3 步**：点击 `Auto-Generate` 按钮

- DevEco 会自动调用华为 AGC API
- 获取企业账号绑定的证书 / Profile
- 若不存在，则自动创建

**第 4 步**：选择签名配置

| 配置项 | Debug | Release |
|--------|-------|---------|
| **Certificate** | Auto-generated | From AppGallery Connect |
| **Profile** | Debug Profile（自动生成） | Release Profile（自动生成） |
| **签名方式** | 本地签名 | 华为云签名 |

**第 5 步**：验证与保存

- DevEco 会在项目本地生成签名配置文件（`.deveco/signing/` 目录）
- 确认 `build-profile.json5` 中 `signingConfigs` 已配置
- 点击 `Apply` 保存配置

### 4.2 日常迭代

每次构建时，DevEco 会自动选择合适的签名证书：

```
Run 按钮 → 真机部署（自动用 Debug 证书签名）
Build Release HAP → 自动用 Release 证书签名
```

---

## 5. 证书申请流程（手动方式）

### 5.1 适用场景

- DevEco 自动化失败
- 需要更精细的证书控制
- 多人协作需共享证书

### 5.2 生成 CSR 文件（证书签名请求）

在本地生成 CSR 文件（使用 JDK 自带 `keytool`）：

```bash
cd ~/.deveco/signing/
keytool -certreq -alias readmigo \
  -file readmigo.csr \
  -keystore readmigo.jks \
  -storepass readmigo2024 \
  -keypass readmigo2024
```

**参数说明**：
- `-alias`：密钥别名（建议使用 bundleName 的简写）
- `-file`：输出 CSR 文件路径
- `-keystore`：本地 keystore 文件
- `-storepass`：keystore 密码
- `-keypass`：密钥密码

### 5.3 在 AGC 后台申请证书

1. **登录 AppGallery Connect**：https://developer.huawei.com/consumer/cn/agconnect/

2. **导航到证书管理**：
   ```
   项目 → 应用 → 证书管理 → 新建证书
   ```

3. **填写证书信息**：
   - 证书别名：`readmigo-release-2026`
   - 证书类型：Release Certificate
   - CSR 文件：上传第 5.2 步生成的 CSR

4. **提交申请**：
   - 华为审核（1-3 个工作日）
   - 等待邮件通知

### 5.4 下载证书

审核通过后，AGC 后台会生成：

- **`readmigo.cer`**：证书文件（公钥）
- **`readmigo.p7b`**：证书链（包含中间证书）
- **密钥库密码**：邮件通知

### 5.5 导入证书到本地

```bash
keytool -import -alias readmigo \
  -file readmigo.cer \
  -keystore ~/.deveco/signing/readmigo.jks \
  -storepass readmigo2024
```

### 5.6 创建 Provisioning Profile

在 AGC 后台创建对应的 Profile：

| Profile 类型 | 关键配置 |
|-------------|---------|
| **Debug Profile** | bundleName = `com.readmigo.harmony.cn`；UDID 列表 = 开发设备 UDID |
| **Release Profile** | bundleName = `com.readmigo.harmony.cn`；分发权限 = 应用市场 |

**获取设备 UDID**：

在已连接的华为真机上运行：

```bash
hdc shell param get ro.serialno
```

或在 DevEco Studio 的 Device Manager 中查看。

---

## 6. 米果智读 签名配置参数

### 6.1 基础信息

| 参数 | 值 |
|------|-----|
| **bundleName** | `com.readmigo.harmony.cn` |
| **vendor** | `Readmigo CN` |
| **versionCode** | 从 `harmony-app/AppScope/app.json5` 读取 |
| **versionName** | 同上 |

### 6.2 签名配置文件位置

```
harmony-app/.deveco/signing/
├── readmigo-debug.p12          # 调试证书
├── readmigo-debug.jks          # 调试密钥库
├── readmigo-release.p12        # 发布证书
├── readmigo-release.jks        # 发布密钥库
└── profiles/
    ├── debug-profile.json      # 调试 Profile
    └── release-profile.json    # 发布 Profile
```

**注意**：`.deveco/` 文件夹已添加到 `.gitignore`，不会被版本控制追踪。

### 6.3 真机调试设备列表

在第一阶段采购中（参见 `docs/devices/procurement-list.md`），计划采购以下设备：

| 设备型号 | 用途 | UDID（待获取） | 备注 |
|---------|------|---------|------|
| Huawei Mate 60 Pro（主） | 主开发机 | — | HarmonyOS NEXT 旗舰 |
| Huawei Mate 60 Pro（备） | 对标参考 | — | 同型号备用 |
| Huawei P70 | 中端性能测试 | — | 代表中档用户 |
| Huawei Pura 70 | 直板备用 | — | 备用主力机 |
| Honor Magic 6 Pro | 兼容性测试 | — | 鸿蒙生态验证 |

**设备采购到货后需完成的操作**：
1. 开启开发者选项 + USB 调试
2. 连接到开发机，运行 `hdc shell param get ro.serialno` 获取 UDID
3. 将 UDID 添加到 `harmony-app/.deveco/signing/debug-profile.json`
4. 在 AGC 后台更新 Debug Profile

### 6.4 签名密码管理

**开发机本地存储**（.gitignore）：

```
~/.deveco/signing/keystore-password.txt
# 内容：readmigo:readmigo2024
```

**CI/CD 环境（GitHub Secrets）**：

| Secret 名称 | 内容 | 用途 |
|-----------|------|------|
| `RELEASE_CERT_BASE64` | 发布证书 base64 编码 | CI 自动签名 |
| `RELEASE_KEYSTORE_PASSWORD` | 发布密钥库密码 | CI 解密证书 |
| `RELEASE_KEY_ALIAS` | 密钥别名（`readmigo`） | CI 指定密钥 |

---

## 7. 签名验证 SOP

### 7.1 在 DevEco Studio 中验证

编译完成后，DevEco 会自动验证签名。如果签名异常，会在 Build 日志中显示错误信息。

### 7.2 使用 `hdc` 命令验证

将编译生成的 HAP 包安装到真机后，验证签名：

```bash
hdc shell verify /data/local/tmp/readmigo.hap
```

**预期输出**：

```
Signature verified successfully
```

### 7.3 在 AGC 发布前验证

上传 HAP 到应用市场发布渠道前，AGC 会自动验证签名。若签名不匹配，会拒绝上传。

---

## 8. 常见问题与故障排查

### 问题 1：调试证书过期

**症状**：
- DevEco 编译时提示 `Certificate expired`
- 真机部署失败

**解决方案**：
1. 删除过期证书：`~/.deveco/signing/readmigo-debug.p12`
2. 重新运行 DevEco `Auto-Generate`
3. 若需保持相同的 UDID 列表，在 AGC 后台创建新的 Debug Profile

---

### 问题 2：设备 UDID 超过 100 台限额

**背景**：HarmonyOS 规定每个开发账号每年最多绑定 100 台设备。

**症状**：
- 添加新设备时，AGC 提示 `Device limit exceeded`

**解决方案**：
1. 删除不再使用的旧设备 UDID
2. 申请提升设备配额（联系华为开发者支持）
3. 或创建第二个企业账号（需额外审批）

---

### 问题 3：密钥库密码遗忘

**症状**：
- 重新导入证书时，提示密码错误

**解决方案**：
1. 联系华为开发者支持，申请证书重置
2. 重新执行第 5.2-5.6 步（手动申请流程）

---

### 问题 4：发布证书签名与调试证书不一致

**症状**：
- 应用在某些设备上显示"来源不明"的警告
- 或用户无法升级从调试版本到发布版本

**原因**：
- 调试与发布使用了不同的密钥库

**解决方案**：
1. 确认 DevEco `Project Structure` 中 Debug 与 Release 配置指向不同密钥库
2. 发布版本前，**务必**用正确的 Release 密钥库签名
3. 若已发布了错误签名的版本，需要更新 versionCode + 重新发布

---

### 问题 5：CI/CD 环境中的签名失败

**症状**：
- GitHub Actions / GitEE Actions 编译失败，提示证书错误

**原因**：
- GitHub Secrets 中的证书 base64 编码有误
- 或 keystore 密码与环境变量不匹配

**解决方案**：
1. 验证 base64 编码：
   ```bash
   openssl base64 -d -in cert.b64 -out cert.cer
   ```
2. 确认环境变量中密码正确无特殊字符转义问题
3. 参考 CI 构建日志中的证书验证输出

---

## 9. 多人协作的证书共享方案

### 场景

团队中有多位开发工程师，需要在本地运行与部署米果智读。

### 方案

1. **不共享密钥库**（推荐）：
   - 每个工程师生成自己的调试证书 + 密钥库
   - 在 AGC Debug Profile 中添加自己的设备 UDID
   - 缺点：需维护多个 Profile；优点：密钥本地化，安全性高

2. **共享发布密钥库**（谨慎使用）：
   - 发布密钥库放在 CI/CD Secret 中
   - 本地开发不需持有密钥
   - 仅在 CI 中使用
   - 优点：发布流程集中控制；缺点：密钥共享风险增加

### 推荐做法

- **调试阶段**：每个开发工程师本地生成调试证书
- **发布阶段**：仅在 CI/CD 流程中使用发布证书（GitHub Secrets）
- **密钥备份**：发布密钥库离线备份，由技术负责人管理

---

## 10. 附录：常用命令速查

### keytool 常用命令

**生成密钥库**：
```bash
keytool -genkey -alias readmigo -keyalg RSA -keysize 2048 \
  -keystore readmigo.jks -validity 365 -storepass readmigo2024
```

**查看密钥库信息**：
```bash
keytool -list -v -keystore readmigo.jks -storepass readmigo2024
```

**导出证书**：
```bash
keytool -export -alias readmigo -keystore readmigo.jks \
  -file readmigo.cer -storepass readmigo2024
```

### hdc 命令

**列出已连接设备**：
```bash
hdc list targets
```

**获取设备 UDID**：
```bash
hdc shell param get ro.serialno
```

**安装 HAP 包**：
```bash
hdc install readmigo.hap
```

**验证 HAP 签名**：
```bash
hdc shell verify /data/local/tmp/readmigo.hap
```

---

## 11. 时间估算与关键路径

| 任务 | 耗时 | 备注 |
|------|------|------|
| DevEco 自动化申请 | 5-15 分钟 | 首次配置 |
| 华为审核（手动方式） | 1-3 工作日 | 正常情况 |
| 加急审核 | 24 小时 | 需联系华为支持 |
| 设备 UDID 添加 | 实时 | 无审核延迟 |
| 总体首次周期 | 2-4 天 | 从申请到可部署 |

---

## 12. 检查清单

上架前的签名与证书验证清单：

- [ ] DevEco Studio 5.0+ 已安装
- [ ] 华为开发者账号已企业认证
- [ ] bundleName = `com.readmigo.harmony.cn` 已在 AGC 创建
- [ ] Debug Profile 已创建，UDID 列表已更新
- [ ] Release Profile 已创建
- [ ] 调试证书签名验证通过（真机部署无错误）
- [ ] 发布证书签名验证通过（`hdc verify` / `keytool -list` 输出正常）
- [ ] CI/CD 环境的签名密钥已配置到 GitHub Secrets
- [ ] 本地密钥库已备份离线（发布密钥库）
- [ ] 团队协作方案已确定（共享 vs 独立密钥库）

---

## 参考资源

- **华为开发者文档**：https://developer.huawei.com/consumer/cn/doc/app/101487001
- **AppGallery Connect 证书管理**：https://developer.huawei.com/consumer/cn/agconnect/certmanage/
- **DevEco Studio 签名配置**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/app-signing-0000001578961215
- **HarmonyOS 应用上架指南**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/app-publishing-0000001578961152

