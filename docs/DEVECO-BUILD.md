# DevEco Studio 构建指南

> **最后更新**: 2026-04-26  
> **当前提交**: `ab71af7`

---

## ✅ 已修复问题

### 1. Hvigorfile not found
- ✅ 添加 `entry/hvigorfile.ts`
- ✅ 修复项目 `hvigorfile.ts`

### 2. Hvigor 版本不匹配
- ✅ 移除显式的 `@ohos/hvigor` 版本依赖
- ✅ 使用 DevEco Studio 内置的 hvigor 版本

### 3. 媒体资源缺失
- ✅ 使用 `IconPlaceholder` 组件替代
- ✅ 所有页面编译通过

---

## 🚀 构建步骤

### 方式 A: DevEco Studio GUI（推荐）

1. **关闭项目**（如果已打开）
   ```
   File → Close Project
   ```

2. **清理缓存**（重要！）
   ```
   在终端运行:
   cd /Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app
   rm -rf .hvigor/cache/*
   ```

3. **重新打开项目**
   ```
   File → Open → 选择 apps/harmony-app
   ```

4. **等待同步完成**
   - 底部状态栏显示 "Syncing..." 或 "Indexing..."
   - 首次需要 2-5 分钟

5. **构建项目**
   ```
   Build → Build Hap(s)
   或按 Command + F9
   ```

6. **预期结果**: ✅ 构建成功

---

### 方式 B: 命令行

```bash
cd /Users/HONGBGU/Documents/readmigo-cn-repos/apps/harmony-app

# 清理缓存
rm -rf .hvigor/cache/*
rm -rf node_modules

# 使用 DevEco Studio 内置 hvigor 构建
/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw.js --mode project assembleApp
```

---

## 📋 配置文件说明

### oh-package.json5 (Root)
```json5
{
  "modelVersion": "6.1.0",
  "name": "readmigo-harmony-app",
  "version": "0.1.0",
  "dependencies": {}  // 不显式指定 hvigor 版本
}
```

### oh-package.json5 (Entry)
```json5
{
  "name": "entry",
  "version": "0.1.0",
  "dependencies": {}  // 不显式指定 hvigor 版本
}
```

### hvigorfile.ts (Project)
```typescript
import { appTasks } from '@ohos/hvigor-ohos-plugin';

export default {
    system: appTasks,
    plugins: []
}
```

### hvigorfile.ts (Module/Entry)
```typescript
import { hapTasks } from '@ohos/hvigor-ohos-plugin';

export default {
    system: hapTasks,
    plugins: []
}
```

---

## 🐛 常见错误及解决

### 错误 1: Hvigorfile not found
**解决**: 确认 `entry/hvigorfile.ts` 存在

### 错误 2: No matching version found for @ohos/hvigor
**解决**: 
- 移除 `oh-package.json5` 中的 hvigor 依赖
- 使用 DevEco Studio 内置版本
- 清理缓存：`rm -rf .hvigor/cache/*`

### 错误 3: SDK not configured
**解决**:
1. File → Settings → HarmonyOS SDK
2. 确认 SDK 路径
3. 下载缺失的 SDK 组件

### 错误 4: Signing config not found
**解决**:
1. 右键 entry → Open Module Settings
2. Signatures → 添加签名配置

---

## 📊 构建状态

| 组件 | 状态 |
|------|------|
| hvigorfile.ts (project) | ✅ |
| hvigorfile.ts (entry) | ✅ |
| oh-package.json5 (root) | ✅ |
| oh-package.json5 (entry) | ✅ |
| hvigor-config.json5 | ✅ |
| 页面资源 | ✅ |
| 颜色资源 | ✅ |
| main_pages.json | ✅ |

---

## 📝 下一步

构建成功后：

1. **配置签名证书**
   ```
   右键 entry → Open Module Settings → Signatures
   添加新签名（Alias: readmigo）
   ```

2. **配置 AGC**
   - 访问 AGC 控制台创建应用
   - 下载 `agconnect-services.json`
   - 放置到 `entry/agconnect-services.json`

3. **运行到模拟器**
   ```
   Device Manager → 创建模拟器
   Run → Run 'entry' (Shift + F10)
   ```

---

## 🔗 参考文档

- [DevEco Studio 构建配置](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/deveco-studio-build-V5)
- [Hvigor 使用指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/hvigor-guide-V5)
- [oh-package.json5 配置](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/oh-package-json5-V5)

---

**最后更新**: 2026-04-26  
**维护者**: Readmigo CN Team
