# 编译修复指南

> **状态**: ✅ 编译问题已修复  
> **日期**: 2026-04-26  
> **提交**: `803471d`

---

## 🔧 修复内容

### 1. 媒体资源问题修复

**问题**: 所有页面使用 `$r('app.media.*')` 引用缺失的媒体资源文件

**解决**: 
- 创建 `IconPlaceholder.ets` 组件，使用 Emoji 文字替代图标
- 批量替换所有 `$r('app.media.*')` 为 `SimpleIcon` 组件
- 开发期间使用文字图标显示功能

**影响**: 
- ✅ 编译通过
- ⚠️ UI 显示为 Emoji（功能正常，美观度待改进）

### 2. 缺失页面修复

**问题**: `main_pages.json` 引用的 Login 和 Onboarding 页面不存在

**解决**: 创建基础页面组件
- `pages/Login.ets` - 登录页占位
- `pages/Onboarding.ets` - 引导页占位

### 3. 配置文件修复

**build-profile.json5**:
```json5
{
  "modules": [{
    "name": "entry",
    "srcPath": "./entry",
    "buildProfile": {
      "buildOption": {
        "arkOptions": {
          "runtimeOnly": true  // 新增：运行时仅模式
        }
      }
    }
  }]
}
```

**main_pages.json**: 添加 Audiobook 页面
```json
{
  "src": [
    "pages/Index",
    "pages/Login",
    "pages/Onboarding",
    "pages/Discover",
    "pages/Library",
    "pages/Me",
    "pages/Reader",
    "pages/AudiobookTab",
    "pages/AudiobookPlayer"
  ]
}
```

### 4. 新增工具

**IconPlaceholder.ets** - 图标占位组件
```typescript
// 使用方式
SimpleIcon({ name: 'search', size: 24, color: '#1a1a1a' })

// 支持的图标名称
'search' | 'close' | 'edit' | 'delete' | 'settings' | ...
```

---

## ✅ 编译验证

### 在 DevEco Studio 中

1. **打开项目**
   ```
   File → Open → apps/harmony-app
   ```

2. **等待索引完成**
   - 首次打开需要 2-5 分钟
   - 底部状态栏显示 "Indexing..."

3. **构建项目**
   ```
   Build → Build Hap(s)
   或 Command + F9
   ```

4. **预期结果**
   - ✅ 构建成功
   - ✅ 无编译错误
   - ⚠️ 可能有警告（可忽略）

### 命令行验证（需要 DevEco Studio CLI）

```bash
cd apps/harmony-app
hvigorw assembleHap --debug
```

---

## 🎨 UI 改进建议

当前使用 Emoji 替代图标，功能正常但美观度不足。建议后续改进：

### 方式 1: 使用系统图标
```typescript
// 替换 SimpleIcon 为系统图标
Image($r('sys.media.ohos_ic_public_search'))
```

### 方式 2: 添加真实资源文件
1. 准备 SVG/PNG 图标
2. 放置到 `entry/src/main/resources/base/media/`
3. 代码中使用 `$r('app.media.icon_name')`

### 方式 3: 使用 ArkUI 绘制
```typescript
// 简单图标可用 ArkUI 绘制
Path()
  .path('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z')
  .fill('#4CAF50')
```

---

## 📦 下一步配置

### 1. 配置签名证书

```
右键 entry → Open Module Settings → Signatures
添加新签名配置（Alias: readmigo）
```

### 2. 配置 AGC

1. 访问：https://developer.huawei.com/consumer/cn/service/josp/agc/
2. 创建项目和应用
3. 下载 `agconnect-services.json`
4. 放置到：`entry/agconnect-services.json`

### 3. 运行到模拟器

```
Device Manager → 创建模拟器 → 启动
Run → Run 'entry' (Shift + F10)
```

---

## 🐛 常见问题

### Q1: "Module not found" 错误
**解决**: 
```bash
cd apps/harmony-app
ohpm install
```

### Q2: "SDK not configured" 错误
**解决**:
1. File → Settings → HarmonyOS SDK
2. 确认 SDK 路径：`~/Library/Huawei/Sdk`
3. 下载缺失的 SDK 组件

### Q3: "Signing config not found" 错误
**解决**:
1. 右键 entry → Open Module Settings
2. Signatures → 添加签名
3. 配置证书和密码

### Q4: 构建卡在 90%
**解决**:
```bash
# 清理构建缓存
cd apps/harmony-app
hvigorw clean

# 重新构建
hvigorw assembleHap
```

---

## 📊 编译状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Discover | ✅ | 编译通过 |
| Library | ✅ | 编译通过 |
| Reader | ✅ | 编译通过 |
| Me | ✅ | 编译通过 |
| AudiobookTab | ✅ | 编译通过 |
| AudiobookPlayer | ✅ | 编译通过 |
| Login | ✅ | 编译通过 |
| Onboarding | ✅ | 编译通过 |

---

## 📝 后续优化

### Phase 1 (立即)
- [ ] 添加真实应用图标
- [ ] 配置签名证书
- [ ] 配置 AGC

### Phase 2 (短期)
- [ ] 替换 Emoji 为 SVG 图标
- [ ] 添加启动页背景图
- [ ] 优化 UI 细节

### Phase 3 (中期)
- [ ] 接入真实 API
- [ ] 实现后台音频播放
- [ ] 集成 TTS 服务

---

**最后更新**: 2026-04-26  
**维护者**: Readmigo CN Team
