# 实施路线图（22 周 / 5.5 月）

> 详细 82 个动作的精简版见求职目录的 `harmony-100pct-roadmap.md`，本文件聚焦"国内独立项目"视角的关键动作。

---

## 总时间线

```
                Week 1-4   5-10   11-16  17-19  20-22
Phase 0 合规    ▓▓▓▓                                (Day 1 启动)
Phase 1 PoC     ▓▓▓▓
Phase 2 核心          ▓▓▓▓▓▓
Phase 3 鸿蒙特色             ▓▓▓▓▓▓
Phase 4 HMS                       ▓▓
Phase 5 上架                         ▓▓
持续合规       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

## Phase 0：合规 + 团队 + 设备（Day 1 启动 / 4 周外部依赖）

- [x] 项目立项 + 主文件就位
- [ ] 主体公司决策（与法务）
- [ ] Gitee 企业账号开通（推送本目录上去）
- [ ] 极狐 GitLab CE 自部署（灾备）
- [ ] 华为开发者联盟企业账号注册
- [ ] AGC 项目创建 + 包名规划（com.readmigo.harmony.cn）
- [ ] 鸿蒙签名证书申请
- [ ] **ICP 备案**（2-4 周）
- [ ] **网信办内容审核备案**（2-4 周）
- [ ] **生成式 AI 服务备案**（1-2 月）⚠️ 关键路径
- [ ] 软著登记（30-60 天）
- [ ] 商标 / 中文名 / 域名
- [ ] 团队招募（1-2 人鸿蒙工程师）
- [ ] 设备采购（5-7 台华为真机）
- [ ] 学习计划（5-10 个 Codelab）

## Phase 1：技术 PoC + C++ 桥接（4 周）

### Week 1：环境
- [ ] DevEco Studio NEXT 安装 + 通义灵码插件
- [ ] DevEco 项目初始化（Stage 模型 + ArkTS）
- [ ] Gitee 仓库初始化 + push
- [ ] CI 配置（Gitee Actions）
- [ ] git submodule 添加 typesetting + badge-engine

### Week 2：C++ NAPI 桥接框架
- [ ] CMake + arm64-v8a NDK 配置
- [ ] 编写统一 NAPI 桥接框架
- [ ] typesetting.so 编译 + 桥接
- [ ] badge-engine.so 编译 + 桥接
- [ ] XComponent 接入

### Week 3：海外代码拷贝 + 国内化（先做最容易的）
- [ ] 拷贝 `api` → `server-cn/api/` ([gitee](https://gitee.com/readmigo/server-cn/blob/main/api/))
- [ ] 重写 LLM provider 层（接 DeepSeek + 文心）
- [ ] 拷贝 `gutenberg`、`badge-content`、`badge-assets`、`badge-cli`、`shipkit`、`tts-data`
- [ ] 数据库迁移：PostgreSQL → GaussDB
- [ ] 部署到华为云 ECS（staging）

### Week 4：PoC happy path
- [ ] 鸿蒙端登录 + token 持久化（接华为账号 SDK）
- [ ] 鸿蒙端书库列表（LazyForEach）
- [ ] 鸿蒙端单本书阅读（C++ typesetting 渲染）
- [ ] **里程碑**：跑通"登录 → 书库 → 打开一本书 → 翻页"

## Phase 2：客户端核心（6 周）

### Week 5-6：Stage 模型 + 设计系统
- [ ] UIAbility 拆分（Reader / Library / Settings）
- [ ] ServiceExtensionAbility（TTS 后台 / 内容增量同步）
- [ ] ArkUI 设计系统：HarmonyOS Design + token 映射
- [ ] 字体策略：HarmonyOS Sans + 阅读字体
- [ ] 暗色模式
- [ ] 通用组件库（Button / Input / Card / List / Modal / Toast）

### Week 7-8：业务功能
- [ ] 阅读器（章节 / 进度 / 翻页 / 排版调节）
- [ ] AI 划词查询（接 DeepSeek + 缓存）
- [ ] TTS 朗读（接讯飞 TTS）
- [ ] 笔记 / 词卡（CRUD + 复习算法）

### Week 9-10：数据 + 网络 + 完善
- [ ] @ohos.data.preferences 封装
- [ ] @ohos.data.relationalStore 封装（RDB ORM）
- [ ] LLM 适配层（ArkTS 重写 fetch + 多 provider）
- [ ] 端侧资源 CDN（华为云 OBS）
- [ ] **里程碑**：核心阅读体验对齐 iOS / Android

## Phase 3：鸿蒙特色（6 周）

### Week 11-12：元服务 + 服务卡片
- [ ] 元服务：划词查询（NFC 碰一碰）
- [ ] 元服务：单词分享（Share）
- [ ] 服务卡片：桌面"今日一词"
- [ ] 服务卡片：桌面"我的阅读"
- [ ] 服务卡片：负一屏"AI 助手"
- [ ] 万能卡片中心适配

### Week 13-14：分布式 / 多端协同
- [ ] 分布式数据对象（阅读进度多端同步）
- [ ] FA 迁移（手机 → 平板继续）
- [ ] 多端协同：手机 + 平板 + 折叠屏
- [ ] 手表表盘"今日单词"小组件
- [ ] 智慧屏阅读模式

### Week 15-16：AI + HMOS 系统集成
- [ ] AI 小艺意图框架
- [ ] HiAI Foundation 端侧 OCR
- [ ] 跨设备搜索
- [ ] 折叠屏 / 平板 / 响应式断点
- [ ] **里程碑**：鸿蒙特色全部上线 + 4 类设备验证

## Phase 4：HMS 全家桶（2-3 周）

- [ ] HMS Push Kit + 服务端发推送
- [ ] HMS Account Kit（华为账号一键登录）
- [ ] HMS IAP（应用内购）
- [ ] HMS Analytics + 神策双轨
- [ ] AGC Crash Service + Sentry 双轨
- [ ] AGC Remote Config（灰度）
- [ ] AGC Cloud Function（如需要）

## Phase 5：上架 + 鸿蒙先锋（2 周）

- [ ] 应用图标 / 截图 / 视频（10 张+）
- [ ] 应用商店元数据
- [ ] **AGC 应用市场提交审核**（3-7 天等待）
- [ ] 元服务独立审核
- [ ] **鸿蒙先锋认证申请**（2-4 周等待）
- [ ] 灰度发布（5% → 50% → 100%）
- [ ] 用户反馈收集

---

## 持续 Track（贯穿全程）

- [ ] 每周与海外团队同步 C++ 引擎更新
- [ ] 每两周做一次代码 review（含 AI 产物）
- [ ] 每月鸿蒙 SDK 版本升级评估
- [ ] 季度合规审计（数据隔离 / 备案续期）
- [ ] 持续运营（用户反馈 / 功能迭代）

---

## 里程碑总结

| 时间 | 里程碑 |
|------|------|
| W4 | PoC：登录 → 书库 → 打开一本书 |
| W10 | 核心阅读体验对齐海外版 |
| W16 | 鸿蒙特色全部上线（元服务+卡片+多端） |
| W19 | HMS 全家桶集成完毕 |
| W22 | 上架华为应用市场 + 灰度上线 |
| W22+4 | 鸿蒙先锋认证（如通过） |

---

## 变更记录

- **2026-04-26 v1**：22 周路线图骨架
