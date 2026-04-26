# Readmigo HarmonyOS 快速启动指南

> **5 分钟快速开始** | 2026-04-26

---

## ✅ 环境检查清单

完成以下检查后，方可开始开发：

- [ ] **DevEco Studio** 已安装并启动
- [ ] **HarmonyOS SDK** 已下载（SDK API 12+）
- [ ] **ohpm** 可正常使用
- [ ] **agconnect-services.json** 已配置
- [ ] **签名证书** 已生成
- [ ] **项目依赖** 已安装

---

## 🚀 快速启动（3 步）

### 步骤 1: 下载 DevEco Studio

**下载地址**: https://developer.huawei.com/consumer/cn/deveco-studio/

1. 点击上述链接访问华为开发者官网
2. 下载 macOS 版本（约 1-2GB）
3. 安装到 Applications 文件夹

### 步骤 2: 配置 AGC

1. 访问：https://developer.huawei.com/consumer/cn/service/josp/agc/
2. 登录华为开发者账号
3. 创建项目：`Readmigo`
4. 添加应用：HarmonyOS 应用
5. 下载 `agconnect-services.json`
6. 放置到：`apps/harmony-app/entry/agconnect-services.json`

### 步骤 3: 打开并构建项目

1. 启动 DevEco Studio
2. `File` → `Open` → 选择 `apps/harmony-app`
3. 等待索引完成
4. `Build` → `Build Hap(s)`
5. 构建成功后，运行到模拟器

---

## 📁 项目结构

```
readmigo-cn-repos/
├── apps/harmony-app/          # 鸿蒙主应用
│   ├── entry/                 # 主模块
│   │   ├── src/main/ets/
│   │   │   ├── pages/         # 页面（Discover, Library, Reader, Me）
│   │   │   ├── model/         # 数据模型
│   │   │   ├── service/       # API 服务
│   │   │   └── entryability/  # 入口 Ability
│   │   └── agconnect-services.json  # AGC 配置（需手动添加）
│   └── build-profile.json5    # 构建配置
├── docs/
│   └── HARMONY-SETUP.md       # 详细环境搭建指南
└── scripts/
    └── setup-harmony-env.sh   # 自动安装脚本
```

---

## 🔧 常用命令

### 安装依赖
```bash
# 根依赖
pnpm install

# 鸿蒙应用依赖（在 DevEco Studio 终端）
cd apps/harmony-app
ohpm install
```

### 构建
```bash
# 使用 DevEco Studio
# Build → Build Hap(s)

# 或使用命令行（在 DevEco Studio 终端）
cd apps/harmony-app
hvigorw assembleHap
```

### 运行
```bash
# 在 DevEco Studio 中点击运行按钮
# 或选择设备后按 Shift+F10
```

---

## 📱 已实现功能

### Discover (发现)
- ✅ Hero Banner（自动轮播）
- ✅ AI 推荐书籍
- ✅ 热门书籍
- ✅ 分类浏览

### Library (书架)
- ✅ 继续阅读
- ✅ 最近浏览
- ✅ 收藏书籍（支持批量删除）
- ✅ 进度同步

### Reader (阅读器)
- ✅ 章节导航
- ✅ 阅读设置（字体/主题/行距）
- ✅ 书签/标注
- ✅ AI 翻译（结构就绪）
- ✅ TTS（结构就绪）

### Me (我的)
- ✅ 用户资料
- ✅ 阅读统计
- ✅ 会员服务
- ✅ 设置（语言/通知/下载）
- ✅ 帮助与关于

---

## 🐛 常见问题

### Q: DevEco Studio 下载太慢
**A**: 可在非高峰时段下载，或使用华为云加速

### Q: SDK 下载失败
**A**: 
1. 检查磁盘空间
2. 在 Settings → HarmonyOS SDK 中重试
3. 或手动下载 SDK 压缩包

### Q: 构建报错 "agconnect-services.json not found"
**A**: 
1. 访问 AGC 控制台创建应用
2. 下载配置文件
3. 放置到 `apps/harmony-app/entry/agconnect-services.json`

### Q: 签名证书错误
**A**:
1. 右键 `entry` → `Open Module Settings`
2. `Signatures` → 添加新签名
3. 重新生成签名文件

---

## 📚 学习资源

### 官方文档
- [DevEco Studio 使用指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/deveco-studio-guide-V5)
- [ArkTS 语言入门](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/arkts-guide-V5)
- [HarmonyOS SDK API](https://developer.huawei.com/consumer/cn/doc/harmonyos-reference/)

### 示例代码
- [HarmonyOS 官方示例](https://developer.huawei.com/consumer/cn/doc/harmonyos-samples-V5)
- [ArkTS UI 组件示例](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/arkts-ui-components-V5)

---

## 🎯 下一步

1. ✅ 完成环境搭建
2. ✅ 阅读 `IMPLEMENTATION.md` 了解已实现功能
3. ✅ 开始开发具体业务逻辑
4. ✅ 接入国内后端 API (`server-cn/`)
5. ✅ 集成国产 LLM（DeepSeek/百度/讯飞）

---

**最后更新**: 2026-04-26  
**维护者**: Readmigo CN Team
