variable "aws_region" {
  description = "AWS region for the health check stack"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project prefix for created resources"
  type        = string
  default     = "anchor-health-check"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "allowed_origins" {
  description = "Allowed CORS origins for API requests"
  type        = list(string)
  default = [
    "https://www.anchorwebco.com.au",
    "https://anchorwebco.com.au"
  ]

  validation {
    condition     = length(var.allowed_origins) > 0
    error_message = "allowed_origins must include at least one domain."
  }
}

variable "pagespeed_api_key_parameter_name" {
  description = "SecureString parameter name that stores the Google PageSpeed API key"
  type        = string
  default     = "/anchor-web-co/health-check/pagespeed-api-key"
}

variable "pagespeed_api_key_placeholder" {
  description = "Placeholder value used on initial creation. Replace it after deploy with aws ssm put-parameter --overwrite"
  type        = string
  default     = "REPLACE_ME"
  sensitive   = true
}

variable "runs_table_name" {
  description = "DynamoDB table for saved health check runs"
  type        = string
  default     = "health_check_runs"
}

variable "rate_limit_table_name" {
  description = "DynamoDB table for per-IP rate limiting"
  type        = string
  default     = "health_check_rate_limits"
}

variable "lambda_memory_mb" {
  description = "Lambda memory size"
  type        = number
  default     = 1024
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout"
  type        = number
  default     = 45
}

variable "pagespeed_timeout_ms" {
  description = "Timeout in milliseconds for each PageSpeed call"
  type        = number
  default     = 18000
}

variable "api_rate_limit" {
  description = "API Gateway stage-level steady-state requests per second"
  type        = number
  default     = 5
}

variable "api_burst_limit" {
  description = "API Gateway stage-level burst requests"
  type        = number
  default     = 10
}

variable "per_ip_max_requests" {
  description = "Max requests per IP in the configured window"
  type        = number
  default     = 10
}

variable "per_ip_window_seconds" {
  description = "Window for per-IP request limits"
  type        = number
  default     = 3600
}

variable "enable_ses_email" {
  description = "Enable SES SendEmail permissions and runtime email sending"
  type        = bool
  default     = true
}

variable "ses_from_email" {
  description = "Verified SES sender address"
  type        = string
  default     = "noreply@anchorwebco.com.au"
}

variable "lead_notification_email" {
  description = "Internal lead notification recipient email"
  type        = string
  default     = "info@anchorwebco.com.au"
}

variable "log_retention_days" {
  description = "CloudWatch log retention for Lambda logs"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Optional tags applied to resources"
  type        = map(string)
  default     = {}
}
