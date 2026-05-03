# Terminal AI Coding

本项目的终端 AI coding 主方案是：

- `Qwen Code CLI`
- 模型后端：`阿里云百炼 Coding Plan`

不使用 `通义灵码插件` 作为终端主方案。原因很简单：截至 `2026-04-26`，通义灵码官方重点仍然是 `Lingma IDE` 与 IDE 插件；它可以执行终端命令，但不是独立的终端 CLI 产品。

## 推荐方案

### 方案 A：Qwen Code CLI

适合：

- 纯终端工作流
- 需要项目级上下文文件
- 希望完全走国内模型与国内服务

安装与使用参考阿里云官方文档：

- 安装命令：

```bash
bash -c "$(curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen.sh)" -s --source bailian
```

- 启动：

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos
qwen
```

首次启动后：

1. 选择 `阿里云百炼 Coding Plan`
2. 输入 Coding Plan 专属 API Key
3. 在项目目录执行 `/init`
4. 确认使用仓库根目录的 `QWEN.md`

如果你想手动配置，可参考：

- 仓库模板：`tools/ai-coding/terminal/qwen-settings.example.json`
- 实际用户配置路径：
  - macOS / Linux：`~/.qwen/settings.json`
  - Windows：`C:\Users\你的用户名\.qwen\settings.json`

常用命令：

- `/auth`
- `/model`
- `/init`
- `/summary`
- `/resume`

### 方案 B：Kilo CLI

适合：

- 你想要一个开源终端工具
- 仍然使用百炼里的千问模型

但对这个项目，我不建议把它放在主链路前面，因为项目级上下文和团队标准化不如 `Qwen Code` 顺手。

### 方案 C：Claude Code 接百炼

适合：

- 你已经习惯 `Claude Code` 的终端交互
- 但模型和流量要落在国内

这不是我的主推荐，因为工具本身不是国产；只是后端模型和网关可以走百炼。

## 模型建议

- 默认工作模型：`qwen3.6-plus`
- 编码优先模型：`qwen3-coder-next`
- 高频低成本任务：`qwen3-coder-flash`

## 项目约定

启动终端 AI coding 时，务必在仓库根目录执行：

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos
qwen
```

这样工具会以当前项目作为上下文，并读取 `QWEN.md`。

## 官方来源

- Qwen Code（CLI 及 IDE 插件）接入百炼：https://help.aliyun.com/zh/model-studio/qwen-code-coding-plan
- Kilo CLI 接入百炼：https://help.aliyun.com/zh/model-studio/kilo-cli
- OpenCode 接入百炼：https://help.aliyun.com/zh/model-studio/opencode
- Claude Code 接入百炼：https://help.aliyun.com/zh/model-studio/claude-code
