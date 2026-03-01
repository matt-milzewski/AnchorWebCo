data "aws_caller_identity" "current" {}

locals {
  prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_ssm_parameter" "pagespeed_api_key" {
  name        = var.pagespeed_api_key_parameter_name
  description = "Google PageSpeed API key for Anchor Web Co health checks"
  type        = "SecureString"
  value       = var.pagespeed_api_key_placeholder
  tags        = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_dynamodb_table" "health_check_runs" {
  name         = var.runs_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "run_id"

  attribute {
    name = "run_id"
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

resource "aws_dynamodb_table" "health_check_rate_limits" {
  name         = var.rate_limit_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ip_window"

  attribute {
    name = "ip_window"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
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
    sid = "ReadPageSpeedApiKey"

    actions = [
      "ssm:GetParameter"
    ]

    resources = [
      aws_ssm_parameter.pagespeed_api_key.arn
    ]
  }

  statement {
    sid = "WriteHealthCheckRuns"

    actions = [
      "dynamodb:PutItem"
    ]

    resources = [
      aws_dynamodb_table.health_check_runs.arn
    ]
  }

  statement {
    sid = "UpdateRateLimitCounters"

    actions = [
      "dynamodb:UpdateItem"
    ]

    resources = [
      aws_dynamodb_table.health_check_rate_limits.arn
    ]
  }

  dynamic "statement" {
    for_each = var.enable_ses_email ? [1] : []

    content {
      sid = "SendEmailReport"

      actions = [
        "ses:SendEmail"
      ]

      resources = ["*"]

      condition {
        test     = "StringEquals"
        variable = "ses:FromAddress"
        values   = [var.ses_from_email]
      }
    }
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
  output_path = "${path.module}/health-check-lambda.zip"

  excludes = [
    "README.md",
    "node_modules/.cache/*"
  ]
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.prefix}-handler"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_lambda_function" "health_check" {
  function_name = "${local.prefix}-handler"
  description   = "Anchor Web Co Website Health Check"
  role          = aws_iam_role.lambda_execution.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  environment {
    variables = {
      PAGESPEED_API_KEY_PARAM   = aws_ssm_parameter.pagespeed_api_key.name
      RUNS_TABLE_NAME           = aws_dynamodb_table.health_check_runs.name
      RATE_LIMIT_TABLE_NAME     = aws_dynamodb_table.health_check_rate_limits.name
      RATE_LIMIT_MAX_REQUESTS   = tostring(var.per_ip_max_requests)
      RATE_LIMIT_WINDOW_SECONDS = tostring(var.per_ip_window_seconds)
      ALLOWED_ORIGINS           = join(",", var.allowed_origins)
      SES_FROM_EMAIL            = var.enable_ses_email ? var.ses_from_email : ""
      LEAD_NOTIFICATION_EMAIL   = var.enable_ses_email ? var.lead_notification_email : ""
      PAGESPEED_TIMEOUT_MS      = tostring(var.pagespeed_timeout_ms)
    }
  }

  tags = local.common_tags

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_apigatewayv2_api" "health_check" {
  name          = "${local.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["content-type"]
    max_age       = 3600
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "health_check" {
  api_id                 = aws_apigatewayv2_api.health_check.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health_check.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "health_check" {
  api_id    = aws_apigatewayv2_api.health_check.id
  route_key = "POST /api/health-check"
  target    = "integrations/${aws_apigatewayv2_integration.health_check.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.health_check.id
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
  function_name = aws_lambda_function.health_check.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.health_check.execution_arn}/*/*"
}
