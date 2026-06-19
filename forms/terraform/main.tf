data "aws_caller_identity" "current" {}

locals {
  prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_ssm_parameter" "sites_config" {
  name        = var.sites_config_parameter_name
  description = "Anchor Forms site routing configuration"
  type        = "SecureString"
  value = jsonencode({
    sites = var.site_configs
  })
  tags = local.common_tags
}

resource "aws_dynamodb_table" "submissions" {
  name         = var.submissions_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "siteId"
  range_key    = "submissionId"

  attribute {
    name = "siteId"
    type = "S"
  }

  attribute {
    name = "submissionId"
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

resource "aws_dynamodb_table" "rate_limits" {
  name         = var.rate_limit_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "rateKey"

  attribute {
    name = "rateKey"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
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
    sid = "ReadFormSiteConfig"

    actions = [
      "ssm:GetParameter"
    ]

    resources = [
      aws_ssm_parameter.sites_config.arn
    ]
  }

  statement {
    sid = "WriteFormSubmissions"

    actions = [
      "dynamodb:PutItem"
    ]

    resources = [
      aws_dynamodb_table.submissions.arn
    ]
  }

  statement {
    sid = "UpdateFormRateLimits"

    actions = [
      "dynamodb:UpdateItem"
    ]

    resources = [
      aws_dynamodb_table.rate_limits.arn
    ]
  }

  statement {
    sid = "SendLeadEmails"

    actions = [
      "ses:SendEmail"
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = distinct(concat([var.default_from_email], compact([for site in var.site_configs : try(site.fromEmail, "")])))
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
  output_path = "${path.module}/forms-lambda.zip"

  excludes = [
    "test/*",
    "node_modules/.cache/*"
  ]
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.prefix}-handler"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_lambda_function" "forms" {
  function_name = "${local.prefix}-handler"
  description   = "Reusable Anchor Web Co form submission backend"
  role          = aws_iam_role.lambda_execution.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  environment {
    variables = {
      FORM_SITES_CONFIG_PARAMETER  = aws_ssm_parameter.sites_config.name
      FORM_SUBMISSIONS_TABLE       = aws_dynamodb_table.submissions.name
      FORM_RATE_LIMIT_TABLE        = aws_dynamodb_table.rate_limits.name
      FORM_ALLOWED_ORIGINS         = join(",", var.allowed_origins)
      FORM_DEFAULT_FROM_EMAIL      = var.default_from_email
      FORM_DEFAULT_REPLY_TO_EMAIL  = var.default_reply_to_email
      FORM_RATE_LIMIT_MAX_REQUESTS = tostring(var.per_ip_max_requests)
      FORM_RATE_LIMIT_WINDOW_SECONDS = tostring(var.per_ip_window_seconds)
      FORM_MAX_PAYLOAD_BYTES       = tostring(var.max_payload_bytes)
    }
  }

  tags = local.common_tags

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_apigatewayv2_api" "forms" {
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

resource "aws_apigatewayv2_integration" "forms" {
  api_id                 = aws_apigatewayv2_api.forms.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.forms.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "forms" {
  for_each = toset([
    "OPTIONS /api/forms/{siteId}",
    "POST /api/forms/{siteId}"
  ])

  api_id    = aws_apigatewayv2_api.forms.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.forms.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.forms.id
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
  function_name = aws_lambda_function.forms.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.forms.execution_arn}/*/*"
}
