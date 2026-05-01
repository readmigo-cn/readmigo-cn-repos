variable "region" {
  description = "Huawei Cloud region"
  type        = string
  default     = "cn-north-4"
}

variable "access_key" {
  description = "Huawei Cloud Access Key"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "Huawei Cloud Secret Key"
  type        = string
  sensitive   = true
}

variable "env" {
  description = "Environment: staging | prod"
  type        = string
  default     = "staging"
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "readmigo.cn"
}

variable "ecs_flavor" {
  description = "ECS instance flavor"
  type        = string
  default     = "c7.large.2"
}

variable "ecs_count" {
  description = "Number of ECS instances"
  type        = number
  default     = 1
}

variable "gaussdb_flavor" {
  description = "GaussDB instance flavor"
  type        = string
  default     = "gaussdb.opengauss.ee.dn.m4.2xlarge.4.in"
}

variable "gaussdb_storage_gb" {
  description = "GaussDB storage size in GB"
  type        = number
  default     = 100
}
