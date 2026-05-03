# AppScope 媒体资源占位说明

此文档列出 `AppScope/resources/base/media/` 目录所需的应用级媒体资源及其规格。

**最后更新**：2026-05-01

## 资源清单

### 应用图标（必需）

| 资源名 | 尺寸 | 格式 | 说明 | 状态 | 来源 |
|--------|------|------|------|------|------|
| `app_icon.png` | 108×108 | PNG | 应用主图标（Adaptive icon） | 待提供 | Design team / brand repo |
| `app_icon_round.png` | 108×108 | PNG | 圆角版本（可选） | 待提供 | Design team |

### 应用徽章（可选）

| 资源名 | 尺寸 | 格式 | 说明 | 状态 |
|--------|------|------|------|------|
| `app_badge.png` | 72×72 | PNG | 桌面徽章/通知图标 | 待提供 |

## 资源规格和设计指南

### 应用图标规格（108×108 px）

#### 设计原则

1. **Adaptive Icon 支持**
   - HarmonyOS 使用 Adaptive Icon 标准，与 Material Design 3 一致
   - 图标分为两层：**背景层** 和 **前景层**
   - 两层都是 108×108 px，系统会在运行时进行动画变形

2. **安全区**
   - 中心圆形：66×66 px（系统会显示此范围）
   - 关键内容避免出现在 108×108 边界外

3. **颜色和风格**
   - 使用米果智读品牌色（建议使用 brand tokens）
   - 保持简洁，易于识别
   - 避免过细的线条（<2px）

4. **圆角和透明度**
   - 支持圆角（HarmonyOS 系统自动应用）
   - 支持透明（RGBA）

#### 设计示例（文字描述）

```
[应用图标布局示例]
┌─────────────────┐
│                 │
│   ┌───────────┐ │
│   │  66×66    │ │  <-- 安全区（中心圆形）
│   │  [Logo/   │ │      系统保证显示
│   │   Mark]   │ │
│   └───────────┘ │
│                 │  <-- 动画变形范围
│                 │      系统可能裁剪此区域
└─────────────────┘
    108×108 px
```

### 应用徽章规格（72×72 px）

- **用途**：通知中心、快捷方式的小图标
- **颜色**：与主图标保持一致
- **简化程度**：比主图标更简化

## 从 Brand Repo 同步

### 位置

海外 brand repo 的应用图标位置：
```
/Users/HONGBGU/Documents/readmigo-repos/brand/assets/app-icon/
├── android/          # Android 专用
├── ios/              # iOS 专用
├── web/              # Web 专用
├── app-icon.png      # 通用（108×108）
└── icon-1024.png     # 高分辨率版本
```

### 同步脚本

运行：
```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/
./brand/sync-from-brand.sh
```

脚本会自动复制 `brand/dist/harmony/app-icon/app_icon.png` 到此目录（如存在）。

### 手动复制

如果脚本无法运行或 brand repo 尚未生成 harmony 输出：

```bash
# 从 brand repo 手动复制通用图标
cp /Users/HONGBGU/Documents/readmigo-repos/brand/assets/app-icon/app-icon.png \
   /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/AppScope/resources/base/media/app_icon.png
```

## AppScope 配置验证

### app.json5 中的图标引用

位置：`AppScope/app.json5`

当前配置：
```json5
{
  "app": {
    "icon": "$media:app_icon",
    "label": "$string:app_name"
  }
}
```

验证：
- `$media:app_icon` 引用 `AppScope/resources/base/media/app_icon.png` ✓
- `$string:app_name` 在各语言 string.json 中已定义
  - zh_CN: "米果智读"
  - en_US: "Readmigo"
  - base: "Readmigo"

### string.json 应用名验证

**zh_CN** (`entry/src/main/resources/zh_CN/element/string.json`)：
```json
{ "name": "app_name", "value": "米果智读" }
```
✓ 正确

**en_US** (`entry/src/main/resources/en_US/element/string.json`)：
```json
{ "name": "app_name", "value": "Readmigo" }
```
✓ 正确

**base** (`entry/src/main/resources/base/element/string.json`)：
```json
{ "name": "app_name", "value": "Readmigo" }
```
✓ 正确（默认值）

## 当前状态

| 资源 | 状态 | 优先级 | 交付方 | 截止日期 |
|------|------|--------|--------|----------|
| `app_icon.png` | 待提供 | P0（必需） | Design team | TBD |
| `app_icon_round.png` | 待提供 | P2（可选） | Design team | TBD |
| `app_badge.png` | 待提供 | P2（可选） | Design team | TBD |

## 国内化特殊考虑

### 米果智读品牌图标

应用图标应体现米果智读品牌特点：

- **保留 Readmigo 核心色彩**（紫蓝渐变或类似）
- **融入阅读和 AI 元素**（书籍、灯泡、芯片等）
- **简洁国际化设计**（避免过度装饰）
- **中文适配**（如需加中文字，需圆润字体）

**设计建议**：
1. 保持与 iOS/Android 应用图标的视觉一致性
2. 尊重 HarmonyOS Adaptive Icon 安全区规范
3. 测试在真实设备上的显示效果（不同制造商可能有微妙差异）

## 测试清单

- [ ] 编译 HarmonyOS 项目后，应用图标在启动器中正确显示
- [ ] 图标在 108×108 尺寸下清晰可见
- [ ] 图标在真实华为设备上的显示与设计稿一致
- [ ] 应用名称（米果智读）与图标搭配美观
- [ ] 通知中心中的小图标（如有）清晰可辨

## 相关文档

| 文档 | 用途 |
|------|------|
| `brand/README.md` | 品牌和资产管理总览 |
| `brand/cn-localization-checklist.md` | 国内化检查清单 |
| `brand/sync-from-brand.sh` | 资产同步脚本 |
| `entry/src/main/resources/base/media/PLACEHOLDER.md` | Entry module 资源占位 |

## 参考资料

### HarmonyOS 官方指南

- Adaptive Icon：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/adaptive-icon-0000001667688681
- 应用图标规范：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/icon-design-guide-0000001667586597

### Material Design 3（参考）

- Adaptive Icon：https://material.io/design/motion/adaptive-icon.html

---

**维护者**：Product Team  
**最后更新**：2026-05-01
