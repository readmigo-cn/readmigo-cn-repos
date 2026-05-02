# 华为云部署 SOP

## 背景与目标

米果智读 server-cn（国内后端）部署在华为云基础设施上，满足中国数据合规要求（ICP 备案、数据本地化），同时为国内用户提供低延迟访问。本 SOP 覆盖从资源采购、环境配置、应用部署到运维监控的全流程。

## 架构概览

```mermaid
graph LR
    subgraph internet["互联网"]
        A["iOS / Android / Web 客户端"]
    end
    
    subgraph huawei["华为云基础设施"]
        B["DNS<br/>readmigo.cn"]
        C["WAF<br/>Web 应用防火墙"]
        D["SLB<br/>负载均衡"]
        E1["ECS<br/>server-cn<br/>容器 1"]
        E2["ECS<br/>server-cn<br/>容器 2"]
        F["GaussDB<br/>for PostgreSQL<br/>主从双机"]
        G["DCS<br/>Redis<br/>缓存层"]
        H["OBS<br/>对象存储<br/>书籍/头像/音频"]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E1
    D --> E2
    E1 --> F
    E2 --> F
    E1 --> G
    E2 --> G
    E1 --> H
    E2 --> H
```

**关键组件**：
- **ECS**：Elastic Cloud Server，运行 Docker 化 server-cn
- **GaussDB**：华为云托管 PostgreSQL，支持主从自动故障转移
- **DCS**：Distributed Cache Service (Redis)，支持集群和哨兵模式
- **OBS**：Object Storage Service，CDN 源站
- **SLB**：Scalable Load Balancer，多 ECS 流量分发
- **WAF**：Web Application Firewall，DDoS 防护 + 规则引擎
- **DNS**：华为云云解析服务

---

## 资源采购清单

### ECS（云服务器）

| 项目 | 开发环境 | 生产环境 | 说明 |
|------|---------|---------|------|
| **规格** | c7.xlarge.2 | c7.xlarge.2 | 4 vCPU / 8GB RAM |
| **数量** | 1 台 | 2+ 台 | 生产需 2+ 台以支持滚动更新 |
| **操作系统** | CentOS 8 / Ubuntu 22.04 | CentOS 8 / Ubuntu 22.04 | 推荐 Ubuntu 长期支持版 |
| **公网 IP** | 1 个（临时用） | 2+ 个 或 使用 EIP | 建议使用 EIP 固定 IP |
| **磁盘** | 50 GB 高速 SSD | 100 GB 高速 SSD | /var/lib/docker 容量 |
| **月度成本** | ~¥250-300 | ~¥500-600 (2 台) | 按需计费；包年包月可优惠 20-30% |

### GaussDB for PostgreSQL（数据库）

| 项目 | 配置 | 说明 |
|------|------|------|
| **版本** | PostgreSQL 12 / 13 / 14 | 推荐 PostgreSQL 14+ |
| **规格** | 1 vCPU / 8GB / 30 GB SSD | 开发期可用最小规格；生产期根据数据量升级 |
| **部署方式** | 高可用（主从双机） | 自动故障转移，RPO < 5 秒 |
| **备份** | 自动全量备份 7 天 + 增量 WAL | 支持异地备份到 OBS |
| **连接池** | 内置连接池（max 1000） | TypeORM DataSource 配置 min:5 max:20 |
| **网络** | 仅内网访问 | ECS 白名单配置 |
| **月度成本** | ~¥300-400 | 高可用费用另计 ~¥200 |

### DCS（Redis 缓存）

| 项目 | 配置 | 说明 |
|------|------|------|
| **规格** | 1GB 单机 | 开发期；生产期可升级到集群 |
| **部署** | 单机 / 哨兵 / 集群 | 推荐生产用哨兵模式（3 节点） |
| **淘汰策略** | allkeys-lru | 缓存满时自动淘汰热数据 |
| **持久化** | RDB + AOF | 防止宕机数据丢失 |
| **月度成本** | ~¥50-100 | 集群模式 ~¥200+ |

### OBS（对象存储）

| 项目 | 配置 | 说明 |
|------|------|------|
| **Bucket** | cdn-readmigo-cn | 存储书籍目录、用户头像、音频文件 |
| **存储类型** | 标准存储（标准存储类） | 频繁访问选标准；冷数据可迁移到低频/归档 |
| **容量** | 5GB 起 | 初期书籍量小；可自动扩展 |
| **CDN** | 华为云 CDN | OBS 默认支持 CDN，可配置 CDN 域名 |
| **月度成本** | ~¥20-50 | 存储 ¥0.12/GB + 外网流量 ¥0.50/GB |

### 域名与 DNS

| 项目 | 配置 | 说明 |
|------|------|------|
| **域名** | readmigo.cn | 已在阿里云备案 |
| **子域** | api.readmigo.cn | API 后端 |
| **子域** | cdn.readmigo.cn | CDN 加速（OBS 源） |
| **DNS** | 华为云云解析 或 阿里云 DNS | 建议迁移到华为云以降低延迟 |
| **解析** | A 记录指向 ECS 公网 IP | 支持健康检查自动切换 |

### 月度成本估算

| 组件 | 开发环境 | 生产环境 |
|------|---------|---------|
| ECS (1 或 2 台) | ¥250-300 | ¥500-600 |
| GaussDB | ¥300-400 | ¥500-600 |
| DCS | ¥50-100 | ¥150-200 |
| OBS + CDN | ¥20-50 | ¥50-150 |
| 其他（SLB、WAF、DNS） | ¥0-100 | ¥100-300 |
| **总计** | **¥620-950** | **¥1300-1850** |

> 以上成本为按需计费；若采购包年包月可降低 20-30%。

---

## 部署流程（共 10 步）

### 步骤 1：ECS 创建与安全组配置

#### 1.1 创建 ECS 实例

1. 登录[华为云控制台](https://console.huaweicloud.com/)
2. 导航到**计算 > 弹性云服务器 (ECS)**
3. 点击**创建 ECS**，配置：
   - **区域**：华北 2（北京）或华东 2（上海）
   - **可用区**：任选一个
   - **镜像**：公共镜像 → Ubuntu 22.04 LTS
   - **规格**：c7.xlarge.2（4 vCPU / 8 GB）
   - **存储**：100 GB 高速 SSD
   - **网络**：创建新 VPC (10.0.0.0/16) 或使用现有
   - **公网 IP**：自动分配或使用 EIP（固定 IP）
   - **安全组**：新建，名称 `sg-readmigo-api`

4. 创建后记录：
   - ECS 实例 ID
   - 公网 IP（如 59.110.237.45）
   - 内网 IP（如 10.0.0.10）

#### 1.2 配置安全组规则

在安全组 `sg-readmigo-api` 中添加出站和入站规则：

| 规则类型 | 协议 | 端口 | 源/目的 | 说明 |
|---------|------|------|---------|------|
| 入站 | TCP | 22 | 0.0.0.0/0 | SSH 远程连接（应限制特定 IP） |
| 入站 | TCP | 443 | 0.0.0.0/0 | HTTPS |
| 入站 | TCP | 80 | 0.0.0.0/0 | HTTP（重定向到 HTTPS） |
| 入站 | TCP | 3000 | 10.0.0.0/16 | 内网 Docker 端口 |
| 出站 | ALL | ALL | 0.0.0.0/0 | 所有出站（必需） |

**加固建议**：
- SSH 改用密钥对认证，禁用密码登录
- 限制 SSH 源 IP 到办公网 IP
- 使用 fail2ban 防止暴力破解

---

### 步骤 2：GaussDB 实例创建与配置

#### 2.1 创建 GaussDB for PostgreSQL 实例

1. 登录华为云控制台 → **数据库 > GaussDB for PostgreSQL**
2. 点击**创建 GaussDB 实例**，配置：
   - **版本**：PostgreSQL 14
   - **部署方式**：高可用（主从双机）
   - **规格**：1 vCPU / 8 GB / 30 GB SSD
   - **VPC**：选择与 ECS 相同的 VPC（10.0.0.0/16）
   - **子网**：选择与 ECS 相同的子网
   - **数据库名**：readmigo_cn_prod
   - **数据库用户**：readmigo_prod（非 postgres）
   - **密码**：强密码（大小写 + 数字 + 特殊字符，>20 字）

3. 创建后记录：
   - 主实例 IP：如 10.0.1.20（内网）
   - 数据库 CONNECTION_STRING：`postgresql://readmigo_prod:password@10.0.1.20:5432/readmigo_cn_prod?sslmode=require`

#### 2.2 配置安全组与 IP 白名单

1. 为 GaussDB 安全组添加入站规则：

   | 协议 | 端口 | 源 | 说明 |
   |------|------|-----|------|
   | TCP | 5432 | 10.0.0.10/32 | ECS 1 内网 IP |
   | TCP | 5432 | 10.0.0.11/32 | ECS 2 内网 IP（如果有） |

2. 在 GaussDB 实例详情中配置 **IP 白名单**（推荐，更安全）：
   - 添加 `10.0.0.10/32`、`10.0.0.11/32`

#### 2.3 创建应用用户与数据库

通过 ECS 上的 psql 客户端连接 GaussDB：

```bash
# SSH 登录 ECS
ssh -i key.pem ubuntu@59.110.237.45

# 安装 PostgreSQL 客户端
sudo apt-get install -y postgresql-client-14

# 连接 GaussDB（用 postgres 超级用户）
psql -h 10.0.1.20 -U postgres -d readmigo_cn_prod -W

# 创建应用用户（如果不存在）
CREATE USER readmigo_prod WITH PASSWORD 'xxxxx';
ALTER ROLE readmigo_prod CREATEDB;

# 创建数据库
CREATE DATABASE readmigo_cn_prod OWNER readmigo_prod;

# 授权
GRANT ALL PRIVILEGES ON DATABASE readmigo_cn_prod TO readmigo_prod;
\connect readmigo_cn_prod
GRANT ALL ON SCHEMA public TO readmigo_prod;

# 验证连接
\du          # 查看用户
\l           # 查看数据库
```

---

### 步骤 3：OBS 桶创建与 CDN 配置

#### 3.1 创建 OBS 桶

1. 华为云控制台 → **存储 > 对象存储服务 (OBS)**
2. 点击**创建桶**，配置：
   - **桶名**：cdn-readmigo-cn（全局唯一）
   - **区域**：与 ECS 同区域（华北 2）
   - **存储类型**：标准存储
   - **访问权限**：私有（default）
   - **服务端加密**：启用（推荐）

3. 创建后记录 OBS 访问端点

#### 3.2 配置静态网站托管（可选）

如果 OBS 用于静态网站或 CDN 源：

1. 选中 `cdn-readmigo-cn` 桶
2. 进入**配置 > 静态网站托管**
3. 启用静态网站托管，设置默认首页（通常不需要）

#### 3.3 配置 CDN 加速

1. 进入 OBS 桶 → **配置 > CDN 加速**
2. 启用 CDN，获取 CDN 域名（如 `cdn-readmigo-cn.obs.cn-north-2.myhuaweicloud.com`）
3. 在 DNS 中配置 CNAME：`cdn.readmigo.cn` → `cdn-readmigo-cn.obs.cn-north-2.myhuaweicloud.com`
4. 配置**缓存规则**：
   - `/images/*`：3600 秒（1 小时）
   - `/audio/*`：86400 秒（1 天）
   - 其他：不缓存

#### 3.4 IAM 权限配置

为 server-cn 创建 IAM 用户以上传文件到 OBS：

1. 华为云控制台 → **安全与合规 > IAM**
2. 创建新用户：`readmigo-app-user`
3. 为其添加权限：
   - 服务：OBS
   - 权限：OBS Buckets Operator 或自定义最小权限（仅允许访问 `cdn-readmigo-cn`）
4. 创建访问密钥 (Access Key + Secret Key)
5. 在 server-cn `.env` 中配置：

   ```bash
   OBS_ACCESS_KEY=xxxxx
   OBS_SECRET_KEY=xxxxx
   OBS_BUCKET=cdn-readmigo-cn
   OBS_REGION=cn-north-2
   ```

---

### 步骤 4：DCS (Redis) 创建

#### 4.1 创建 DCS 实例

1. 华为云控制台 → **数据库 > 分布式缓存服务 (DCS)**
2. 点击**创建缓存实例**，配置：
   - **缓存引擎**：Redis
   - **版本**：Redis 6.0 或 7.0
   - **规格**：1 GB 单机（开发）或 8 GB 哨兵（生产）
   - **VPC/子网**：与 ECS 同网络
   - **密码**：强密码（需要）

3. 创建后记录：
   - DCS 内网 IP：10.0.2.30
   - REDIS_URL：`redis://:password@10.0.2.30:6379/0`

#### 4.2 配置 Eviction Policy

1. 进入 DCS 实例 → **参数配置**
2. 设置 `maxmemory-policy`：`allkeys-lru`（热数据驱逐）
3. 设置 `appendonly`：`yes`（AOF 持久化）

#### 4.3 监控与告警

1. 进入 DCS 实例 → **监控**
2. 关注指标：
   - 内存使用率 > 80% → 告警
   - 连接数 > 1000 → 告警
   - 慢查询日志（> 10ms）

---

### 步骤 5：ECS 安装 Docker 与 docker-compose

#### 5.1 连接 ECS 并安装 Docker

```bash
# SSH 登录 ECS
ssh -i readmigo-key.pem ubuntu@59.110.237.45

# 更新系统包
sudo apt-get update && sudo apt-get upgrade -y

# 安装 Docker（官方源）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 将当前用户加入 docker 组（避免每次都 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证 Docker 安装
docker --version
docker run hello-world

# 安装 docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 5.2 配置 Docker daemon

编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://mirror.aliyuncs.com",
    "https://registry.docker-cn.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

重启 Docker：

```bash
sudo systemctl restart docker
```

---

### 步骤 6：从华为云 SWR 拉取 server-cn 镜像

#### 6.1 配置 SWR 认证

1. 华为云控制台 → **计算 > 容器镜像服务 (SWR)**
2. 记录你的**组织名**和**登录地址**（如 `swr.cn-north-2.myhuaweicloud.com`）
3. 生成**临时登录指令**或使用永久访问密钥

在 ECS 上登录 SWR：

```bash
docker login swr.cn-north-2.myhuaweicloud.com -u cn-north-2@XXXXXX -p <password>
```

#### 6.2 拉取或推送镜像

**假设 CI/CD 已构建镜像到 SWR**（见 CI/CD 配置章节），从 ECS 拉取：

```bash
# 拉取镜像
docker pull swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:latest

# 查看镜像
docker images
```

---

### 步骤 7：启动应用（docker-compose up）

#### 7.1 创建 docker-compose.yml（用于生产）

在 ECS 的 `/opt/readmigo/` 目录下：

```bash
mkdir -p /opt/readmigo/server-cn
cd /opt/readmigo/server-cn
```

创建 `docker-compose.yml`：

```yaml
version: '3.9'

services:
  server-cn:
    image: swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:latest
    container_name: server-cn
    restart: always
    ports:
      - "3000:3000"  # 内部容器端口
    environment:
      NODE_ENV: production
      PORT: 3000
      API_PREFIX: /api/v1
      DATABASE_URL: postgresql://readmigo_prod:${DB_PASS}@10.0.1.20:5432/readmigo_cn_prod?sslmode=require
      REDIS_URL: redis://:${REDIS_PASS}@10.0.2.30:6379/0
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      QWEN_API_KEY: ${QWEN_API_KEY}
      OBS_ACCESS_KEY: ${OBS_ACCESS_KEY}
      OBS_SECRET_KEY: ${OBS_SECRET_KEY}
      OBS_BUCKET: cdn-readmigo-cn
      OBS_REGION: cn-north-2
    volumes:
      - /var/log/readmigo:/var/log/readmigo
    networks:
      - readmigo-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  readmigo-net:
    driver: bridge
```

#### 7.2 创建 .env.production

在同目录创建 `.env.production`：

```bash
# 从华为云密钥管理服务（KMS）或 Secrets Manager 安全获取
DB_PASS=<from-secrets-manager>
REDIS_PASS=<from-secrets-manager>
JWT_SECRET=<from-secrets-manager>
JWT_REFRESH_SECRET=<from-secrets-manager>
DEEPSEEK_API_KEY=<from-secrets-manager>
QWEN_API_KEY=<from-secrets-manager>
OBS_ACCESS_KEY=<from-secrets-manager>
OBS_SECRET_KEY=<from-secrets-manager>
```

#### 7.3 启动容器

```bash
cd /opt/readmigo/server-cn
docker-compose up -d

# 查看日志
docker-compose logs -f server-cn

# 验证容器运行
docker-compose ps
docker exec server-cn curl http://localhost:3000/api/v1/health
```

---

### 步骤 8：Nginx 反向代理与 SSL 配置

#### 8.1 安装 Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 8.2 配置反向代理

编辑 `/etc/nginx/sites-available/readmigo-api`：

```nginx
upstream backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.readmigo.cn;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.readmigo.cn;

    # SSL 证书路径（由 Let's Encrypt 或华为云 SSL 提供）
    ssl_certificate /etc/letsencrypt/live/api.readmigo.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.readmigo.cn/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Gzip 压缩
    gzip on;
    gzip_types application/json text/plain;
    gzip_min_length 1024;

    # 反向代理
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        proxy_buffering off;
        
        # WebSocket 支持（如需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 健康检查端点
    location /api/v1/health {
        proxy_pass http://backend;
        access_log off;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/readmigo-api /etc/nginx/sites-enabled/readmigo-api
sudo nginx -t
sudo systemctl reload nginx
```

#### 8.3 申请 SSL 证书

**方案 A：Let's Encrypt（自动续期）**

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.readmigo.cn
# 或通过 Nginx plugin（推荐自动化）
sudo certbot certonly --nginx -d api.readmigo.cn
```

设置自动续期：

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**方案 B：华为云 SSL 证书（企业级）**

1. 华为云控制台 → **安全与合规 > SSL 证书管理**
2. 申请或导入证书
3. 下载证书文件到 `/etc/letsencrypt/live/api.readmigo.cn/`

---

### 步骤 9：DNS 配置（A 记录指向 ECS）

#### 9.1 华为云云解析（推荐）

1. 华为云控制台 → **网络 > 云解析服务**
2. 创建或选择域名 `readmigo.cn`
3. 添加记录：

   | 名称 | 类型 | 值 | TTL |
   |------|------|-----|-----|
   | api | A | 59.110.237.45 | 300 |
   | cdn | CNAME | cdn-readmigo-cn.obs.cn-north-2.myhuaweicloud.com | 300 |

4. 验证 DNS 生效：

   ```bash
   nslookup api.readmigo.cn
   dig api.readmigo.cn
   ```

#### 9.2 健康检查配置（SLB 时）

如使用 SLB 负载均衡，配置健康检查：

1. 华为云控制台 → **网络 > 弹性负载均衡 (ELB)**
2. 创建 SLB，后端服务器组指向 2+ ECS
3. 配置监听器：
   - 协议：TCP
   - 端口：443
   - 后端端口：3000
4. 配置**健康检查**：
   - 协议：HTTP
   - 路径：/api/v1/health
   - 间隔：10 秒
   - 超时：3 秒
   - 健康阈值：2
   - 不健康阈值：3

5. 修改 DNS A 记录指向 SLB 公网 IP

---

### 步骤 10：监控与告警配置

#### 10.1 启用云监控

1. 华为云控制台 → **管理与治理 > 云监控服务**
2. 为 ECS、GaussDB、DCS、OBS 添加监控

#### 10.2 关键指标与告警规则

| 资源 | 指标 | 阈值 | 告警等级 |
|------|------|------|---------|
| ECS | CPU 使用率 | > 80% | 警告 |
| ECS | 内存使用率 | > 85% | 警告 |
| ECS | 磁盘使用率 | > 80% | 警告 |
| ECS | 网络出站速率 | > 100 Mbps | 信息 |
| GaussDB | CPU 使用率 | > 85% | 告警 |
| GaussDB | 存储使用率 | > 90% | 告警 |
| GaussDB | 连接数 | > 800 | 警告 |
| GaussDB | 慢查询 | 任何 > 1s | 告警 |
| DCS | 内存使用率 | > 80% | 警告 |
| DCS | 连接数 | > 100 | 警告 |

#### 10.3 日志收集与分析

配置日志聚合（可选）：

1. 华为云 **日志服务 (LTS)** 或 Sentry
2. 配置 Fluentd/Logstash 将 Docker 日志发送到 LTS
3. 在应用中集成 Sentry 以追踪错误

---

## CI/CD 配置（Gitee Actions）

### 构建 → 推送 → 部署流程

#### 11.1 Gitee Actions Workflow 文件

在 server-cn 仓库创建 `.gitea/workflows/deploy.yml`：

```yaml
name: Deploy to Huawei Cloud

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      # 1. 拉取代码
      - uses: actions/checkout@v3
      
      # 2. 构建 Docker 镜像
      - name: Build Docker Image
        run: |
          docker build -t swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:latest .
          docker build -t swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:${{ github.sha }} .
      
      # 3. 登录 SWR
      - name: Login to SWR
        run: |
          docker login -u cn-north-2@${{ secrets.SWR_USER }} \
            -p ${{ secrets.SWR_PASSWORD }} \
            swr.cn-north-2.myhuaweicloud.com
      
      # 4. 推送镜像
      - name: Push to SWR
        run: |
          docker push swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:latest
          docker push swr.cn-north-2.myhuaweicloud.com/<org>/server-cn:${{ github.sha }}
      
      # 5. SSH 连接 ECS 并更新
      - name: Deploy to ECS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ubuntu
          key: ${{ secrets.ECS_SSH_KEY }}
          script: |
            cd /opt/readmigo/server-cn
            docker-compose pull
            docker-compose up -d
            docker-compose logs --tail=20 server-cn
```

#### 11.2 蓝绿部署策略（可选）

对于零停机部署，使用蓝绿策略：

1. 运行 2 个 ECS（blue + green）
2. 将流量切到 green，在 blue 上部署新版本
3. 测试通过后切流量回 blue，再在 green 上更新
4. 使用 SLB 实现快速流量切换

#### 11.3 滚动更新策略

如使用 Kubernetes（华为云 CCE），配置 Deployment 的滚动更新：

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

---

## 数据库管理

### 备份策略

#### 12.1 GaussDB 自动备份

GaussDB 已内置：
- **自动全量备份**：每日执行，保留 7 天
- **增量 WAL 日志**：连续写入，支持时间点恢复（PITR）

在华为云控制台配置：

1. GaussDB 实例 → **备份与恢复**
2. 设置**备份保留期**：
   - 开发环境：7 天
   - 生产环境：30 天
3. 设置**异地备份**：启用，备份到 OBS（跨区域）

#### 12.2 手动备份

```bash
# 连接 GaussDB
psql -h 10.0.1.20 -U readmigo_prod -d readmigo_cn_prod -W

# 逻辑备份（全库）
pg_dump -h 10.0.1.20 -U readmigo_prod readmigo_cn_prod > backup.sql

# 压缩
gzip backup.sql

# 上传到 OBS
obsutil cp backup.sql.gz obs://cdn-readmigo-cn/backups/
```

#### 12.3 灾备演练

每月执行一次恢复测试：

1. 在开发环境创建临时 RDS 实例
2. 从生产备份恢复数据
3. 验证数据完整性
4. 记录恢复时间（RTO）
5. 清理临时实例

### 数据库迁移

#### 12.4 TypeORM 迁移管理

```bash
# 在 ECS 上执行迁移
docker exec server-cn npm run db:migrate

# 查看迁移历史
docker exec server-cn npm run db:migrate -- --showMigrations

# 回滚最后一次迁移（仅开发用）
docker exec server-cn npm run db:revert
```

---

## 安全加固

### SSH 访问控制

#### 13.1 禁用密码登录，仅允许密钥对

编辑 `/etc/ssh/sshd_config`：

```bash
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
X11Forwarding no
MaxAuthTries 3
```

重启 SSH：

```bash
sudo systemctl restart ssh
```

#### 13.2 配置 fail2ban 防暴力破解

```bash
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# 编辑 /etc/fail2ban/jail.local
[sshd]
enabled = true
maxretry = 3
findtime = 600
bantime = 3600
```

### 数据库安全

#### 13.3 GaussDB 强密码策略

1. 在 GaussDB 创建用户时设置强密码（>20 字符）
2. 定期轮换密码（每 90 天）
3. 启用 SSL 连接（sslmode=require）

#### 13.4 IP 白名单

在 GaussDB 或安全组中仅允许 ECS 的内网 IP 连接数据库端口。

### Web 应用防火墙

#### 13.5 启用 WAF（企业级）

1. 华为云控制台 → **安全与合规 > Web 应用防火墙 (WAF)**
2. 创建防护域名：api.readmigo.cn
3. 配置规则：
   - SQL 注入防护
   - XSS 防护
   - 路径遍历防护
   - 速率限制

### HTTPS 强制

#### 13.6 HSTS 头配置

在 Nginx 配置中添加：

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## 故障应急

### ECS 失联

#### 14.1 单机部署（开发）

如果 ECS 宕机，手动创建新 ECS 并恢复数据库连接。

#### 14.2 多机部署（生产）

1. 使用 SLB 负载均衡，流量自动切到健康的 ECS
2. 启动新 ECS 实例，加入 SLB 后端
3. 监控 Sentry 和日志，检查是否有请求失败

### 数据库故障

#### 14.3 GaussDB 主从切换

GaussDB 主从自动故障转移（< 30 秒），无需手动干预。

#### 14.4 数据丢失恢复

1. 停止应用，防止写入
2. 在华为云控制台 → GaussDB 实例 → **备份与恢复** → **恢复**
3. 选择备份点（支持时间点恢复）
4. 确认恢复后重启应用

### DDoS 攻击

#### 14.5 启用 Anti-DDoS

1. 华为云控制台 → **安全与合规 > DDoS 防护 (Anti-DDoS)**
2. 为 ECS 公网 IP 绑定防护
3. 配置防护阈值和清洗策略

---

## 成本优化

### 包年包月 vs 按需

- **开发环境**：按需（可随时关闭）
- **生产环境**：建议包年包月，降低成本 20-30%

### 闲时缩容

对 ECS 配置自动扩缩容（需要使用华为云 Auto Scaling）：

1. 定义扩缩容规则（基于 CPU 或时间表）
2. 夜间自动减少实例数（如 2 → 1）
3. 早晨恢复为 2 实例

### OBS 冷存储

1. 对历史数据（> 30 天）转换为低频/归档存储
2. 降低存储成本至标准存储的 50%

---

## 米果智读项目状态

| 项目 | 状态 | 关键参数 |
|------|------|---------|
| **部署阶段** | W3 SOP 写作中，实际部署 W3-W4 进行 | — |
| **iOS Bundle ID** | com.readmigo.app | 需在 app 中配置 API 地址 |
| **Android Package** | com.readmigo.app | 同上 |
| **API 基础 URL** | https://api.readmigo.cn/api/v1 | 客户端需配置 |
| **数据库 Schema** | readmigo_cn_prod | 与 server-cn TypeORM 配置对应 |
| **当前约束** | 无数据库、无鉴权、无 AGC 校验 | 见 README.md |

---

## 检查清单

部署前请确认以下项目已完成：

- [ ] ECS 创建、安全组配置完成
- [ ] GaussDB 实例创建、用户和数据库已创建
- [ ] OBS 桶创建、CDN 配置完成
- [ ] DCS Redis 实例创建并配置好 eviction policy
- [ ] DNS A 记录指向 ECS 公网 IP
- [ ] SSL 证书申请并配置到 Nginx
- [ ] Docker & docker-compose 已安装
- [ ] SWR 镜像已推送
- [ ] docker-compose.yml 和 .env.production 已配置
- [ ] Nginx 反向代理已配置
- [ ] 数据库迁移脚本已在 ECS 运行（`npm run db:migrate`）
- [ ] 健康检查端点验证：`curl https://api.readmigo.cn/api/v1/health`
- [ ] 监控告警已配置
- [ ] 备份策略已启用
- [ ] WAF、Anti-DDoS 已启用（生产）

---

*最后更新：2026-05-01*
