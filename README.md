# 米果智读（Readmigo 国内本地化版 · HarmonyOS NEXT）

> **项目代号**：`readmigo-cn-repos`
> **架构演进**：`server-cn` 已拆分至独立仓 [gitee.com/readmigo/server-cn](https://gitee.com/readmigo/server-cn)（2026-05-03）
> **官网**：https://readmigo.cn
> **平台**：HarmonyOS NEXT 5.0+（纯血鸿蒙）
> **位置**：`/Users/HONGBGU/Documents/readmigo-cn-repos/`（与 `readmigo-repos/` 平级目录）
>
> 米果智读 = **Readmigo 海外版的国内本地化分支**（中文 + HarmonyOS NEXT），**同一款产品**，同一公司主体（北京瑞光科技有限公司）。技术栈、托管、合规独立，是**工程考量**（国内开发链路 + 数据合规），**不是产品独立**。

---

## 项目是什么

Readmigo（米果智读）面向中国大陆华为终端用户的**纯血鸿蒙原生**英文阅读 + AI 学习产品，是 Readmigo 同一款产品的**国内本地化版本**：

- ✅ 鸿蒙 Stage 模型 + ArkTS / ArkUI 原生开发
- ✅ 元服务（Atomic Service）+ 服务卡片 + 多端协同
- ✅ 国产 LLM（DeepSeek / 文心 / 智谱 / Qwen 多 provider）
- ✅ 国产 AI Coding（通义灵码 / Trae）
- ✅ 国产代码托管（Gitee / 极狐 GitLab）
- ✅ 华为云 + AGC + HMS 全家桶
- ✅ 1+8+N 多设备适配（手机 / 平板 / 折叠屏 / 手表 / 智慧屏）

## 与海外版的关系

**同一款产品 · 两个本地化版本 · 同一公司主体**

| 维度 | 海外版 Readmigo（[readmigo-repos](https://github.com/readmigo)） | 国内版 米果智读（本项目） |
|------|------|------|
| 主体 | 北京瑞光科技有限公司 | 同（北京瑞光科技有限公司） |
| 代码托管 | GitHub | Gitee + 极狐 GitLab（国内 dev 链路） |
| 平台 | iOS / Android / Web / Flutter | HarmonyOS NEXT |
| 数据 | Neon PostgreSQL（海外） | 华为云 GaussDB（合规） |
| LLM | OpenAI / Claude | DeepSeek / 文心 / 智谱 / Qwen |
| 商店 | App Store / Google Play | 华为应用市场（+ 未来 iOS App Store 中国区） |
| 域名 | readmigo.app | [readmigo.cn](https://readmigo.cn)（官网，已 ICP 备案：冀ICP备2026009459号） |
| AI Coding | 各类海外工具 | 通义灵码 / Trae |

**代码复用判断**：参考 [docs/11-readmigo-sync-matrix.md](./docs/11-readmigo-sync-matrix.md)。可同步的（领域设计、模块边界、AI provider 抽象）尽量同步；运行时 / SDK / 第三方服务必须替换的（认证、支付、推送、存储、AI）国内独立实现。

## 快速导航

- 📋 **[PROJECT.md](./PROJECT.md)** —— 项目主文件（指挥中心 / 完整选型 / 路线图 / 复用矩阵）
- 📚 [docs/](./docs/) —— 详细文档
- 🎯 [docs/05-roadmap.md](./docs/05-roadmap.md) —— 22 周路线图
- 📐 [docs/01-tech-selection.md](./docs/01-tech-selection.md) —— 国内栈选型详情
- 🤖 [docs/07-ai-coding.md](./docs/07-ai-coding.md) —— AI coding 工具与组织级使用边界
- 🛠 [docs/08-deveco-setup.md](./docs/08-deveco-setup.md) —— DevEco / AGC / 国内环境搭建基线
- 🔌 [docs/10-domestic-stack-integration.md](./docs/10-domestic-stack-integration.md) —— 已复核的国内化接入基线
- 🧭 [docs/11-readmigo-sync-matrix.md](./docs/11-readmigo-sync-matrix.md) —— 与海外版同步的判断规则
- 🏗 [docs/12-fullstack-technical-spec.md](./docs/12-fullstack-technical-spec.md) —— 全栈技术方案明细
- 🔗 [docs/03-overseas-reuse.md](./docs/03-overseas-reuse.md) —— 海外版 37 repo 复用清单

## 启动状态

- [x] 项目立项 + 主文件就位
- [x] 项目目录骨架创建
- [ ] Gitee 企业账号开通
- [ ] 法务 / 主体决策
- [ ] 团队招募
- [ ] 设备采购
- [ ] Phase 0 启动

## 团队

- 暂未启动招募

## 许可

私有项目，未公开。
