#!/usr/bin/env bash
# mirror-from-gitee.sh — 从 Gitee 镜像仓库到极狐 GitLab CE（灾备同步）
#
# 用途:   单向同步 Gitee（主托管）→ 极狐 GitLab CE（灾备），保持灾备节点与主节点一致
# 方向:   Gitee (read-only) → GitLab CE (push)
# 幂等性: 已存在的镜像目录直接 fetch + push，无需删除重建
# 触发:   建议通过 cron 每周执行一次（非业务高峰时段）
#
# Cron 示例 (root crontab):
#   0 3 * * 0 /opt/gitlab-mirror/mirror-from-gitee.sh >> /var/log/gitlab-mirror.log 2>&1
#   (每周日 03:00 北京时间执行，UTC 换算: 0 19 * * 6)
#
# 前置条件:
#   1. /opt/gitlab-mirror/.ssh/mirror_key       — Gitee 只读部署密钥（私钥）
#   2. /opt/gitlab-mirror/.ssh/mirror_push_key  — GitLab CE 推送密钥（私钥）
#   3. 对应公钥分别添加到 Gitee 和极狐 GitLab CE
#   4. 首次运行前: ssh-keyscan gitlab.readmigo.cn >> ~/.ssh/known_hosts
#      (或在 GIT_SSH_COMMAND 中加 -o StrictHostKeyChecking=no，但不推荐生产环境使用)

set -euo pipefail

# ─── 配置区（修改此处以适配实际环境）────────────────────────────────────────

# Gitee 组织名（SSH 拉取用）
GITEE_ORG="readmigo"

# 极狐 GitLab CE 域名和组织/命名空间
GITLAB_HOST="gitlab.readmigo.cn"
GITLAB_NAMESPACE="readmigo"  # GitLab CE 上的 group 或 username

# SSH 密钥路径（占位符，部署时替换为实际路径）
GITEE_SSH_KEY="/opt/gitlab-mirror/.ssh/mirror_key"         # Gitee 只读部署密钥
GITLAB_SSH_KEY="/opt/gitlab-mirror/.ssh/mirror_push_key"   # GitLab CE 推送密钥

# 本地镜像工作目录（--mirror clone 存储位置）
MIRROR_DIR="/opt/gitlab-mirror/repos"

# 日志文件（cron 重定向输出时此变量不生效，仅供直接运行时使用）
LOG_FILE="/var/log/gitlab-mirror.log"

# 需要同步的仓库列表（Gitee repo name = GitLab repo name）
# 格式: 一行一个仓库名，与 Gitee/GitLab 上的 repo slug 完全一致
REPOS=(
  "ios"
  "android"
  "api"
  "web"
  "docs"
  # <PLACEHOLDER: 按实际仓库列表补充>
)

# ─── 工具函数 ────────────────────────────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"
}

# 构造带专用 SSH 密钥的 GIT_SSH_COMMAND
git_with_key() {
  local key="$1"; shift
  GIT_SSH_COMMAND="ssh -i ${key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
    git "$@"
}

# ─── 主逻辑 ──────────────────────────────────────────────────────────────────

mkdir -p "${MIRROR_DIR}"

FAILED=()

for REPO in "${REPOS[@]}"; do
  GITEE_URL="git@gitee.com:${GITEE_ORG}/${REPO}.git"
  GITLAB_URL="git@${GITLAB_HOST}:${GITLAB_NAMESPACE}/${REPO}.git"
  LOCAL_PATH="${MIRROR_DIR}/${REPO}.git"

  log "── 开始同步: ${REPO}"

  # Step 1: 克隆或更新本地镜像
  if [ -d "${LOCAL_PATH}" ]; then
    log "  [fetch] 更新已有镜像: ${LOCAL_PATH}"
    git_with_key "${GITEE_SSH_KEY}" -C "${LOCAL_PATH}" fetch --prune origin
  else
    log "  [clone] 首次克隆: ${GITEE_URL}"
    git_with_key "${GITEE_SSH_KEY}" clone --mirror "${GITEE_URL}" "${LOCAL_PATH}"
  fi

  # Step 2: 推送到极狐 GitLab CE
  # --mirror 会同步所有分支、标签和 refs，保持与 Gitee 完全一致
  log "  [push]  推送到极狐 GitLab CE: ${GITLAB_URL}"
  if git_with_key "${GITLAB_SSH_KEY}" -C "${LOCAL_PATH}" push --mirror "${GITLAB_URL}"; then
    log "  [ok]    ${REPO} 同步成功"
  else
    log "  [FAIL]  ${REPO} 推送失败，已记录，继续下一个"
    FAILED+=("${REPO}")
  fi
done

# ─── 汇总报告 ────────────────────────────────────────────────────────────────

log "── 同步完成: ${#REPOS[@]} 个仓库，失败 ${#FAILED[@]} 个"

if [ ${#FAILED[@]} -gt 0 ]; then
  log "失败列表: ${FAILED[*]}"
  # 非零退出码，cron 可通过 MAILTO 收到告警邮件
  exit 1
fi

exit 0
