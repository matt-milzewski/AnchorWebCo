data "aws_caller_identity" "current" {}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  prefix = "${var.project_name}-${var.environment}"
  media_bucket_name = var.media_bucket_name != "" ? var.media_bucket_name : "${local.prefix}-media-${random_id.bucket_suffix.hex}"
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "random_password" "session_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "session_secret" {
  name        = "/${var.project_name}/${var.environment}/session-secret"
  description = "Signing secret for Anchor Blog Manager sessions"
  type        = "SecureString"
  value       = random_password.session_secret.result
  tags        = local.common_tags
}

resource "aws_ssm_parameter" "sites_config" {
  name        = var.sites_config_parameter_name
  description = "Anchor Blog Manager site configuration"
  type        = "SecureString"
  value = jsonencode({
    sites = var.site_configs
  })
  tags = local.common_tags
}

resource "aws_ssm_parameter" "github_token" {
  name        = var.github_token_parameter_name
  description = "GitHub token for Anchor Blog Manager workflow dispatch"
  type        = "SecureString"
  value       = var.github_token_placeholder
  tags        = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_dynamodb_table" "posts" {
  name         = var.posts_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "siteId"
  range_key    = "slug"

  attribute {
    name = "siteId"
    type = "S"
  }

  attribute {
    name = "slug"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_s3_bucket" "media" {
  bucket = local.media_bucket_name
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

data "aws_iam_policy_document" "media_public_read" {
  statement {
    sid = "PublicReadUploadedBlogMedia"

    actions = [
      "s3:GetObject"
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [
      "${aws_s3_bucket.media.arn}/*"
    ]
  }
}

resource "aws_s3_bucket_policy" "media_public_read" {
  bucket = aws_s3_bucket.media.id
  policy = data.aws_iam_policy_document.media_public_read.json

  depends_on = [aws_s3_bucket_public_access_block.media]
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "lambda_execution" {
  name = "${local.prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    sid = "CloudWatchLogs"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
    ]
  }

  statement {
    sid = "ReadCmsParameters"

    actions = [
      "ssm:GetParameter"
    ]

    resources = [
      aws_ssm_parameter.session_secret.arn,
      aws_ssm_parameter.sites_config.arn,
      aws_ssm_parameter.github_token.arn
    ]
  }

  statement {
    sid = "ManageCmsPosts"

    actions = [
      "dynamodb:DeleteItem",
      "dynamodb:PutItem",
      "dynamodb:Query"
    ]

    resources = [
      aws_dynamodb_table.posts.arn
    ]
  }

  statement {
    sid = "UploadCmsMedia"

    actions = [
      "s3:PutObject"
    ]

    resources = [
      "${aws_s3_bucket.media.arn}/*"
    ]
  }
}

resource "aws_iam_policy" "lambda_permissions" {
  name   = "${local.prefix}-lambda-policy"
  policy = data.aws_iam_policy_document.lambda_permissions.json
  tags   = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_permissions" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = aws_iam_policy.lambda_permissions.arn
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/cms-lambda.zip"

  excludes = [
    "node_modules/.cache/*"
  ]
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.prefix}-handler"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_lambda_function" "cms" {
  function_name = "${local.prefix}-handler"
  description   = "Reusable Anchor Blog Manager CMS API"
  role          = aws_iam_role.lambda_execution.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  environment {
    variables = {
      CMS_POSTS_TABLE           = aws_dynamodb_table.posts.name
      CMS_MEDIA_BUCKET          = aws_s3_bucket.media.bucket
      CMS_SESSION_SECRET        = random_password.session_secret.result
      CMS_SITES_CONFIG_PARAMETER = aws_ssm_parameter.sites_config.name
      CMS_ALLOWED_ORIGINS       = join(",", var.allowed_origins)
      GITHUB_TOKEN_PARAMETER    = aws_ssm_parameter.github_token.name
      GITHUB_WORKFLOW           = "deploy.yml"
    }
  }

  tags = local.common_tags

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_apigatewayv2_api" "cms" {
  name          = "${local.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["content-type"]
    allow_credentials = true
    max_age           = 3600
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "cms" {
  api_id                 = aws_apigatewayv2_api.cms.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.cms.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "cms_routes" {
  for_each = toset([
    "OPTIONS /api/cms/{proxy+}",
    "GET /api/cms/{proxy+}",
    "POST /api/cms/{proxy+}",
    "PUT /api/cms/{proxy+}",
    "DELETE /api/cms/{proxy+}"
  ])

  api_id    = aws_apigatewayv2_api.cms.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.cms.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.cms.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.api_burst_limit
    throttling_rate_limit  = var.api_rate_limit
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowInvokeFromHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cms.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.cms.execution_arn}/*/*"
}
