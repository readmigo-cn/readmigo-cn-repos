# 米果智读 HarmonyOS 品牌与资产管理

## 品牌战略

米果智读是 Readmigo 在国内市场的本地化品牌。本项目采用双品牌策略：

- **国际版（Readmigo）**：紫蓝主调，English reading companion 定位
- **国内版（米果智读）**：中文品牌名，AI 时代的英语阅读伴侣

## 品牌资产来源

所有设计资产集中管理于海外品牌仓库：

```
/Users/HONGBGU/Documents/readmigo-repos/brand/
├── assets/logo/              # Logo 和 wordmark
├── assets/app-icon/          # 应用图标（多平台）
├── assets/favicon/           # 网站 favicon
├── assets/loading/           # 加载动画
├── assets/mascot/            # 吉祥物 Migo
├── assets/store/             # App Store 截图和横幅
└── dist/                      # 编译输出（iOS, Android, Web, CSS）
    ├── android/              # Android 专用输出
    ├── ios/                  # iOS 专用输出
    └── ...
```

目前 `dist/` 中还没有 `harmony/` 输出目录。

## HarmonyOS 所需资产清单

### 应用图标和启动图

| 资源 | 尺寸 | 说明 | 位置 |
|------|------|------|------|
| `app_icon.png` | 108×108 | Adaptive icon（必需） | `AppScope/resources/base/media/` |
| `app_icon_round.png` | 108×108 | 圆角版本（可选） | `AppScope/resources/base/media/` |
| `start_window_background.png` | 1440×3120 | 启动窗口背景 | `entry/src/main/resources/base/media/` |

### Logo 和文字标

| 资源 | 格式 | 用途 | 说明 |
|------|------|------|------|
| `logo_full.svg` | SVG | 米果智读完整 logo | Login 页、About 页 |
| `logo_mark.svg` | SVG | 仅图形 mark | Splash、icon fallback |
| `wordmark_zh.svg` | SVG | 米果智读中文文字标 | 需设计 |
| `wordmark_en.svg` | SVG | Readmigo 英文文字标 | 已有，来自 brand repo |

### 设计资产

- `logo-full.svg` — Readmigo 完整 logo（来自 `brand/assets/logo/`）
- `app-icon.png` — 应用图标（来自 `brand/assets/app-icon/`）

## 资产同步策略

### 当前状态

Brand 仓库的 dist/ 输出尚未包含 HarmonyOS 专用格式。临时方案：

1. **手动拷贝**：使用 `sync-from-brand.sh` 脚本从 brand repo 拷贝适用资产
2. **占位**：未取得的资产用 PLACEHOLDER.md 标记，等待设计团队交付
3. **自动化准备**：脚本已预留扩展点，待 brand repo 生成 `dist/harmony/` 后无缝集成

### 同步脚本使用

```bash
# 从 brand repo 同步资产（需要 brand 先生成 dist/）
./sync-from-brand.sh

# 打开占位检查
cat entry/src/main/resources/base/media/PLACEHOLDER.md
cat AppScope/resources/base/media/PLACEHOLDER.md
```

### Brand Repo 集成计划

待 brand repo 在以下路径生成输出：

```
brand/dist/harmony/
├── app-icon/
│   ├── app_icon.png
│   ├── app_icon_round.png
│   └── ...
├── splash/
│   └── start_window_background.png
├── logo/
│   ├── logo_full.svg
│   ├── logo_mark.svg
│   └── wordmark_*.svg
└── media/
    └── ...
```

## 国内化资产

### 中文品牌元素

- **应用名**：米果智读（已在 string.json 配置）
- **副标题**：AI 时代的英语阅读伴侣
- **中文 Logo**：设计待定
- **中文 Splash 文案**：待交付

### App Store 中文描述

- **推广文**：≤170 字符，强调 AI + 英语阅读 + 离线支持
- **详细描述**：≤4000 字符，覆盖功能、用户群体、优势

## 资源文件位置

| 路径 | 说明 |
|------|------|
| `/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/entry/src/main/resources/base/media/` | Entry module 媒体资源 |
| `/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/AppScope/resources/base/media/` | App-level 图标和资源 |
| `/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/brand/` | 本项目品牌文档和脚本 |

## 相关文档

- `brand/zh-CN-strings.md` — 中文文案规范和统一
- `brand/cn-localization-checklist.md` — 国内化检查清单
- `entry/src/main/resources/base/media/PLACEHOLDER.md` — 媒体资源占位说明
- `AppScope/resources/base/media/PLACEHOLDER.md` — App-level 资源占位说明

## 依赖关系

1. **Design 团队**：提供米果智读 logo、splash 设计
2. **字体授权**：确保中文字体在国内合法使用
3. **商标注册**：米果智读商标（进行中，见 MEMORY.md）
4. **Brand Repo**：HarmonyOS 输出集成
