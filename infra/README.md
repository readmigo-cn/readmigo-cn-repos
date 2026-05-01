# 国内化基础设施（Infrastructure）

本目录管理 Readmigo 鸿蒙版的所有云基础设施声明。**所有资源跑在华为云 cn-north-4（北京）**。

## 目录结构

```
infra/
├── terraform/         # IaC：华为云资源声明（不自动 apply）
│   ├── staging.tf     # 预发环境（最小配置）
│   ├── prod.tf        # 生产环境（双 ECS + 主备 GaussDB）
│   ├── variables.tf   # 变量定义
│   └── README.md      # 操作手册
├── k8s/               # Helm chart 占位（流量起来后切 CCE）
└── README.md
```

## 资源清单（最小生产）

| 资源 | 规格 | 月费估算 |
|------|------|---------|
| ECS × 2 (c7.large.2) | 2 vCPU 4 GB | ¥350 |
| GaussDB(PG) 主备 | 4 vCPU 16 GB 100 GB | ¥600 |
| DCS Redis 6 主备 | 1 GB | ¥80 |
| OBS 标准 × 3 桶 | 50 GB | ¥30 |
| CDN 大陆加速 | 100 GB/月 | ¥30 |
| ELB 共享型 | — | ¥30 |
| APIG 共享版 | 100 万次/月 | ¥0 |
| WAF 标准版 | — | ¥150 |
| Anti-DDoS 基础 | — | 免费 |
| SCM SSL × 1 | — | ¥0（首次免费）|
| DNS 公网解析 | — | ¥0 |
| LTS / AOM | — | ¥50 |
| **合计** | | **~¥1,320/月** |

> Staging 单实例约 ¥500/月。

## 开通顺序（人工，第一批暂不 apply Terraform）

1. **华为云账号实名认证**（企业认证 1-3 个工作日）
2. **AppGallery Connect 项目创建**：bundleId `com.readmigo.harmony.cn` → 下载 `agconnect-services.json`
3. **域名 readmigo.cn ICP 备案**（已在进行中，参见 `compliance/icp/`）
4. ICP 通过后再继续：
   - 备案号录入 → 华为云 DNS 解析
   - 申请 SCM SSL 证书（免费）
   - 开 ECS / GaussDB / OBS / DCS / CDN
   - 配置 WAF + ELB + APIG
5. CI/CD：Gitee Actions 配置部署到 ECS（W2-W3）

## CI/CD

- **代码托管**：Gitee 企业版（origin）+ 极狐 GitLab CE 自部署灾备
- **CI**：Gitee Go（兼容 GitHub Actions yml 语法）
- **CD**：Gitee Go → 推 Docker 镜像到华为云 SWR → ECS 拉镜像启动

## 安全基线

- 所有 ECS 公网 IP **关闭**，只开 ELB
- 数据库 / Redis 走 VPC 内网，安全组只允许 ECS 访问
- 所有密钥用华为云 KMS 托管，CI 通过 IAM 角色拿
- HTTPS 强制（HSTS），TLS 1.2+
- 应用层日志脱敏：禁止记录 token / 手机号明文

## 第一批不 apply 的原因

避免在 ICP 还没下来、无法对外服务时白烧钱。Terraform 文件只描述拓扑，等：
1. ICP 备案通过
2. 华为云账号企业认证通过
3. 业务代码可部署

三件事齐全后才执行 `terraform apply`。
