variable "aws_region" {
  description = "AWS region for the CMS stack"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project prefix for CMS resources"
  type        = string
  default     = "anchor-blog-manager"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "allowed_origins" {
  description = "Allowed CORS origins for the admin frontend"
  type        = list(string)
  default = [
    "https://www.anchorwebco.com.au",
    "https://anchorwebco.com.au"
  ]
}

variable "posts_table_name" {
  description = "DynamoDB table name for all CMS posts"
  type        = string
  default     = "anchor_blog_manager_posts"
}

variable "media_bucket_name" {
  description = "S3 bucket for CMS-uploaded media. Leave empty to generate one."
  type        = string
  default     = ""
}

variable "sites_config_parameter_name" {
  description = "SSM SecureString parameter containing CMS site config JSON"
  type        = string
  default     = "/anchor-blog-manager/sites-config"
}

variable "github_token_parameter_name" {
  description = "SSM SecureString parameter containing GitHub token for workflow dispatch"
  type        = string
  default     = "/anchor-blog-manager/github-token"
}

variable "site_configs" {
  description = "Reusable CMS site configurations. Password hashes should be generated with cms/lambda hashPasswordForSetup."
  type = list(object({
    siteId         = string
    username       = string
    passwordHash   = string
    githubOwner    = string
    githubRepo     = string
    githubWorkflow = optional(string, "deploy.yml")
    githubRef      = optional(string, "main")
  }))
  sensitive = true
  default = []
}

variable "github_token_placeholder" {
  description = "Placeholder GitHub token value. Overwrite this SSM parameter after deploy."
  type        = string
  sensitive   = true
  default     = "REPLACE_ME"
}

variable "lambda_memory_mb" {
  description = "Lambda memory size"
  type        = number
  default     = 512
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout"
  type        = number
  default     = 30
}

variable "api_rate_limit" {
  description = "API Gateway steady-state requests per second"
  type        = number
  default     = 10
}

variable "api_burst_limit" {
  description = "API Gateway burst requests"
  type        = number
  default     = 20
}

variable "log_retention_days" {
  description = "CloudWatch log retention"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Optional tags applied to resources"
  type        = map(string)
  default     = {}
}
