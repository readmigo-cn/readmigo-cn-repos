# 米果智读 HarmonyOS 国内化检查清单

## 总览

此清单用于跟踪米果智读 HarmonyOS 版本的国内化进度。所有项目均需在上线前完成。

## 应用元素

### 基本信息

- [x] 应用名：米果智读（zh_CN/element/string.json: app_name）
- [x] 应用描述：米果智读鸿蒙版主模块（zh_CN/element/string.json: module_desc）
- [x] 入口描述：米果智读鸿蒙版入口（zh_CN/element/string.json: entryability_desc）
- [ ] 应用图标：108×108 px（AppScope/resources/base/media/app_icon.png）
  - Status: 当前为占位（绿色圆形 + 阅 字）
  - Owner: Design team
  - Deadline: TBD
- [ ] 启动图（Splash）：1080×2400 px（entry/src/main/resources/base/media/start_window_background.png）
  - Status: 当前为占位（1×1 png）
  - Owner: Design team
  - Deadline: TBD

### 视觉品牌

- [ ] 米果智读完整 Logo：SVG 格式（Login 页、About 页）
  - Status: 待设计
  - Owner: Design team
  - Deadline: TBD
- [ ] 米果智读 Mark（仅图形）：SVG 格式
  - Status: 待设计
  - Owner: Design team
  - Deadline: TBD
- [ ] 中文文字标：SVG 格式
  - Status: 待设计
  - Owner: Design team
  - Deadline: TBD
- [ ] 启动 Splash 文案排版
  - Status: 已定义文案（见 zh-CN-strings.md）
  - Owner: Design team（排版）
  - Deadline: TBD

## UI 文案本地化

### 导航和核心界面

- [x] 发现（tab_discover）
- [x] 书架（tab_library）
- [x] 听书（tab_audiobook）
- [x] 我的（tab_me）
- [x] 阅读设置（reader_settings）
- [x] 我的笔记（me_notes）
- [x] 关于（me_about）

### Onboarding 流程

- [x] 欢迎标题（onboarding_welcome）: "欢迎使用米果智读"
- [x] 副标题（onboarding_subtitle）: "AI 时代的英语阅读伴侣"
- [x] CTA 按钮（onboarding_start）: "开始"
- [ ] 功能介绍页面（可选）：AI 词汇助手、个性化推荐、沉浸式体验
  - Status: 需 UI 设计定义
  - Owner: Product + Design
  - Deadline: TBD

### 登录页

- [x] 登录标题（login_title）: "登录"
- [x] 手机号占位符（login_phone_placeholder）: "请输入手机号"
- [x] 验证码占位符（login_code_placeholder）: "请输入验证码"
- [x] 获取验证码（login_send_code）: "获取验证码"
- [x] 登录按钮（login_submit）: "登录"
- [x] 华为账号（login_huawei）: "华为账号一键登录"
- [x] 微信登录（login_wechat）: "微信登录"
- [x] 协议前缀（login_terms_prefix）: "登录即代表同意"
- [x] 用户协议（login_terms_user）: "《用户协议》"
- [x] 隐私政策（login_terms_privacy）: "《隐私政策》"

### 书架和阅读

- [x] 我的书架（library_title）
- [x] 书架空状态（library_empty_title 和 library_empty_action）
- [x] 书籍筛选（全部、在读、读完）
- [x] 阅读主题名称（日间、夜间、羊皮纸）

### 通用错误和状态

- [x] 所有通用按钮（确定、取消、返回、搜索等）
- [x] 错误提示文案（网络异常、出错了）
- [x] 空状态文案

### 每日单词组件

- [x] 小组件标题（widget_daily_word_label）: "今日一词"
- [x] 小组件描述（widget_daily_word_desc）: "每日一个英语单词"

## 法律和隐私

- [x] 用户协议：已交付给 legal team（见 MEMORY.md）
  - Owner: Legal
  - Status: 中文版已准备
- [x] 隐私政策：已交付给 legal team（见 MEMORY.md）
  - Owner: Legal
  - Status: 中文版已准备
- [ ] 在应用内链接法律文件
  - Status: 需 About 页面和登录页面集成
  - Owner: Engineering
  - Deadline: TBD

## App Store 上架物料

### 文案

- [x] 应用推广文（≤170 字符）：见 zh-CN-strings.md
- [x] 应用详细描述（≤4000 字符）：见 zh-CN-strings.md
- [ ] 更新日志（Release notes）
  - Status: 待定义
  - Owner: Product
  - Deadline: TBD

### 截图和预览

- [ ] App Store 截图（中文标注）：至少 2-5 张
  - Status: 待设计
  - Owner: Design team
  - 规格：1440×3120 px（HarmonyOS 推荐）
  - Deadline: TBD
- [ ] App Store 预览视频（可选）
  - Status: 可选，暂不规划
  - Owner: Design/Marketing
  - Deadline: TBD

### 关键词和元数据

- [ ] 应用分类：教育 / 学习工具
  - Status: 待华为 AppGallery 确认
  - Owner: ASO specialist
  - Deadline: TBD
- [ ] 关键词优化：英语阅读、AI、学习、离线、小说等
  - Status: 待 ASO 优化
  - Owner: ASO specialist
  - Deadline: TBD
- [ ] 应用标签：英语学习、阅读、AI
  - Status: 待确定
  - Owner: Product
  - Deadline: TBD

## 技术本地化

### 字体和文本支持

- [ ] 中文字体授权：核实 HarmonyOS 系统字体是否需特殊许可
  - Status: 待 Legal + Design 确认
  - Owner: Legal + Engineering
  - Deadline: TBD
- [ ] 日期格式本地化：YYYY-MM-DD（国内标准）
  - Status: 代码中已支持，待验证
  - Owner: Engineering
  - Deadline: TBD
- [ ] 数字格式本地化：1,000 vs 1000
  - Status: 待检查
  - Owner: Engineering
  - Deadline: TBD

### 支付和区域配置

- [ ] 国内支付方式集成：微信支付、支付宝（如有订阅）
  - Status: 等待后端 API 支持
  - Owner: Engineering + Backend
  - Deadline: TBD
- [ ] 国内应用商店配置：华为 AppGallery
  - Status: 待上架流程启动
  - Owner: DevOps
  - Deadline: TBD

## 内容本地化

### 推送通知

- [ ] 推送模板中文文案：新书推荐、阅读提醒、词汇卡片
  - Status: 待定义（参考 zh-CN-strings.md）
  - Owner: Product
  - Deadline: TBD
- [ ] 推送频率和时区：北京时间（UTC+8）
  - Status: 需后端配置
  - Owner: Backend
  - Deadline: TBD

### 内容和资源

- [ ] 关于页面本地化
  - Status: 需完整设计和文案
  - Owner: Design + Product
  - Deadline: TBD
- [ ] FAQ/帮助中心（可选但推荐）
  - Status: 待规划
  - Owner: Product
  - Deadline: TBD

## 合规和上架

### 国内合规

- [ ] 内容审核：确保应用内容符合国内政策
  - Status: 待法务 / 合规 team 审查
  - Owner: Legal + Compliance
  - Deadline: TBD
- [ ] 个人信息保护法（PIPL）合规
  - Status: 隐私政策已涵盖，待 Legal 确认
  - Owner: Legal
  - Deadline: TBD
- [ ] 网络安全审查（如需）
  - Status: 待确定是否触发审查条件
  - Owner: Legal + Security
  - Deadline: TBD

### 应用商店上架

- [ ] 华为 AppGallery 上架准备
  - Status: 需 ICP 备案号（进行中，见 MEMORY.md）
  - Owner: DevOps + Legal
  - Deadline: TBD（等待 ICP 备案完成）
- [ ] 软件著作权登记
  - Status: 进行中（见 MEMORY.md）
  - Owner: Legal
  - Deadline: TBD
- [ ] 应用签名：HarmonyOS HAP 签名
  - Status: 待 DevOps 配置
  - Owner: DevOps
  - Deadline: TBD

## 质量保证

### 测试

- [ ] 中文输入测试：手机号、搜索等输入框
  - Status: 待 QA
  - Owner: QA
  - Deadline: TBD
- [ ] 设备兼容性测试：多款华为设备验证
  - Status: 待真机测试
  - Owner: QA
  - Deadline: TBD
- [ ] RTL 文本测试（不需要，中文是 LTR）
  - Status: N/A
- [ ] 国内网络环境测试：GFW 和 CDN
  - Status: 待 SRE 配置中国大陆节点
  - Owner: SRE
  - Deadline: TBD

### 文案审核

- [ ] 品牌文案一致性审核（见 zh-CN-strings.md）
  - Status: 文档已定义，待人工审核
  - Owner: Product + Design
  - Deadline: TBD
- [ ] 敏感词过滤（政治、宗教等）
  - Status: 待法务审查
  - Owner: Legal
  - Deadline: TBD

## 发布和上线

- [ ] Beta 版本发布（内部测试）
  - Status: 待定
  - Owner: DevOps
  - Deadline: TBD
- [ ] 众测版本发布（外部小范围测试）
  - Status: 待定
  - Owner: DevOps + Marketing
  - Deadline: TBD
- [ ] 正式版本发布（AppGallery）
  - Status: 待定
  - Owner: DevOps + Product
  - Deadline: TBD
- [ ] 发版公告和营销物料
  - Status: 待 Marketing 准备
  - Owner: Marketing
  - Deadline: TBD

## 相关文档和资源

| 文档 | 位置 | 说明 |
|------|------|------|
| 中文文案规范 | `brand/zh-CN-strings.md` | 所有中文文案定义和示例 |
| 品牌资产 README | `brand/README.md` | 品牌资产管理和同步指南 |
| 资产同步脚本 | `brand/sync-from-brand.sh` | 从海外 brand repo 同步资产 |
| 国内上架指南 | MEMORY.md（project_china_launch_status.md） | ICP 备案、软著等进度 |
| 用户协议 | legal team | 中文版已准备 |
| 隐私政策 | legal team | 中文版已准备 |

## 维护和变更

| 日期 | 变更 | 负责人 |
|------|------|--------|
| 2026-05-01 | 初版发布 | Product Team |

---

**更新频率**：每周一审查  
**维护者**：Product Team  
**最后检查**：2026-05-01
