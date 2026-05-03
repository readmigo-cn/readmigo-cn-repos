# Entry Module 媒体资源占位说明

此文档列出 `entry/src/main/resources/base/media/` 目录所需的所有媒体资源及其规格。

**最后更新**：2026-05-01

## 资源清单

### 应用启动相关

| 资源名 | 尺寸 | 格式 | 说明 | 状态 |
|--------|------|------|------|------|
| `start_window_background.png` | 1080×2400 | PNG | 启动窗口背景（全屏） | 占位（1×1） |

**说明**：启动背景应包含米果智读品牌元素（logo + 文案）。建议使用渐变或纯色背景 + logo 排版。

### Logo 和品牌资源

| 资源名 | 格式 | 用途 | 说明 | 状态 |
|--------|------|------|------|------|
| `logo_full.svg` | SVG | 完整 logo | Login 页、About 页显示 | 待提供 |
| `logo_mark.svg` | SVG | 仅图形 mark | Icon 或小型展示 | 待提供 |
| `wordmark_zh.svg` | SVG | 中文文字标 | 米果智读中文 wordmark | 待提供 |
| `wordmark_en.svg` | SVG | 英文文字标 | Readmigo 英文 wordmark | 待提供 |

**获取方式**：
- 从海外 brand repo 同步：`./brand/sync-from-brand.sh`
- 或由 Design team 直接提供

### 功能和 UI 图标（24×24 px SVG 或 PNG）

#### 导航和通用

| 资源名 | 用途 |
|--------|------|
| `chevron_right.svg` | 右箭头 |
| `chevron_left.svg` | 左箭头 |
| `chevron_down.svg` | 下箭头 |
| `arrow_back.svg` | 返回箭头 |
| `search.svg` | 搜索 |
| `close.svg` | 关闭 |

#### 账户和设置

| 资源名 | 用途 |
|--------|------|
| `person.svg` | 用户头像占位 |
| `settings.svg` | 设置 |
| `logout.svg` | 退出登录 |
| `language.svg` | 语言切换 |
| `email.svg` | 邮箱 |

#### 内容和功能

| 资源名 | 用途 |
|--------|------|
| `book.svg` | 书籍 |
| `bookmark.svg` | 书签 |
| `highlight.svg` | 高亮 |
| `notes.svg` | 笔记 |
| `fire.svg` | 热门 |
| `crown.svg` | 会员/VIP |

#### 媒体控制

| 资源名 | 用途 |
|--------|------|
| `play_arrow.svg` | 播放 |
| `pause.svg` | 暂停 |
| `skip_previous.svg` | 上一首 |
| `skip_next.svg` | 下一首 |
| `replay_10.svg` | 回退 10 秒 |
| `forward_10.svg` | 前进 10 秒 |
| `volume_up.svg` | 音量 |
| `headset.svg` | 耳机 |

#### 反馈和帮助

| 资源名 | 用途 |
|--------|------|
| `help.svg` | 帮助 |
| `feedback.svg` | 反馈 |
| `info.svg` | 信息 |
| `notifications.svg` | 通知 |

#### 数据和状态

| 资源名 | 用途 |
|--------|------|
| `check.svg` | 勾选 |
| `check_circle.svg` | 勾选圆圈 |
| `uncheck_circle.svg` | 未勾选圆圈 |
| `more_vert.svg` | 更多选项 |
| `bar_chart.svg` | 统计图表 |
| `timer.svg` | 计时器 |

#### 网络和同步

| 资源名 | 用途 |
|--------|------|
| `wifi.svg` | WiFi |
| `sync.svg` | 同步 |
| `download.svg` | 下载 |

### 其他资源（按需添加）

#### 插图和装饰

| 资源名 | 尺寸 | 用途 |
|--------|------|------|
| `empty_state_illustration.svg` | 自定义 | 书架空状态插图 |
| `loading_animation.json` | 自定义 | 加载动画（Lottie） |

#### 背景和纹理

| 资源名 | 尺寸 | 用途 |
|--------|------|------|
| `gradient_background.png` | 屏幕分辨率 | 主题背景（可选） |

## 资源规格和最佳实践

### SVG 图标规格

- **尺寸**：24×24 px（大多数图标）
- **颜色**：使用单一颜色（currentColor）以支持主题切换
- **笔触**：2px 推荐
- **导出设置**：移除 Illustrator 或 Sketch 元数据，保持文件轻量

### PNG 图片规格

- **DPI**：72 DPI（标准屏幕分辨率）
- **颜色空间**：RGB（如需透明则 RGBA）
- **优化**：使用 ImageOptim 或 TinyPNG 压缩

### 启动图规格

- **尺寸**：1080×2400 px（HarmonyOS 推荐）
- **宽高比**：9:20（全屏）
- **安全区**：避免在左右各 72px 和上下各 96px 内放置关键信息（系统 UI 留白）

## 当前状态

| 资源类别 | 状态 | 交付方 | 截止日期 |
|---------|------|--------|----------|
| 启动图 | 占位 | Design team | TBD |
| Logo（完整 + 文字标） | 待设计 | Design team | TBD |
| 功能图标集 | 部分（系统 fallback） | Design team | TBD |

## 使用方式

### 在 HarmonyOS 中引用资源

#### 方式 1：使用资源管理器

```typescript
// 引用 media 目录下的图标
Image($r('app.media.logo_full')).width(200).height(100)
Image($r('app.media.play_arrow')).width(24).height(24)
```

#### 方式 2：系统 Fallback（开发时临时用）

```typescript
// 使用系统图标（开发期间）
Image($r('sys.media.ohos_ic_public_search')).width(24).height(24)

// 或使用纯色占位
Rectangle()
  .width(24)
  .height(24)
  .fill('#6200EE')
```

### 添加资源的步骤

1. **准备资源文件**
   - SVG：确保遵循上述规格
   - PNG：压缩优化后上传

2. **复制到项目**
   ```bash
   # 使用同步脚本（推荐）
   ./brand/sync-from-brand.sh
   
   # 或手动复制
   cp /path/to/logo.svg entry/src/main/resources/base/media/
   ```

3. **在 DevEco Studio 中扫描**
   - 右键点击 media 目录
   - 选择 "Analyze" 以识别新资源
   - 编译项目

4. **在代码中使用**
   ```typescript
   Image($r('app.media.logo_full')).width(200)
   ```

## 品牌资产来源

### 海外 Brand Repo

位置：`/Users/HONGBGU/Documents/readmigo-repos/brand/`

当前可用：
- `assets/logo/logo-full.svg` — Readmigo 英文 logo
- `assets/app-icon/` — 应用图标（iOS、Android）
- `assets/mascot/` — Migo 吉祥物

计划中：
- `dist/harmony/` — HarmonyOS 专用输出（待 brand repo 生成）

### 同步流程

```bash
# 检查 brand 输出是否存在
ls -la /Users/HONGBGU/Documents/readmigo-repos/brand/dist/harmony/

# 运行同步脚本
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/apps/harmony-app/
./brand/sync-from-brand.sh
```

## 相关文档

| 文档 | 用途 |
|------|------|
| `brand/README.md` | 品牌和资产管理总览 |
| `brand/zh-CN-strings.md` | 中文文案规范 |
| `brand/cn-localization-checklist.md` | 国内化检查清单 |
| `brand/sync-from-brand.sh` | 资产同步脚本 |

---

**维护者**：Product Team  
**最后更新**：2026-05-01
