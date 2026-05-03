# server-cn 拆分 SOP

> **版本**：v1.0  
> **状态**：可执行步骤  
> **执行人**：DevOps / 架构师  
> **预计工时**：5-6 小时  
> **目标完成日期**：W23（本周）

---

## 概述

本 SOP 将 `server-cn` 从 `readmigo-cn-repos` monorepo 中完整拆分为独立的 Gitee 仓库，同时保留完整的 git 历史。拆分后，`server-cn` 可独立构建、测试、部署，不再依赖 monorepo 的 CI/CD 链路。

**方法论**：使用 `git filter-repo` 在 sibling 目录进行历史抽取，避免污染原 monorepo。

---

## Phase 1: 准备

### 1.1 确认 Gitee 企业账号权限

```bash
# 验证 Gitee CLI 登录状态
gitee whoami
# 应输出：username: logan676 (or 企业账号)
```

如未登录，使用 PAT (Personal Access Token) 配置：
```bash
git config --global credential.helper store
# 首次 clone 时会提示输入 PAT，之后自动保存
```

### 1.2 创建 Gitee 仓库

在 Gitee 企业账号（readmigo）下创建新仓：

**仓库信息**：
- **仓名**：`server-cn`
- **路径**：`https://gitee.com/readmigo/server-cn.git`
- **可见性**：Internal（仅企业成员）
- **描述**：Readmigo 国内版后端 API 服务（NestJS + GaussDB + Redis）
- **初始化**：不勾选（我们将推送历史）

**操作步骤**：
1. 登录 Gitee 企业后台
2. Projects → Create → Fill in name = "server-cn"
3. Visibility = "Internal"
4. Initialize without README = true
5. Create Project

### 1.3 本地安全备份

```bash
# 在 monorepo 中创建 pre-split 标签
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos
git tag -a pre-split-server-cn -m "Backup before server-cn split ($(date -u +%Y-%m-%d))"
git push origin pre-split-server-cn

# 验证标签
git tag -l | grep pre-split
```

### 1.4 安装 git-filter-repo（如未安装）

```bash
# macOS
brew install git-filter-repo

# 验证
git filter-repo --version
# 应输出：git-filter-repo version 2.x.x
```

---

## Phase 2: 历史抽取

### 2.1 在 sibling 目录创建工作副本

```bash
# 创建临时目录
mkdir -p /tmp/readmigo-cn-repos-split-work
cd /tmp/readmigo-cn-repos-split-work

# 从 monorepo 克隆（shallow clone，加快速度）
git clone --depth=1 /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos .

# 验证结构
ls -la | grep server-cn
# 应输出：drwxr-xr-x  server-cn/
```

### 2.2 使用 git filter-repo 提取 server-cn 子目录

```bash
cd /tmp/readmigo-cn-repos-split-work

# 提取 server-cn/ 子目录，保留所有历史
git filter-repo --subdirectory-filter server-cn --force

# 验证提取结果
ls -la
# 应输出：server-cn 内的文件在顶层
# 例：src/, .env.example, package.json, Dockerfile 等

git log --oneline | head -5
# 应显示 server-cn 相关的提交历史
```

### 2.3 验证文件完整性

```bash
# 检查关键文件是否存在
test -f "package.json" && echo "✓ package.json" || echo "✗ 缺失"
test -f "src/main.ts" && echo "✓ src/main.ts" || echo "✗ 缺失"
test -f "Dockerfile" && echo "✓ Dockerfile" || echo "✗ 缺失"
test -d "src/modules" && echo "✓ src/modules/" || echo "✗ 缺失"

# 统计提交数
git rev-list --count HEAD
# 记录此数值，稍后对比
```

### 2.4 清理敏感信息（可选但推荐）

如果 server-cn 历史中含有敏感信息（keys / secrets），在推送前清理：

```bash
# 示例：移除 .env 文件（如不小心提交）
git filter-repo --invert-paths --path .env --force

# 示例：替换提交中的 API key
# git filter-repo --replace-text '<(secrets.txt)' --force

# 验证敏感信息已移除
git log --all --full-history -- '.env' | head -10
# 应输出：(empty)
```

---

## Phase 3: Push 到 Gitee

### 3.1 添加远程仓库

```bash
cd /tmp/readmigo-cn-repos-split-work

# 添加 Gitee 远程
git remote add origin https://gitee.com/readmigo/server-cn.git

# 验证
git remote -v
# 应输出：
# origin  https://gitee.com/readmigo/server-cn.git (fetch)
# origin  https://gitee.com/readmigo/server-cn.git (push)
```

### 3.2 推送所有分支与标签

```bash
# 推送所有分支
git push -u origin --all

# 推送所有标签
git push -u origin --tags

# 验证（可能需要 10-30 秒）
sleep 10
curl -s https://gitee.com/api/v5/repos/readmigo/server-cn | jq '.default_branch'
# 应输出："main" 或现有默认分支
```

### 3.3 在 Gitee 验证

```bash
# 浏览器验证
open https://gitee.com/readmigo/server-cn

# 或使用 CLI
gitee api repos/readmigo/server-cn --query 'name, default_branch, full_name'
# 应输出仓库信息
```

**检查项**：
- [ ] 仓库存在且可访问
- [ ] 分支数 = 预期数（通常 main / main 分支）
- [ ] Commit 数 = Phase 2.3 中记录的数值
- [ ] 标签已推送（git tag -l）

---

## Phase 4: 本地工作树切换

### 4.1 克隆新仓到 sibling 目录

```bash
# 在 readmigo-repos 平级创建新目录
mkdir -p /Users/HONGBGU/Documents/readmigo-cn/server-cn

# 克隆新仓
cd /Users/HONGBGU/Documents/readmigo-cn/server-cn
git clone https://gitee.com/readmigo/server-cn.git .

# 验证
git remote -v
# 应输出：origin  https://gitee.com/readmigo/server-cn.git
```

### 4.2 验证独立编译与 typecheck

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/server-cn

# 安装依赖
pnpm install

# Typecheck
pnpm run typecheck
# 应成功，无 errors

# Lint
pnpm run lint
# 应成功

# 构建（可选，如果设置了 build script）
# pnpm run build
# 应成功生成 dist/

# 测试（如有）
pnpm run test
# 应通过所有测试 (或显示 "no tests found")
```

### 4.3 本地快捷方式（可选）

为方便后续开发，在 shell rc 文件中添加快捷方式：

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
alias cdserver='cd /Users/HONGBGU/Documents/readmigo-cn/server-cn'
alias cdmonorepo='cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos'

# 重载
source ~/.zshrc
```

---

## Phase 5: 老 Monorepo 清理

### 5.1 删除 server-cn 目录

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos

# 移除 server-cn 子目录
git rm -r server-cn/

# 验证
git status
# 应显示：deleted: server-cn/
```

### 5.2 更新 pnpm-workspace.yaml

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos

# 编辑 pnpm-workspace.yaml
# 移除 "server-cn" 行

# 之前：
# packages:
#   - "."
#   - "apps/*"
#   - "server-cn"
#   - "packages/*"

# 之后：
# packages:
#   - "."
#   - "apps/*"
#   - "packages/*"
```

### 5.3 更新 docs 中的 server-cn 引用

```bash
# 搜索所有 docs 中指向 server-cn 的链接
grep -r "server-cn" docs/

# 示例替换（如有相对路径或内部文档链接）
# docs/*.md 中的 "详见 ../server-cn/" 改为 "详见 [server-cn](https://gitee.com/readmigo/server-cn)"
```

### 5.4 更新 CI 配置

```bash
# 编辑 .gitee/workflows/ci.yml（或其他 CI 配置）

# 之前可能包含：
# - name: Build server-cn
#   run: cd server-cn && pnpm run build

# 移除或注释掉 server-cn 相关的 job（因为已独立）

# 保留：harmony-app / infra / napi-bridge 等在 monorepo 内的模块的 job
```

**示例 CI 更新**：
```yaml
# .gitee/workflows/ci.yml

name: CI - Monorepo

on: [push, pull_request]

jobs:
  harmony-app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        uses: pnpm/action-setup@v2
      - name: Typecheck harmony-app
        run: cd apps/harmony-app && pnpm run typecheck
      - name: Lint harmony-app
        run: cd apps/harmony-app && pnpm run lint

  # ❌ 移除 server-cn job（已独立）
  # - name: Build server-cn
  #   run: cd server-cn && pnpm run build
```

### 5.5 更新 tsconfig 或全局配置

```bash
# 如 tsconfig.base.json 中含有 server-cn 的路径别名，移除

# 之前可能：
# "compilerOptions": {
#   "paths": {
#     "@server/*": ["./server-cn/src/*"],
#     "@harmony/*": ["./apps/harmony-app/src/*"]
#   }
# }

# 之后：
# "compilerOptions": {
#   "paths": {
#     "@harmony/*": ["./apps/harmony-app/src/*"]
#   }
# }
```

### 5.6 更新 README.md 和项目文档

```bash
# 编辑 README.md，在"快速导航"或"仓库结构"部分更新

# 之前：
# ## 仓库结构
# - `server-cn/` — 后端 API 服务
# - `apps/harmony-app/` — HarmonyOS 应用

# 之后：
# ## 仓库结构
# - `apps/harmony-app/` — HarmonyOS 应用
# - 后端 API：[server-cn](https://gitee.com/readmigo/server-cn)（独立仓）

# 编辑 docs/architecture/01-repo-split-decision.md
# 添加说明："server-cn 已拆分到独立仓（W23），详见 Phase 4"
```

### 5.7 提交变更

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos

# 检查状态
git status
# 应显示：
# - deleted: server-cn/
# - modified: pnpm-workspace.yaml
# - modified: docs/...
# - modified: .gitee/workflows/ci.yml

# 分阶段提交（如需审查）
git add pnpm-workspace.yaml .gitee/workflows/ci.yml
git commit -m "refactor: Remove server-cn from monorepo workspace"

git add docs/
git commit -m "docs: Update references after server-cn split"

# 或一次性提交
git add -A
git commit -m "refactor: Complete server-cn split from monorepo

- Remove server-cn/ directory and dependencies
- Update pnpm-workspace.yaml
- Update CI/CD configuration
- Update documentation and README
- server-cn is now maintained at https://gitee.com/readmigo/server-cn"

# 推送
git push origin main
```

---

## Phase 6: 新仓 CI/CD 配置

### 6.1 在 server-cn 仓创建 CI workflow

在新仓中创建 `.gitee/workflows/ci.yml`：

```yaml
name: CI - server-cn

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install pnpm
        uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: TypeCheck
        run: pnpm run typecheck

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install pnpm
        uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: readmigo_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install pnpm
        uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Run tests
        run: pnpm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/readmigo_test

  build-docker:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Setup Docker BuildX
        uses: docker/setup-buildx-action@v2
      - name: Build Docker Image
        run: docker build -t server-cn:latest .
      - name: Test Docker Image
        run: docker run --rm server-cn:latest npm run typecheck
      # 可选：推送到华为云镜像仓库
      # - name: Push to Huawei Cloud SWR
      #   run: |
      #     docker tag server-cn:latest ${{ secrets.HUAWEI_SWR_REGISTRY }}/server-cn:latest
      #     docker push ${{ secrets.HUAWEI_SWR_REGISTRY }}/server-cn:latest
```

### 6.2 配置 Dockerfile（如未有）

确保 server-cn 有 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 6.3 验证 CI 通过

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/server-cn

# 推送测试分支，触发 CI
git checkout -b test/ci-verification
git push -u origin test/ci-verification

# 在 Gitee 上查看 Actions 运行状态
# https://gitee.com/readmigo/server-cn/actions

# 等待 CI 通过，然后删除测试分支
git checkout main
git branch -D test/ci-verification
git push origin :test/ci-verification
```

---

## Phase 7: 联动验证

### 7.1 验证老 monorepo 仍可编译

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos

# 移除旧的 node_modules（清洁环境）
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install

# Typecheck（不应含 server-cn 错误）
pnpm -r run typecheck

# 验证 harmony-app 可独立编译
cd apps/harmony-app
pnpm run typecheck
# ✓ 成功
```

### 7.2 验证 API 端点配置

```bash
# 检查 harmony-app 中的 API 配置是否正确指向 server-cn 远程

# 在 harmony-app 中搜索 API endpoint
grep -r "http://.*server" apps/harmony-app/src/

# 应指向：
# - 本地：http://localhost:3000（开发时）
# - 测试：https://test-api.readmigo.cn（测试环境）
# - 生产：https://api.readmigo.cn（生产环境）

# 如有硬编码路径，更新为环境变量
# 例：process.env.REACT_APP_API_BASE_URL
```

### 7.3 跨仓 import 验证

```bash
# harmony-app 应该通过 npm / yarn 依赖引入 server-cn（如有共享代码）
# 或者，通过环境变量/配置文件引入 server-cn 的 OpenAPI schema

# 验证 package.json
cat apps/harmony-app/package.json | jq '.dependencies' | grep server
# 如无共享包，应输出：空

# 如有共享代码（如 API types），应改为：
# "server-cn": "npm:server-cn@*"（发布到 npm 或 ohpm）

# 或者通过脚本自动生成 types（从 OpenAPI schema）
# pnpm run gen:api-types
```

### 7.4 部署流程验证（可选）

```bash
# 模拟本地部署（开发环境）
cd /Users/HONGBGU/Documents/readmigo-cn/server-cn

# 启动 server-cn
pnpm run start:dev
# 应输出：[Nest] ... listening on port 3000

# 在另一个终端，验证 API 可达
curl http://localhost:3000/api/health
# 应返回：{ "status": "ok" }
```

---

## Rollback Plan

如果拆分过程出错或需要回滚：

### 回滚步骤

```bash
# 1. 在 monorepo 中恢复 server-cn
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos
git checkout pre-split-server-cn^:server-cn -b restore-server-cn
git merge --squash restore-server-cn
git add server-cn/
git commit -m "rollback: restore server-cn from pre-split backup"

# 2. 删除 Gitee 上的 server-cn 仓
# 在 Gitee 网页上：Settings → Danger Zone → Delete Repository

# 3. 删除本地克隆
rm -rf /Users/HONGBGU/Documents/readmigo-cn/server-cn /tmp/readmigo-cn-repos-split-work
```

---

## 后续操作（W24+）

拆分 infra-cn 和 llm-adapter 时，使用**相同的 SOP**（只改仓名和路径）：

1. **infra-cn 拆分**（W24 第一周）
   - Phase 1-7 流程相同
   - 额外考虑：敏感信息清理（AccessKey / VPC / 密钥）
   - 可见性：Private（仅 DevOps）

2. **llm-adapter 拆分**（W24 第二周）
   - Phase 1-7 流程相同
   - 依赖更新：server-cn 改为引入 llm-adapter 的 npm 包
   - 发布到 ohpm 镜像（华为云官方）

---

## 检查清单

使用此清单确保拆分完成：

- [ ] **Phase 1**：Gitee 仓创建 ✓，pre-split 标签保存 ✓，git-filter-repo 已安装 ✓
- [ ] **Phase 2**：server-cn 历史成功提取 ✓，文件完整 ✓
- [ ] **Phase 3**：推送到 Gitee ✓，Gitee 上可见 ✓，commit 数核对 ✓
- [ ] **Phase 4**：新仓 clone 到本地 ✓，独立编译通过 ✓，快捷方式配置 ✓
- [ ] **Phase 5**：monorepo 清理 ✓，pnpm-workspace.yaml 更新 ✓，CI 配置更新 ✓，文档更新 ✓
- [ ] **Phase 6**：新仓 CI workflow 已配置 ✓，Dockerfile 存在 ✓，CI 首次运行通过 ✓
- [ ] **Phase 7**：monorepo 仍可编译 ✓，API 端点配置正确 ✓，部署流程验证 ✓

**全部勾选后，拆分完成 ✅**

---

## 变更历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-05-01 | 初版：完整可执行 SOP，7 个阶段 + 回滚计划 |
