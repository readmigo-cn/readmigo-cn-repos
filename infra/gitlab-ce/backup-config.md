# GitLab CE 备份配置 SOP

## 备份架构

```
极狐 GitLab CE (容器内)
  └─ gitlab-backup create
       └─ /var/opt/gitlab/backups/<timestamp>_gitlab_backup.tar (容器内)
            ↓ 映射到宿主机
       ./data/data/backups/<timestamp>_gitlab_backup.tar
            ↓ GitLab 内置 S3 上传
       华为云 OBS: readmigo-gitlab-backup/<timestamp>_gitlab_backup.tar
```

GitLab Omnibus 原生支持 S3 协议上传备份，华为云 OBS 完全兼容 S3 API，无需额外脚本。

---

## 华为云 OBS 配置

### 创建 OBS Bucket

```bash
# 在华为云控制台创建 Bucket（或使用 obsutil CLI）
# Bucket 名称: readmigo-gitlab-backup  (与 docker-compose.yml 中保持一致)
# 区域:       CN-North-4（与 ECS 同区域，避免跨区流量费用）
# 存储类别:   标准存储（需要快速恢复时使用）
# 权限:       私有，不公开访问
```

### OBS 生命周期策略（7 日 + 4 周 + 12 月留存）

在华为云 OBS 控制台 → Bucket → 生命周期规则中配置：

| 规则名 | 前缀 | 当前版本保留天数 | 非当前版本保留天数 |
|--------|------|----------------|------------------|
| daily-retention | `daily/` | 7 天 | 1 天 |
| weekly-retention | `weekly/` | 28 天 | 1 天 |
| monthly-retention | `monthly/` | 365 天 | 1 天 |

> 注意：GitLab 内置备份不区分 daily/weekly/monthly 前缀，
> 建议通过下方 cron 脚本将备份文件移动到对应前缀路径，
> 或使用华为云 OBS 的版本管理功能替代多前缀方案。

---

## 备份调度

### 方案 A：GitLab 内置备份计划（推荐）

在 `GITLAB_OMNIBUS_CONFIG` 中添加（已在 docker-compose.yml 中预留位置）：

```ruby
# 每日 02:00 北京时间 (UTC 18:00) 自动备份
gitlab_rails['backup_cron_daily'] = true
```

然后在宿主机 crontab 中触发容器内备份：

```cron
# 每日 02:00 北京时间 (CST = UTC+8, 即 UTC 18:00)
0 18 * * * docker exec gitlab-ce gitlab-backup create SKIP=registry 2>&1 | logger -t gitlab-backup
```

### 方案 B：手动触发备份（临时/测试用）

```bash
# 创建备份（跳过 Registry，节省时间和空间）
docker exec gitlab-ce gitlab-backup create SKIP=registry

# 查看备份文件
ls -lh /opt/gitlab-ce/infra/gitlab-ce/data/data/backups/

# 查看上传状态（GitLab 日志中搜索 "Uploading backup archive"）
docker logs gitlab-ce 2>&1 | grep -i backup | tail -20
```

---

## 恢复流程 (Step-by-Step)

> 场景：服务器损坏，需要在新服务器上恢复 GitLab CE

### Step 1: 准备新服务器

按照 README.md 完成服务器初始化和 docker compose up -d 操作。
等待 GitLab 启动完毕（约 5 分钟）。

### Step 2: 从 OBS 下载备份

```bash
# 安装 obsutil（华为云 OBS 命令行工具）
# 下载地址: https://support.huaweicloud.com/utiltg-obs/obs_11_0003.html

obsutil config -i=<OBS_ACCESS_KEY> -k=<OBS_SECRET_KEY> \
  -e=obs.cn-north-4.myhuaweicloud.com

# 列出可用备份
obsutil ls obs://readmigo-gitlab-backup/

# 下载目标备份（替换时间戳）
obsutil cp obs://readmigo-gitlab-backup/1716000000_2026_05_01_17.11.1_gitlab_backup.tar \
  /opt/gitlab-ce/infra/gitlab-ce/data/data/backups/
```

### Step 3: 停止关联服务

```bash
# 必须停止 Puma 和 Sidekiq，保留数据库连接
docker exec gitlab-ce gitlab-ctl stop puma
docker exec gitlab-ce gitlab-ctl stop sidekiq
```

### Step 4: 执行恢复

```bash
# BACKUP 参数为文件名中去掉 _gitlab_backup.tar 的时间戳部分
docker exec -it gitlab-ce gitlab-backup restore \
  BACKUP=1716000000_2026_05_01_17.11.1

# 恢复过程中会提示两次确认（yes），输入 yes 确认
```

### Step 5: 恢复配置文件

```bash
# gitlab.rb 和 gitlab-secrets.json 不包含在 backup 中，需单独备份和恢复
# 建议将 ./data/config/ 目录另行备份到 OBS（手动或 rsync）
obsutil cp obs://readmigo-gitlab-backup/config/gitlab.rb \
  /opt/gitlab-ce/infra/gitlab-ce/data/config/gitlab.rb

obsutil cp obs://readmigo-gitlab-backup/config/gitlab-secrets.json \
  /opt/gitlab-ce/infra/gitlab-ce/data/config/gitlab-secrets.json
```

### Step 6: 重启并验证

```bash
docker exec gitlab-ce gitlab-ctl start
docker exec gitlab-ce gitlab-rake gitlab:check SANITIZE=true
```

验证要点：
- 登录 https://gitlab.readmigo.cn，确认用户和仓库数据完整
- 检查 CI/CD runners 是否重新注册
- 运行一次手动备份确认上传路径正常

---

## 配置文件单独备份（每周）

`gitlab-backup create` 不包含 `gitlab.rb` 和 `gitlab-secrets.json`（含加密密钥）。
这两个文件丢失会导致已加密数据无法解密，必须单独备份。

```cron
# 每周日 02:30 北京时间备份配置文件
30 18 * * 0 tar czf /tmp/gitlab-config-$(date +%Y%m%d).tar.gz \
  /opt/gitlab-ce/infra/gitlab-ce/data/config/gitlab.rb \
  /opt/gitlab-ce/infra/gitlab-ce/data/config/gitlab-secrets.json && \
  obsutil cp /tmp/gitlab-config-$(date +%Y%m%d).tar.gz \
    obs://readmigo-gitlab-backup/config/ 2>&1 | logger -t gitlab-config-backup
```
