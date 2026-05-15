# C++ 引擎升级与同步流程

> 本文档定义 typesetting（排版引擎）与 badge-engine（勋章引擎）从海外版到国内版的同步、维护与升级流程。  
> 目标读者：基础设施工程师、C++ 工程师、技术负责人  
> 创建日期：2026-05-01

---

## 1. 背景与设计原则

### 1.1 历史上下文

米果智读的 C++ 原生引擎来自海外版（Readmigo 的 iOS 版本）：

| 引擎 | 源头 | 功能 | 依赖平台 |
|------|------|------|---------|
| **typesetting** | `github.com/readmigo/typesetting` | 文本排版、断行、字体度量 | 原为 iOS CoreText，现拓展到 HarmonyOS |
| **badge-engine** | `github.com/readmigo/badge-engine` | 成就勋章、等级计算 | 原为 iOS 通用逻辑，平台无关 |

### 1.2 为什么不使用 git submodule

海外版使用 GitHub（存储在 USA），国内版使用 Gitee / 极狐（存储在国内）。

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| **Git Submodule** | 自动同步，保持一致 | 访问海外 GitHub 不稳定；版权审核困难（海外代码不在本地视野内） | ❌ 不采用 |
| **拷贝 + 手动同步** | 代码完全本地化；版权审核可见 | 需手动同步维护；容易出现 drift | ✅ 采用 |

**结论**：采用**一次性拷贝 + 定期镜像同步**的方案，国内独立演化。

### 1.3 核心原则

1. **海外为 Source of Truth**（C++ 排版核心逻辑）
   - 任何通用的改进（算法优化、bug fix）都应先在海外版修复
   - 国内版定期从海外版拉取更新

2. **国内独立演化**
   - HarmonyOS 平台适配层（NAPI bridge、ArkUI 绑定）由国内开发
   - 国内优化（性能、国内字体）可独立实施
   - 国内改动通过 patch 机制隔离，便于后续升级

3. **patch 隔离**
   - 国内的所有本地修改都记录在 patch 文件中
   - 同步时先回退到海外版本，再 apply patches
   - 避免直接修改核心代码导致升级时冲突

---

## 2. 当前同步状态

### 2.1 typesetting 引擎

**来源**：`github.com/readmigo/typesetting` (海外版)

**本地位置**：`native/typesetting/`

**最近同步记录**：

```
commit: abc123def456  (海外版 commit)
date:   2026-04-26
version: typesetting 1.2.1
changes: 
  - Unicode 字符处理改进
  - 新增 HarmonyOS 平台适配层骨架
```

**同步方式**：
- 拷贝来自海外 typesetting 的核心文件（`.h`, `.cpp`, `CMakeLists.txt`）
- 排除平台相关文件（`platform_apple.*`）
- 新增 `platform_harmony.*` 占位实现

**当前状态**：
- ✅ 核心排版逻辑完整
- 🟡 HarmonyOS 平台适配层为占位实现（近似字体度量）
- ❌ 尚未接入华为字体测量能力（后续优化）

### 2.2 badge-engine 引擎

**来源**：`github.com/readmigo/badge-engine` (海外版)

**本地位置**：`native/badge-engine/`

**最近同步记录**：

```
commit: xyz789uvw012  (海外版 commit)
date:   2026-04-26
version: badge-engine 0.8.0
changes:
  - 等级阶梯算法优化
  - 勋章解锁逻辑完善
```

**当前状态**：
- ✅ 完整功能，platform-agnostic（平台无关）
- ✅ 可直接用于 HarmonyOS（无平台适配需要）

---

## 3. 同步流程（手动方式 - 当前）

### 3.1 准备工作

**第 1 步**：确保本地海外版仓库已更新

```bash
cd /tmp/sync-workspace
git clone https://github.com/readmigo/typesetting.git typesetting-upstream
cd typesetting-upstream
git log --oneline -5  # 查看最新提交
```

**第 2 步**：记录源版本信息

```bash
# 获取当前海外版的 commit hash 和 tag
git log -1 --pretty=format:"%H %ai %s" > /tmp/upstream-version.txt
# 输出示例：abc123def456 2026-04-26 12:34:56 +0000 Add HarmonyOS platform support
```

### 3.2 执行 rsync 同步（排除非核心文件）

```bash
#!/bin/bash
# sync-typesetting.sh - 同步脚本

SOURCE_DIR="/tmp/sync-workspace/typesetting-upstream"
TARGET_DIR="/Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/native/typesetting"

# rsync 选项：
# -a: 存档模式（保留权限、时间戳）
# -v: 详细输出
# --delete: 删除目标中已在源中删除的文件
# --exclude: 排除指定模式的文件

rsync -av \
  --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='build/' \
  --exclude='dist/' \
  --exclude='platform_apple.*' \
  --exclude='tests/' \
  --exclude='*.o' \
  --exclude='*.a' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

echo "Sync completed!"
```

**执行同步**：

```bash
chmod +x sync-typesetting.sh
./sync-typesetting.sh
```

### 3.3 检查同步结果

```bash
# 进入国内版项目目录
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/native/typesetting

# 列出同步后的文件
ls -la

# 检查是否有冲突或意外删除
git status
```

**预期输出**：

```
On branch main
Changes not staged for commit:
  modified:   src/layout.cpp
  modified:   src/line_break.cpp
  deleted:    include/typesetting/platform_apple.h
  new file:   include/typesetting/platform_harmony.h
```

### 3.4 回溯国内 patch（若有）

**第 1 步**：列出当前的国内 patch

```bash
cd native/typesetting
ls -la patches/
# 输出示例：
# cn-2026-04-20-font-metrics-fix.patch
# cn-2026-04-24-harmony-napi-bridge.patch
```

**第 2 步**：重置到海外版本，再逐一 apply patches

```bash
# 重置所有改动（回到海外版本）
git reset --hard

# 应用国内 patch 文件
for patch_file in patches/cn-*.patch; do
  echo "Applying $patch_file..."
  git apply $patch_file || {
    echo "Patch $patch_file failed to apply!"
    exit 1
  }
done

echo "All patches applied successfully!"
```

### 3.5 验证编译

编译 typesetting 以确保同步后没有破坏编译：

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos/native/typesetting

# 清理旧的编译产物
rm -rf build

# CMake 编译（假设已安装 CMake 和 NDK）
mkdir build && cd build
cmake -DTYPESETTING_PLATFORM_HARMONY=ON \
      -DCMAKE_TOOLCHAIN_FILE=${ANDROID_NDK}/build/cmake/android.toolchain.cmake \
      ..
make -j$(nproc)

# 检查编译产物
ls -la lib*/libtypesetting.so
```

**若编译失败**：
- 检查是否有 API 破坏变化（海外版更新了函数签名）
- 查阅海外版的 CHANGELOG 或提交说明
- 必要时更新 HarmonyOS 平台适配层

### 3.6 运行单元测试

```bash
# 如果有 C++ 单元测试
cd build
ctest --verbose

# 若无 ctest，手动运行测试二进制
./tests/typesetting_tests
```

### 3.7 提交并记录同步

```bash
cd /Users/HONGBGU/Documents/readmigo-cn/readmigo-cn-repos

# 记录同步信息到版本文件
cat > native/typesetting/VERSION << EOF
sync_date: $(date -u +%Y-%m-%d)
upstream_commit: $(git -C /tmp/sync-workspace/typesetting-upstream rev-parse HEAD)
upstream_version: typesetting 1.2.1
harmony_patches: $(ls native/typesetting/patches/*.patch | wc -l)
EOF

# 提交
git add native/typesetting/
git commit -m "chore: sync typesetting engine from upstream (commit abc123def456)

- Synchronized core layout and line-breaking algorithms
- Applied $(ls native/typesetting/patches/*.patch | wc -l) HarmonyOS-specific patches
- Verified compilation and unit tests
"
```

**提交信息规范**：
- 第一行：简短描述（"sync typesetting from upstream"）
- 空行
- 第二部分：详细说明（上游 commit hash、patch 数量、验证步骤）

---

## 4. 国内 patch 维护

### 4.1 patch 文件组织

**目录结构**：

```
native/typesetting/
├── include/
├── src/
├── tests/
├── CMakeLists.txt
├── VERSION                    # 版本记录文件
├── PATCHES.md                 # patch 说明文档
└── patches/                   # patch 文件夹
    ├── cn-2026-04-20-font-metrics-fix.patch
    ├── cn-2026-04-24-harmony-napi-bridge.patch
    └── cn-2026-05-01-simd-optimization.patch
```

### 4.2 创建新 patch 的步骤

**场景**：需要为 HarmonyOS 优化排版性能

**第 1 步**：进行修改

```bash
cd native/typesetting
# 编辑源文件，例如 src/layout.cpp
vim src/layout.cpp
```

**第 2 步**：生成 patch 文件

```bash
# 查看修改的文件
git diff src/layout.cpp > /tmp/my-changes.diff

# 生成正式 patch 文件（包含完整上下文）
git diff src/layout.cpp > patches/cn-$(date +%Y-%m-%d)-simd-optimization.patch
```

**第 3 步**：在 `PATCHES.md` 中记录

```markdown
## cn-2026-05-01-simd-optimization.patch

**作者**：Engineer Name  
**日期**：2026-05-01  
**目的**：使用 NEON / SVE 指令集加速文本测量  
**影响**：性能提升 20-30%（在 ARM 设备上）

### 修改文件
- src/layout.cpp：优化字符宽度计算循环

### 备注
- 此 patch 依赖 HarmonyOS NDK 中的 arm_neon.h
- 需在 CMakeLists.txt 中定义 `-march=armv8.2-a+neon`
```

**第 4 步**：验证 patch 可独立应用

```bash
# 先重置到海外版本
git reset --hard

# 尝试应用 patch
git apply patches/cn-2026-05-01-simd-optimization.patch

# 编译验证
cmake -B build && make -C build
```

### 4.3 patch 冲突的处理

**场景**：升级海外版本时，国内 patch 无法直接应用

**症状**：

```bash
git apply patches/cn-2026-05-01-simd-optimization.patch
error: patch does not apply
```

**解决步骤**：

1. **手动合并**：
   ```bash
   git apply --reject patches/cn-2026-05-01-simd-optimization.patch
   # 生成 *.rej 文件，显示冲突部分
   cat src/layout.cpp.rej  # 查看冲突
   vim src/layout.cpp      # 手动合并
   ```

2. **重新生成 patch**：
   ```bash
   git diff src/layout.cpp > patches/cn-2026-05-01-simd-optimization.patch
   ```

3. **更新 PATCHES.md 中的备注**：
   ```markdown
   **更新记录**：
   - 2026-04-28：初始版本，对应 typesetting 1.2.0
   - 2026-05-01：升级 typesetting 至 1.2.1，手动合并冲突（src/layout.cpp 中的 break 条件）
   ```

---

## 5. 自动化同步（计划 - W3+）

### 5.1 目标

实现周期性自动同步，无需人工干预。

### 5.2 实现方案

**使用 Gitee Actions 的 cron 工作流**：

```yaml
# .gitee/workflows/sync-engines.yml

name: Sync C++ Engines from Upstream

on:
  schedule:
    # 每周一 9:00 AM Beijing Time
    - cron: '0 1 * * MON'

jobs:
  sync-typesetting:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout CN repo
        uses: actions/checkout@v3

      - name: Clone upstream typesetting
        run: |
          git clone https://github.com/readmigo/typesetting.git /tmp/typesetting-upstream
          cd /tmp/typesetting-upstream
          echo "UPSTREAM_COMMIT=$(git rev-parse HEAD)" >> $GITHUB_ENV

      - name: Sync with rsync
        run: |
          rsync -av --delete \
            --exclude='.git' --exclude='build' \
            /tmp/typesetting-upstream/ native/typesetting/

      - name: Apply HarmonyOS patches
        run: |
          cd native/typesetting
          for patch in patches/cn-*.patch; do
            git apply "$patch" || exit 1
          done

      - name: Verify build
        run: |
          cd native/typesetting
          mkdir -p build
          cd build
          cmake -DTYPESETTING_PLATFORM_HARMONY=ON ..
          make -j$(nproc)

      - name: Create Pull Request
        if: env.UPSTREAM_COMMIT != secrets.LAST_SYNC_COMMIT
        uses: peter-evans/create-pull-request@v4
        with:
          token: ${{ secrets.GITEE_TOKEN }}
          title: "chore: sync typesetting from upstream"
          body: |
            自动同步海外版 typesetting 更新
            Upstream commit: ${{ env.UPSTREAM_COMMIT }}
          branch: auto/sync-typesetting

      - name: Update sync record
        run: |
          echo "LAST_SYNC_COMMIT=$UPSTREAM_COMMIT" >> secrets.env
```

### 5.3 通知机制

同步完成后，向维护者发送通知：

```yaml
      - name: Send notification
        if: always()
        uses: actions/webhook-action@v1
        with:
          webhook_url: ${{ secrets.FEISHU_WEBHOOK_URL }}
          payload: |
            {
              "msg_type": "text",
              "content": {
                "text": "引擎同步任务完成\n上游版本: ${{ env.UPSTREAM_COMMIT }}\n状态: ${{ job.status }}"
              }
            }
```

---

## 6. 版本号与标签管理

### 6.1 版本号规范

采用**语义版本号** (Semantic Versioning)：

```
typesetting: X.Y.Z
  X: 主版本（API 破坏性变化）
  Y: 次版本（新增功能，向后兼容）
  Z: 修订版（bug 修复）

badge-engine: X.Y.Z (同上)
```

### 6.2 版本文件

`native/typesetting/VERSION`:

```
version: 1.2.1
upstream_commit: abc123def456
upstream_version: typesetting 1.2.1
sync_date: 2026-04-26
harmony_patches_count: 2
last_tested_harmonyos: NEXT 5.0.1
```

`native/badge-engine/VERSION`:

```
version: 0.8.0
upstream_commit: xyz789uvw012
upstream_version: badge-engine 0.8.0
sync_date: 2026-04-26
harmony_patches_count: 0
```

### 6.3 Git Tag

为每次同步创建 tag：

```bash
git tag -a typesetting/1.2.1-cn-001 -m "Sync typesetting 1.2.1 with HarmonyOS patches"
git push origin typesetting/1.2.1-cn-001
```

**tag 命名规则**：
```
<engine>/<version>-cn-<patch-level>

例：
- typesetting/1.2.1-cn-001 (首次同步)
- typesetting/1.2.1-cn-002 (bug 修复后的第二个国内版本)
```

---

## 7. CI 验证流程

### 7.1 编译验证

每次提交后，CI 自动验证：

```yaml
# .gitee/workflows/native-build.yml

name: Build Native Engines

on: [push, pull_request]

jobs:
  build-typesetting:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup NDK
        uses: ndk-build/setup-ndk@v1
        with:
          ndk-version: r26

      - name: Build typesetting
        run: |
          cd native/typesetting
          mkdir -p build && cd build
          cmake -DTYPESETTING_PLATFORM_HARMONY=ON \
            -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
            -DANDROID_ABI=arm64-v8a \
            ..
          make -j$(nproc)

      - name: Run unit tests
        run: |
          cd native/typesetting/build
          ctest --verbose

  build-badge-engine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup NDK
        uses: ndk-build/setup-ndk@v1
        with:
          ndk-version: r26
      - name: Build badge-engine
        run: |
          cd native/badge-engine
          mkdir -p build && cd build
          cmake ..
          make -j$(nproc)
```

### 7.2 HAP 集成验证

在完整的 HarmonyOS 应用编译中验证：

```bash
# 在 harmony-app/ 中执行
./gradlew assembleDebug

# 检查 HAP 中是否包含了正确的 .so 文件
unzip -l build/outputs/default/readmigo.hap | grep -E "libtypesetting|libbadge_engine"
```

---

## 8. Rollback 操作（若同步引入 bug）

### 8.1 场景

同步后发现新的 bug（例如排版崩溃），需要快速回滚。

### 8.2 步骤

**第 1 步**：识别坏的提交

```bash
git log --oneline -n 10
# 输出：
# abc1234 chore: sync typesetting from upstream  <- 坏的提交
# xyz5678 feat: add napi bridge for typesetting
# ...
```

**第 2 步**：临时回滚

```bash
# 创建一个新分支用于调查
git checkout -b hotfix/typesetting-crash

# 回滚到上一次良好状态
git revert abc1234  # 创建反向提交
```

**第 3 步**：推送并测试

```bash
git push origin hotfix/typesetting-crash

# 在 CI 中验证
# 若回滚后 CI 通过，说明是本次同步引入的问题
```

**第 4 步**：修复问题

在 `native/typesetting/` 中定位问题，创建新的 patch：

```bash
# 修改代码
vim src/layout.cpp

# 生成 patch
git diff src/layout.cpp > patches/cn-2026-05-01-fix-crash.patch

# 重新应用所有 patches
git reset --hard
for patch in patches/cn-*.patch; do
  git apply "$patch"
done

# 重新编译验证
```

**第 5 步**：创建新提交

```bash
git add native/typesetting/
git commit -m "fix: resolve typesetting crash introduced in sync

- Root cause: line-break algorithm change in upstream
- Solution: add boundary check for UTF-8 sequences
- Patch: cn-2026-05-01-fix-crash.patch
"
```

---

## 9. Engineer Onboarding

新工程师加入时，应理解这个流程：

### 9.1 5 分钟速览

```markdown
# C++ 引擎同步流程

1. **源头**：海外版 GitHub (typesetting, badge-engine)
2. **国内版**：本地拷贝，定期 mirror
3. **国内修改**：全部用 patch 隔离
4. **同步方式**：rsync (排除 .git, build 等)
5. **验证**：编译 + 单测 + HAP 集成

## 关键文件
- native/typesetting/VERSION
- native/typesetting/PATCHES.md
- native/typesetting/patches/

## 常用命令
```bash
# 查看当前版本
cat native/typesetting/VERSION

# 应用 patches
for p in native/typesetting/patches/*.patch; do git apply $p; done

# 编译验证
cd native/typesetting && cmake -B build && make -C build
```
```

### 9.2 完整文档

参考本文档的"同步流程"部分。

### 9.3 实操练习

- [ ] 查看当前 VERSION 文件
- [ ] 列出所有 patch
- [ ] 尝试编译 typesetting
- [ ] 阅读最近 3 次同步的提交说明

---

## 10. 常见问题与故障排查

### 问题 1：patch 应用失败（patch does not apply）

**原因**：
- 海外版本已更新，旧 patch 不适配
- 或 patch 文件自身损坏

**解决**：

1. 查看 patch 的冲突部分：
   ```bash
   git apply --reject patches/cn-2026-04-24-harmony-napi-bridge.patch
   cat src/layout.cpp.rej
   ```

2. 手动合并冲突，重新生成 patch：
   ```bash
   vim src/layout.cpp  # 解决冲突
   git diff src/layout.cpp > patches/cn-2026-04-24-harmony-napi-bridge.patch
   ```

---

### 问题 2：编译失败（CMake 或 Make 错误）

**原因**：
- 海外版更新了 API
- 或缺少 HarmonyOS 特定的头文件

**排查步骤**：

```bash
# 查看完整编译日志
cd native/typesetting/build
cmake -v .. 2>&1 | tee cmake-verbose.log
make VERBOSE=1 2>&1 | tee make-verbose.log

# 寻找错误信息中的文件和行号
grep -n "error:" make-verbose.log
```

**常见修复**：
- 更新 `platform_harmony.cpp` 中的函数实现（如需要新增 API）
- 检查 CMakeLists.txt 中的头文件路径

---

### 问题 3：单元测试失败

**原因**：
- 排版算法改变，测试用例需更新
- 或 HarmonyOS 平台的字体行为与 iOS 不同

**解决**：

```bash
# 运行失败的单个测试
cd native/typesetting/build
./tests/typesetting_tests --gtest_filter=TestLineBreak

# 查看详细输出
./tests/typesetting_tests --gtest_filter=TestLineBreak -v

# 若是预期行为改变，更新测试用例
vim ../tests/test_line_break.cpp
```

---

### 问题 4：HAP 中缺少 .so 文件

**症状**：

```bash
unzip -l readmigo.hap | grep libtypesetting
# (无输出 - .so 没有被打包)
```

**原因**：
- CMake 编译产物未被正确链接到 HAP
- 或 build.gradle 中未配置 native lib 路径

**解决**：

1. 确认 .so 文件已编译：
   ```bash
   find native/typesetting/build -name "*.so"
   ```

2. 检查 HAP 的 build.gradle / build-profile.json5：
   ```gradle
   android {
     sourceSets {
       main {
         jniLibs.srcDirs = ['build/intermediates/libs']  // 配置 .so 路径
       }
     }
   }
   ```

3. 清理并重新编译 HAP：
   ```bash
   ./gradlew clean
   ./gradlew assembleDebug
   ```

---

## 11. 检查清单（同步前）

每次执行同步前，检查：

- [ ] 海外版 GitHub 仓库已克隆到本地
- [ ] 本地的国内 patch 已备份（`native/typesetting/patches/`）
- [ ] 当前分支是干净的（`git status` 无未提交改动，或已 commit）
- [ ] 已记录当前的同步版本（`cat native/typesetting/VERSION`）
- [ ] 联网（需访问 GitHub）
- [ ] 本地 CMake / NDK 环境完整

---

## 12. 检查清单（同步后）

同步完成后，验证：

- [ ] 所有 patch 已成功应用（`git apply` 无错误）
- [ ] 代码编译通过（`cmake && make` 无错误）
- [ ] 单元测试通过（`ctest --verbose` 全绿）
- [ ] HAP 中包含了 .so 文件（`unzip -l readmigo.hap | grep .so`）
- [ ] 真机安装无崩溃（在 Mate 60 Pro 上运行）
- [ ] 排版效果无回归（书籍内容显示正常）
- [ ] 已更新 VERSION 文件
- [ ] 已提交并打 tag

---

## 参考资源

- **海外版 typesetting**：https://github.com/readmigo/typesetting
- **海外版 badge-engine**：https://github.com/readmigo/badge-engine
- **HarmonyOS NDK 文档**：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ndk-overview
- **Git submodule 替代方案**：https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **Semantic Versioning**：https://semver.org/
- **GNU Patch**：https://www.gnu.org/software/patch/manual/

