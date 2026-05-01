# 极狐 GitLab CE 自部署 — 灾备托管节点

## 为什么使用极狐 GitLab CE 而非 GitLab.com

| 维度 | GitLab.com | 极狐 GitLab CE (自部署) |
|------|-----------|------------------------|
| 数据主权 | 数据存储于境外 | 数据完全留存中国大陆 |
| 国内合规 | 不满足数据本地化要求 | 满足等保/MLPS 要求 |
| 访问速度 | 国内访问慢，偶发断连 | 华为云 CN-North-4，延迟 <20ms |
| 网络依赖 | 依赖国际出口带宽 | 无跨境流量 |
| 成本 | 按席位收费 | 服务器固定成本，席位无限 |

极狐 GitLab（JiHu Edition）是 GitLab Inc. 授权的中国本地化版本，代码库与社区版基本同步，
镜像托管于 `registry.gitlab.cn`，无需翻墙即可拉取。

**本节点定位：灾备**。主代码托管为 Gitee 企业版，本节点通过 `mirror-from-gitee.sh` 
每周同步一次，在 Gitee 不可用时提供只读访问和紧急恢复能力。

---

## 服务器规格要求

| 资源 | 最低 | 推荐（当前配置） |
|------|------|-----------------|
| CPU | 2 vCPU | 8 vCPU |
| RAM | 4 GB | 16 GB |
| 系统盘 | 40 GB SSD | 100 GB SSD |
| 数据盘 | — | 额外 200 GB（挂载到 `./data/`）|
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |
| Docker | 24.x | 27.x |

### 云服务器选型

推荐华为云 ECS（与 OBS 备份同区域，减少跨云流量费用）：

- **华为云 CN-North-4（北京四）**：`c7.2xlarge.4` (8C32G) ≈ ¥400/月（包年包月）
- 备选：阿里云 ECS `ecs.c7.2xlarge` (8C16G) ≈ ¥350/月

> 成本估算：服务器 ¥300-500/月 + OBS 存储 ¥10-30/月 + 带宽 ¥0-50/月。
> 灾备节点平时流量极少，选按量付费弹性 IP 可进一步降低成本。

---

## 部署步骤

### 1. 服务器初始化

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | bash
apt-get install -y docker-compose-plugin

# 创建数据目录并设置权限
mkdir -p /opt/gitlab-ce/data/{config,logs,data}
chown -R 998:998 /opt/gitlab-ce/data   # 极狐容器内 git 用户 UID
```

### 2. 配置文件

```bash
git clone <this-repo> /opt/gitlab-ce
cd /opt/gitlab-ce/infra/gitlab-ce

# 创建环境变量文件
cp .env.example .env
vim .env   # 填写 SMTP 密码和 OBS 密钥
```

### 3. DNS 配置

在域名服务商（阿里云 DNS / 华为云 DNS）添加 A 记录：

```
gitlab.readmigo.cn  →  <服务器公网 IP>  TTL: 600
```

DNS 生效后（5-10 分钟），再执行下一步。

### 4. 启动服务

```bash
cd /opt/gitlab-ce/infra/gitlab-ce
docker compose up -d

# 观察启动日志（极狐首次启动约 3-5 分钟）
docker compose logs -f gitlab
```

启动完成标志：日志出现 `gitlab Reconfigured!`

### 5. SSL 证书

极狐 Omnibus 内置 Let's Encrypt 支持，首次启动时自动申请证书。
前提条件：80 端口对外可达（安全组需放行 TCP 80/443）。

若使用阿里云 SSL 证书（免费 DV 证书），下载 Nginx 格式后：

```bash
# 将证书放入 ./data/config/ssl/
cp gitlab.readmigo.cn.pem  ./data/config/ssl/gitlab.readmigo.cn.crt
cp gitlab.readmigo.cn.key  ./data/config/ssl/gitlab.readmigo.cn.key
```

然后在 `GITLAB_OMNIBUS_CONFIG` 中关闭 Let's Encrypt，改为手动指定证书路径。

### 6. 初始管理员密码

```bash
# 首次启动后，临时密码存储在容器内
docker exec -it gitlab-ce grep 'Password:' /etc/gitlab/initial_root_password

# 登录 https://gitlab.readmigo.cn，用 root + 上述临时密码
# 立即修改密码：右上角头像 → Edit Profile → Password
# 临时密码文件 24 小时后自动删除
```

---

## 备份策略

详见 [backup-config.md](./backup-config.md)。

核心流程：GitLab 内置备份命令 → 打包为 `.tar` → 上传华为云 OBS。

---

## 灾备同步 (Gitee → GitLab CE)

详见 [mirror-from-gitee.sh](./mirror-from-gitee.sh)。

同步方向：**Gitee（主） → 极狐 GitLab CE（灾备）**，只读镜像，每周日凌晨 3:00 执行。

### SSH 密钥配置

```bash
# 生成专用 SSH 密钥对（不复用个人密钥）
ssh-keygen -t ed25519 -f /opt/gitlab-mirror/.ssh/mirror_key -C "gitlab-mirror-bot"

# 公钥添加到 Gitee: 设置 → SSH 公钥（只读部署密钥）
# 私钥路径写入 mirror-from-gitee.sh 中的 GITEE_SSH_KEY 变量
```

---

## 升级说明

极狐 GitLab 只支持逐版本升级（不可跨多个大版本）。

```bash
# 修改 docker-compose.yml 中的镜像版本号
# 例: 17.11.1-jh.0 → 17.11.2-jh.0（小版本可直接升级）
docker compose pull gitlab
docker compose up -d gitlab
docker compose logs -f gitlab  # 等待 Reconfigured!
```

跨大版本升级前，务必查阅官方升级路径文档：
https://docs.gitlab.cn/jh/update/index.html

---

## 常见问题

**Q: 容器启动后 502 Bad Gateway**
A: 正常现象，Puma/Sidekiq 需要 3-5 分钟预热，等待即可。

**Q: SSH git push 失败**
A: 检查 SSH 端口是否为 2222（`git remote set-url origin ssh://git@gitlab.readmigo.cn:2222/...`）

**Q: 内存 OOM**
A: 减少 `puma['worker_processes']` 和 `sidekiq['concurrency']`，最低配置 2+5。
