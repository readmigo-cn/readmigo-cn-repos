###############################################################################
# Staging environment — 单 ECS + 单 GaussDB + DCS + OBS
# 注意：本文件只是描述。实际 apply 前需：
#   1. ICP 备案通过
#   2. 华为云账号完成企业实名
#   3. tfvars 文件填写 access_key/secret_key
###############################################################################

# ----------------------- VPC -----------------------
resource "huaweicloud_vpc" "main" {
  name = "readmigo-cn-${var.env}-vpc"
  cidr = "10.0.0.0/16"
}

resource "huaweicloud_vpc_subnet" "app" {
  name       = "readmigo-cn-${var.env}-app-subnet"
  vpc_id     = huaweicloud_vpc.main.id
  cidr       = "10.0.1.0/24"
  gateway_ip = "10.0.1.1"
}

resource "huaweicloud_vpc_subnet" "data" {
  name       = "readmigo-cn-${var.env}-data-subnet"
  vpc_id     = huaweicloud_vpc.main.id
  cidr       = "10.0.2.0/24"
  gateway_ip = "10.0.2.1"
}

# ----------------------- 安全组 -----------------------
resource "huaweicloud_networking_secgroup" "app" {
  name        = "readmigo-cn-${var.env}-app-sg"
  description = "Application security group"
}

resource "huaweicloud_networking_secgroup_rule" "app_in_https" {
  security_group_id = huaweicloud_networking_secgroup.app.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
}

resource "huaweicloud_networking_secgroup_rule" "app_in_ssh" {
  security_group_id = huaweicloud_networking_secgroup.app.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  # 只允许办公网 IP，apply 时改成实际值
  remote_ip_prefix = "10.0.0.0/16"
}

# ----------------------- ECS -----------------------
data "huaweicloud_images_image" "ubuntu" {
  name        = "Ubuntu 22.04 server 64bit"
  most_recent = true
}

resource "huaweicloud_compute_instance" "app" {
  count             = var.ecs_count
  name              = "readmigo-cn-${var.env}-app-${count.index + 1}"
  image_id          = data.huaweicloud_images_image.ubuntu.id
  flavor_id         = var.ecs_flavor
  security_group_ids = [huaweicloud_networking_secgroup.app.id]
  availability_zone = "cn-north-4a"

  network {
    uuid = huaweicloud_vpc_subnet.app.id
  }
}

# ----------------------- GaussDB(for PostgreSQL) -----------------------
# 真实创建走 GaussDB Console 更省心；这里给个最简描述。Staging 用 RDS PG 也可以。
resource "huaweicloud_rds_instance" "pg" {
  name              = "readmigo-cn-${var.env}-pg"
  flavor            = "rds.pg.n1.large.2"
  availability_zone = ["cn-north-4a"]
  security_group_id = huaweicloud_networking_secgroup.app.id
  subnet_id         = huaweicloud_vpc_subnet.data.id
  vpc_id            = huaweicloud_vpc.main.id

  db {
    type     = "PostgreSQL"
    version  = "16"
    password = "REPLACE_ME_VIA_TFVARS"
    port     = 5432
  }

  volume {
    type = "ULTRAHIGH"
    size = var.gaussdb_storage_gb
  }
}

# ----------------------- OBS 桶 -----------------------
resource "huaweicloud_obs_bucket" "books" {
  bucket = "readmigo-cn-${var.env}-books"
  acl    = "private"
}

resource "huaweicloud_obs_bucket" "covers" {
  bucket = "readmigo-cn-${var.env}-covers"
  acl    = "public-read"
}

resource "huaweicloud_obs_bucket" "user_uploads" {
  bucket = "readmigo-cn-${var.env}-user-uploads"
  acl    = "private"
}

# ----------------------- DCS Redis -----------------------
resource "huaweicloud_dcs_instance" "redis" {
  name              = "readmigo-cn-${var.env}-redis"
  engine_version    = "6.0"
  capacity          = 1
  flavor            = "redis.ha.xu1.large.r2.1"
  availability_zones = ["cn-north-4a"]
  vpc_id            = huaweicloud_vpc.main.id
  subnet_id         = huaweicloud_vpc_subnet.data.id
}

# ----------------------- 输出 -----------------------
output "app_ip" {
  value = huaweicloud_compute_instance.app[*].access_ip_v4
}

output "pg_address" {
  value     = huaweicloud_rds_instance.pg.private_ips
  sensitive = true
}

output "redis_address" {
  value     = huaweicloud_dcs_instance.redis.ip
  sensitive = true
}
