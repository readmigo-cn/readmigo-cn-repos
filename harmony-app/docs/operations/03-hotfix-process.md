# 紧急修复流程（Hotfix）

**版本**: 1.0
**更新**: 2026-05-01
**适用**: 生产环境严重 Bug 修复

---

## 快速概览

| 阶段 | 时间 | 检查点 |
|------|------|--------|
| 评估 | 15 min | 问题确认、修复可行性 |
| 修复 | 30-120 min | 代码修改、本地验证 |
| 测试 | 30 min | 回归测试、性能检查 |
| 上架 | 2-4 hours | 华为加急审核、灰度发布 |

---

## 第一部分：Hotfix 评估

### 1.1 什么情况下启动 Hotfix

**触发条件（满足任一）：**

1. **生产环境 Bug**
   - 崩溃率 > 5% (需立即修复)
   - 用户关键路径不可用 (登录、支付、阅读)
   - 数据丢失或损坏风险

2. **安全漏洞**
   - 用户隐私泄露
   - 未授权访问风险

3. **合规问题**
   - ICP 备案号显示错误
   - 隐私政策链接失效

**不需要 Hotfix 的情况：**
- ❌ UI 显示错误（可在下个版本修复）
- ❌ 功能迟钝但仍可使用（可优化但不紧急）
- ❌ 低于 1% 的小众用户问题

### 1.2 可行性评估

**问卷清单：**

```
【问题确认】
- [ ] 问题已在生产环境复现？
- [ ] 影响用户数量 > 1%？
- [ ] 问题的严重程度 (P0/P1/P2)？
- [ ] 根本原因已识别？

【修复复杂度】
- [ ] 修复涉及的文件数 (< 5 个为最佳)？
- [ ] 是否需要修改数据库 schema？
- [ ] 是否需要修改 API 接口？
- [ ] 预估修复时间 (< 2 hours)？

【风险评估】
- [ ] 修复代码是否足够稳定？
- [ ] 是否会引入新的 bug？
- [ ] 修复是否需要用户操作？
- [ ] 是否可以灰度发布？

【发布计划】
- [ ] 华为应用市场是否支持加急审核？
- [ ] iOS App Store 审核周期是否可控？
- [ ] 是否需要跨平台发布？
```

**决策标准：**

| 复杂度 | 修复时间 | 决策 |
|--------|---------|------|
| 简单 | < 1 hour | ✅ 启动 Hotfix |
| 中等 | 1-2 hours | ✅ 启动 Hotfix（需评估） |
| 复杂 | > 2 hours | ⚠️ 考虑等待下个版本或暂时降级 |
| 极复杂 | > 4 hours | ❌ 等待下个版本，先执行降级 |

### 1.3 修复方案评估

**三个备选方案：**

```
【方案 A】代码修复 + 加急上架 （推荐）
- 时间：2-4 小时
- 风险：低
- 效果：永久解决问题

【方案 B】临时降级功能 + 后续修复
- 时间：30 分钟
- 风险：极低
- 效果：快速止血，后续版本修复

【方案 C】回滚到上一个版本
- 时间：5-10 分钟
- 风险：低
- 效果：放弃新版本的所有功能，恢复稳定状态
```

---

## 第二部分：代码修复流程

### 2.1 代码修改

**步骤 1：创建 Hotfix 分支**

```bash
# 从 main 分支拉出 hotfix 分支
git checkout main
git pull origin main

# 创建 hotfix 分支
git checkout -b hotfix/crash-on-startup

# 分支命名规范：hotfix/[简短描述]
```

**步骤 2：定位并修复 Bug**

```bash
# 在 Sentry 中查看错误堆栈
# 位置：service/AppInitializer.ets, 第 42 行

# 错误代码：
const config = JSON.parse(data); // data 为 null 时崩溃

# 修复代码：
const config = data ? JSON.parse(data) : {};
```

**修复示例：**

```arkts
// ❌ 原代码（容易崩溃）
export class AppInitializer {
  static async initialize(): Promise<void> {
    const response = await fetch('https://api.readmigo.cn/config');
    const data = await response.text();
    
    // Bug: 若 data 为 null，JSON.parse 会抛异常
    const config = JSON.parse(data);
    
    // 若到这里，config 可能是 undefined
    this.setConfig(config);
  }
}

// ✅ 修复后代码
export class AppInitializer {
  static async initialize(): Promise<void> {
    try {
      const response = await fetch('https://api.readmigo.cn/config', {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.text();
      
      // 修复 1：检查 null
      const config = data ? JSON.parse(data) : {};
      
      // 修复 2：检查空对象
      if (Object.keys(config).length === 0) {
        console.warn('Empty config, using defaults');
      }
      
      this.setConfig(config);
    } catch (error) {
      console.error('Init failed:', error);
      // 降级方案：使用默认配置
      this.setConfig({});
    }
  }
}
```

**步骤 3：提交修改**

```bash
# 查看修改
git diff

# 暂存文件
git add entry/src/main/ets/service/AppInitializer.ets

# 提交（使用清晰的消息）
git commit -m "fix(init): prevent null pointer exception when config is empty

- Add null check before JSON.parse
- Add error handling with fallback to defaults
- Add logging for debugging

Fixes: CRASH-001
"
```

### 2.2 版本号更新

**更新版本号：**

```
原版本：1.0.0 (Build 1)
↓
Hotfix：1.0.1 (Build 1)  ← 小版本号递增
```

**在项目配置中更新：**

```json5
// entry/src/main/module.json5
{
  "module": {
    "name": "entry",
    "versionCode": 2,        // 递增
    "versionName": "1.0.1",  // 递增小版本
    ...
  }
}
```

**确保版本一致性：**

```bash
# 检查所有地方都更新了版本号
grep -r "1.0.0" . --include="*.json5" --include="*.gradle"

# 应该都改为 1.0.1
```

---

## 第三部分：测试与验证

### 3.1 本地测试

**快速验证（15 分钟）：**

```bash
# 1. 构建 Release 版本
hvigorw assemble -p product=default --mode release

# 2. 安装到模拟器或真机
hdc install entry/build/default/outputs/default/entry-default-release-signed.hap

# 3. 重现原 Bug，验证已修复
# 原 Bug：启动应用时崩溃
# 预期结果：应用正常启动
```

**验证清单：**

```
【启动与初始化】
- [ ] 应用启动时间 < 3 秒
- [ ] 无崩溃日志（检查 logcat）
- [ ] 没有新的异常堆栈

【核心功能】
- [ ] 可以登录
- [ ] 可以阅读书籍
- [ ] 可以使用朗读功能

【修复验证】
- [ ] 原 Bug 已修复（多次测试）
- [ ] 没有引入新 Bug

【性能检查】
- [ ] 内存占用正常 (< 150MB)
- [ ] 无内存泄漏迹象
- [ ] 帧率稳定 (> 50fps)
```

### 3.2 回归测试

**自动化测试：**

```bash
# 运行 Unit Tests
npm run test:unit

# 运行 Integration Tests
npm run test:integration

# 覆盖率检查（可选）
npm run test:coverage
```

**关键路径手工测试：**

```
【登录流程】
- 快速注册 → 验证码 → 登录 ✅

【阅读流程】
- 进入首页 → 选择书籍 → 开始阅读 → 翻页 ✅

【朗读流程】
- 打开朗读 → 调整速度 → 后台播放 ✅

【内购流程】
- 打开订阅页面 → 选择套餐 → 完成购买 ✅
```

### 3.3 灾难场景测试

**网络不稳定场景：**

```bash
# 使用 Chrome DevTools 模拟网络延迟
hdc shell settings put global http_proxy 127.0.0.1:8888
# 或使用 Fiddler 限流

# 测试应用是否能正确处理超时
```

**内存紧张场景：**

```bash
# 模拟内存压力
hdc shell am send-trim-memory com.readmigo.harmony RUNNING_CRITICAL

# 观察应用是否保持稳定
```

---

## 第四部分：构建与签名

### 4.1 构建 Release HAP

```bash
# 从项目根目录执行
hvigorw assemble -p product=default --mode release

# 输出位置
# → entry/build/default/outputs/default/entry-default-release-signed.hap

# 验证文件
ls -lh entry/build/default/outputs/default/*.hap
```

### 4.2 签名验证

**检查签名证书：**

```bash
# 查看签名信息
jarsigner -verify -verbose entry-default-release-signed.hap

# 应该显示：
# → Main-Class 正确
# → 签名证书有效
# → 时间戳正确
```

### 4.3 文件完整性检查

```bash
# 计算 MD5 值（用于应用市场验证）
md5sum entry-default-release-signed.hap

# 记录 MD5：
# abc123def456... entry-default-release-signed.hap
```

---

## 第五部分：应用市场上架

### 5.1 华为应用市场加急上架

**正常上架时间：** 3-5 个工作日
**加急上架时间：** 12-24 小时（需申请）

**步骤 1：登录后台**

```
https://developer.huawei.com/consumer/cn/appstore
→ 应用管理 → 应用 → 米果智读
```

**步骤 2：新建版本**

```
版本管理 → 新建版本

版本号：1.0.1
构建号：1
应用文件：entry-default-release-signed.hap
```

**步骤 3：更新版本说明**

```markdown
v1.0.1 紧急修复版

【修复内容】
- 修复：应用启动时偶现崩溃问题
- 改进：优化初始化流程，提升稳定性

【建议更新】
为确保最佳使用体验，建议所有用户更新到此版本。
```

**步骤 4：提交审核**

```
确认信息无误 → 提交审核

审核单号：[记录下来]
提交时间：2026-05-01 15:30
预计完成：2026-05-02 15:30
```

**步骤 5：申请加急审核**

若审核超过 2 小时未通过，可申请加急：

```
进入「消息」或「工作单」
→ 提交加急申请

【申请理由】
类型：Bug 修复
描述：
应用在生产环境发现严重 Bug，
影响 > 10% 的用户。
现已修复，请求加急审核以恢复用户体验。

Bug 详情：[简述 bug]
修复内容：[简述修复]
影响用户数：约 5,000 人
```

### 5.2 iOS App Store 更新（如有 iOS 版本）

**类似流程：**

```
App Store Connect
→ 版本管理
→ 新建版本 1.0.1
→ 上传 HAP (或转换后的 IPA)
→ 提交审核
```

**不支持加急，正常审核 24-48 小时**

### 5.3 监控上架进度

**日报：**

```
【Hotfix 上架进度】2026-05-01

版本：v1.0.1 (修复启动崩溃)
提交时间：14:00
状态：审核中

预期：
- 华为应用市场：预计 15:30 通过审核（加急）
- iOS App Store：提交后预计 24-48 小时

用户影响：
- 当前崩溃率：12.5%（需降低至 < 1%）
- 受影响用户数：约 6,000 人（未更新）
```

---

## 第六部分：灰度发布与验证

### 6.1 灰度发布策略

**三波发布：**

```
第一波 (T+0)：5% 用户
  │
  ├─ 监控 5 分钟
  ├─ 若无新 crash，进入第二波
  └─ 若有新 crash，暂停并回滚

第二波 (T+5)：25% 用户
  │
  ├─ 监控 5 分钟
  ├─ 若无新问题，进入第三波
  └─ 若有问题，暂停并通知用户

第三波 (T+10)：100% 用户
  │
  ├─ 持续监控 30 分钟
  ├─ 确保无问题
  └─ 标记发布完成
```

### 6.2 灰度期间监控指标

**每 1 分钟检查一次：**

| 指标 | 目标 | 告警阈值 |
|------|------|---------|
| 崩溃率 | < 1% | > 2% 立即暂停 |
| 新 Issue 数 | 0 | > 0 立即暂停 |
| API 错误率 | < 2% | > 5% 拦截 |
| 平均响应时间 | < 200ms | > 500ms 监控 |

**监控工具：**

```bash
# Sentry 实时监控
# → 打开 Issues 面板
# → 按时间倒序排列
# → 观察是否有新 issue 出现

# 应用市场反馈
# → 华为应用市场后台 → 应用评论
# → 观察是否有新的"崩溃"、"无法启动"投诉
```

### 6.3 暂停 / 回滚决策

**暂停灰度发布：**

```
若发现新问题（崩溃率 > 2%）：

1. 立即暂停灰度发布
2. 通知 Incident Commander
3. 回滚到上个版本
4. 分析新引入的 Bug
5. 修复 Bug，重新发布
```

**回滚命令：**

```bash
# 华为应用市场后台
版本管理 → 已上架版本 → 下架版本 1.0.1
# 或立即重新上架 1.0.0

# 告知用户
"暂时恢复到 v1.0.0，我们正在完善 v1.0.1，
预计 2 小时后重新发布。"
```

---

## 第七部分：用户通知策略

### 7.1 强制更新提示

**应用内弹窗（仅针对 P0 Bug）：**

```arkts
// entry/src/main/ets/pages/Index.ets

@Entry
@Component
struct IndexPage {
  @State showUpdateDialog: boolean = false;

  aboutToAppear() {
    this.checkForUpdate();
  }

  async checkForUpdate() {
    const remoteVersion = await this.getLatestVersion();
    const currentVersion = this.getCurrentVersion();

    if (remoteVersion > currentVersion) {
      this.showUpdateDialog = true;
    }
  }

  build() {
    if (this.showUpdateDialog) {
      AlertDialog.show({
        title: '重要更新',
        message: '我们修复了一个影响使用的问题，请立即更新。',
        buttons: [
          {
            text: '现在更新',
            isDefault: true,
            onPress: () => {
              this.openAppStore(); // 打开应用市场
            }
          }
        ],
        cancel: () => {
          // 不允许用户跳过 P0 级别的更新
        }
      });
    }
  }
}
```

**应用市场推送（华为支持）：**

```
在应用市场后台配置版本更新策略：
→ 版本管理 → 版本 1.0.1
→ 「更新提示方式」→ 选择「强制更新」
→ 这样用户打开应用时会强制提示更新
```

### 7.2 邮件 / 社交媒体通知

**邮件通知：**

```
主题：米果智读 v1.0.1 紧急修复版已发布

尊敬的用户，

我们已修复了应用启动时的严重问题。
新版本 v1.0.1 已在应用市场发布。

【问题说明】
用户在启动应用时可能遇到应用崩溃的问题，
现已彻底修复。

【建议更新】
为获得最佳体验，请立即更新应用到 v1.0.1。
更新方式：打开应用市场 → 搜索"米果智读" → 更新

【补偿方案】
为感谢您的耐心，我们赠送：
- 1 个月免费 Pro 订阅
- 自动添加到您的账户

如有任何问题，请通过应用内反馈联系我们。

谢谢！
米果智读团队
```

**微博通知：**

```
@米果智读官方

【更新公告】v1.0.1 已发布 🎉

我们已修复了用户反馈的应用启动问题。
新版本已在华为应用市场发布。

📲 立即更新获得最佳体验
💝 感谢您的反馈，赠送 1 个月 Pro 订阅

感谢支持！#米果智读
```

---

## 第八部分：验证与关闭

### 8.1 修复验证清单

```
【修复效果验证】

发布后 24 小时：
- [ ] 崩溃率从 12.5% 降至 < 1% ✅
- [ ] 无新的错误堆栈出现 ✅
- [ ] 用户反馈转向正面 ✅
- [ ] 应用市场评分上升 ✅

发布后 7 天：
- [ ] 崩溃率持续稳定 < 1% ✅
- [ ] 用户满意度评分 > 4.0 ✅
- [ ] 无相关 Bug 反馈 ✅
```

### 8.2 Hotfix 总结

**发布后记录：**

```markdown
# Hotfix v1.0.1 总结

## 基本信息
- 发布日期：2026-05-01
- 版本：1.0.1
- 修复时间：1 小时 15 分钟
- 审核时间：1 小时 30 分钟（加急）

## 问题描述
应用启动时偶现崩溃（NullPointerException），
影响约 6,000 个用户（12.5% 的活跃用户）。

## 根本原因
AppInitializer.initialize() 方法在处理网络超时时，
未正确处理空值，导致 JSON.parse(null) 崩溃。

## 修复内容
- 添加 null 检查
- 改进异常处理逻辑
- 添加降级方案

## 修复复杂度
- 低（只需修改 1 个方法）
- 修复代码行数：5 行
- 潜在风险：无

## 效果评估
- 发布前崩溃率：12.5%
- 发布后崩溃率：< 0.5%（目标达成）
- 用户评分：4.2 → 4.5
- 总体满意：✅

## 学习要点
1. 需要更强的网络异常处理
2. 应添加初始化阶段的压力测试
3. 考虑实施金丝雀发布自动回滚机制

## 后续改进
- [ ] 强化初始化阶段的单元测试
- [ ] 建立网络超时的压力测试
- [ ] 优化灰度发布的自动回滚机制
```

---

## 检查清单：完整的 Hotfix 流程

```
【评估阶段】
- [ ] 问题已在生产确认
- [ ] 根本原因已识别
- [ ] 修复复杂度已评估（< 2 hours）
- [ ] Incident Commander 已批准启动 Hotfix

【代码修复】
- [ ] 创建 hotfix 分支
- [ ] 代码修改已完成
- [ ] 版本号已更新（1.0.1）
- [ ] 提交信息清晰

【测试】
- [ ] 本地验证通过
- [ ] 原 bug 已修复
- [ ] 无新 bug 引入
- [ ] 性能指标正常

【构建】
- [ ] Release HAP 已生成
- [ ] 签名验证通过
- [ ] 文件完整性检查通过
- [ ] MD5 已记录

【上架】
- [ ] 华为应用市场后台版本已创建
- [ ] 版本说明已填写
- [ ] HAP 已上传
- [ ] 审核已提交
- [ ] 若需要，加急申请已提交

【灰度】
- [ ] 灰度发布已启动
- [ ] 5% 用户验证通过 (5 min)
- [ ] 25% 用户验证通过 (5 min)
- [ ] 100% 用户发布完成

【验证】
- [ ] 崩溃率已从 X% 降至 < 1%
- [ ] 用户反馈已转向正面
- [ ] 应用市场评分已上升
- [ ] 修复验证通过

【通知】
- [ ] 内部团队已通知
- [ ] 邮件已发送用户
- [ ] 社交媒体已更新
- [ ] 应用内弹窗已显示

【总结】
- [ ] Hotfix 总结已记录
- [ ] RCA 会议已排期
- [ ] 改进措施已分配
```

---

**本 SOP 最后更新：** 2026-05-01
**责任人：** Engineering Lead
**相关文档：** 紧急事件响应 SOP, 用户反馈处理 SOP
