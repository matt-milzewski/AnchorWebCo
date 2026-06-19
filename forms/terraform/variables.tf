variable "aws_region" {
  description = "AWS region for the forms stack"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project prefix for created resources"
  type        = string
  default     = "anchor-forms"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "allowed_origins" {
  description = "Allowed CORS origins for all managed forms"
  type        = list(string)
  default = [
    "https://www.anchorwebco.com.au",
    "https://anchorwebco.com.au"
  ]
}

variable "site_configs" {
  description = "Reusable per-site form routing configuration"
  type = list(object({
    siteId          = string
    name            = string
    recipientEmail  = string
    allowedOrigins  = list(string)
    requiredFields  = optional(list(string), ["name", "email", "message"])
    honeypotFields  = optional(list(string), ["company", "_gotcha", "website"])
    replyToField    = optional(string, "email")
    subjectPrefix   = optional(string)
    subject         = optional(string)
    fromEmail       = optional(string)
    spamThreshold   = optional(number, 2)
    maxLinks        = optional(number, 3)
    minimumSubmitMs = optional(number, 3000)
  }))
  sensitive = true
  default   = []
}

variable "sites_config_parameter_name" {
  description = "SSM SecureString parameter containing form site routing configuration"
  type        = string
  default     = "/anchor-forms/sites-config"
}

variable "submissions_table_name" {
  description = "DynamoDB table for form submission storage"
  type        = string
  default     = "anchor_form_submissions"
}

variable "rate_limit_table_name" {
  description = "DynamoDB table for per-IP form rate limits"
  type        = string
  default     = "anchor_form_rate_limits"
}

variable "default_from_email" {
  description = "Verified SES sender used when a site does not override fromEmail"
  type        = string
  default     = "noreply@anchorwebco.com.au"
}

variable "default_reply_to_email" {
  description = "Fallback reply-to address"
  type        = string
  default     = "info@anchorwebco.com.au"
}

variable "per_ip_max_requests" {
  description = "Max submissions per IP per site in the configured window"
  type        = number
  default     = 8
}

variable "per_ip_window_seconds" {
  description = "Window for per-IP rate limits"
  type        = number
  default     = 3600
}

variable "max_payload_bytes" {
  description = "Maximum accepted request payload size"
  type        = number
  default     = 32000
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
