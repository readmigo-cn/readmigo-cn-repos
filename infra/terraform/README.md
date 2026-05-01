# Terraform - 华为云 IaC

## 前置条件

```bash
brew install terraform
terraform -v   # >= 1.6
```

环境变量（华为云 AK/SK）：

```bash
export HW_ACCESS_KEY=...
export HW_SECRET_KEY=...
export HW_REGION=cn-north-4
```

## 操作

```bash
# 仅初始化 + 校验（不创建任何资源）— 第一批阶段只跑这两条
terraform init
terraform validate

# Plan 看资源变化（不 apply）
terraform plan -var-file=staging.tfvars

# Apply（要钱了！等 ICP 通过 + 业务代码 ready 再做）
terraform apply -var-file=staging.tfvars
```

## 文件说明

- `versions.tf` — provider 版本锁定
- `variables.tf` — 所有参数化的变量
- `staging.tf` — 预发环境：单 ECS + 单实例 GaussDB
- `prod.tf` — 生产环境：双 ECS + 主备 GaussDB（W14+ 上线时启用）
- `staging.tfvars.example` — 参数样例（实际 .tfvars 不入库）

## State 存储

state 文件存到华为云 OBS（远程后端），避免本地丢失：

```hcl
# versions.tf
terraform {
  backend "s3" {
    endpoint = "https://obs.cn-north-4.myhuaweicloud.com"
    bucket   = "readmigo-cn-tfstate"
    key      = "staging/terraform.tfstate"
    region   = "cn-north-4"
    skip_credentials_validation = true
    skip_region_validation      = true
  }
}
```
