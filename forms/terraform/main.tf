data "aws_caller_identity" "current" {}

locals {
  prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "random_password" "abuse_hash_key" {
  length  = 48
  special = false
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

resource "aws_ssm_parameter" "turnstile_secret" {
  name        = var.turnstile_secret_parameter_name
  description = "Cloudflare Turnstile server verification secret"
  type        = "SecureString"
  value       = var.turnstile_secret_key != "" ? var.turnstile_secret_key : "__not_configured__"
  tags        = local.common_tags
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

  attribute {
    name = "allKey"
    type = "S"
  }

  attribute {
    name = "submittedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "all-submitted-at-index"
    hash_key        = "allKey"
    range_key       = "submittedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
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
  for_each = toset(["forms", "admin", "events", "notifications", "reports"])
  name     = "${local.prefix}-${each.key}-lambda-role"

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

data "aws_iam_policy_document" "forms_lambda_permissions" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    sid = "ReadFormSiteConfig"

    actions = [
      "ssm:GetParameter"
    ]

    resources = [
      aws_ssm_parameter.sites_config.arn,
      aws_ssm_parameter.turnstile_secret.arn
    ]
  }

  statement {
    sid = "WriteFormSubmissions"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem"
    ]

    resources = [aws_dynamodb_table.submissions.arn]
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

data "aws_iam_policy_document" "admin_lambda_permissions" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.admin_lambda.arn}:*"]
  }

  statement {
    sid       = "ReadFormSiteConfig"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.sites_config.arn]
  }

  statement {
    sid     = "ReadFormSubmissions"
    actions = ["dynamodb:GetItem", "dynamodb:Query"]
    resources = [
      aws_dynamodb_table.submissions.arn,
      "${aws_dynamodb_table.submissions.arn}/index/*"
    ]
  }
}

data "aws_iam_policy_document" "events_lambda_permissions" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.events_lambda.arn}:*"]
  }

  statement {
    sid       = "UpdateFormDeliveryState"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.submissions.arn]
  }
}

data "aws_iam_policy_document" "notifications_lambda_permissions" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.notifications_lambda.arn}:*"]
  }

  statement {
    sid       = "SendOperationalAlerts"
    actions   = ["ses:SendEmail"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [var.default_from_email]
    }
  }
}

data "aws_iam_policy_document" "reports_lambda_permissions" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.reports_lambda.arn}:*"]
  }

  statement {
    sid     = "ReadAggregateFormSubmissions"
    actions = ["dynamodb:Query"]
    resources = [
      aws_dynamodb_table.submissions.arn,
      "${aws_dynamodb_table.submissions.arn}/index/all-submitted-at-index"
    ]
  }

  statement {
    sid       = "PublishOperationalReport"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]
  }

  statement {
    sid       = "UseAlertTopicEncryption"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = [aws_kms_key.forms_events.arn]
  }
}

resource "aws_iam_policy" "lambda_permissions" {
  for_each = {
    forms         = data.aws_iam_policy_document.forms_lambda_permissions.json
    admin         = data.aws_iam_policy_document.admin_lambda_permissions.json
    events        = data.aws_iam_policy_document.events_lambda_permissions.json
    notifications = data.aws_iam_policy_document.notifications_lambda_permissions.json
    reports       = data.aws_iam_policy_document.reports_lambda_permissions.json
  }
  name   = "${local.prefix}-${each.key}-lambda-policy"
  policy = each.value
  tags   = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_permissions" {
  for_each   = aws_iam_policy.lambda_permissions
  role       = aws_iam_role.lambda_execution[each.key].name
  policy_arn = each.value.arn
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

resource "aws_cloudwatch_log_group" "admin_lambda" {
  name              = "/aws/lambda/${local.prefix}-admin"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "events_lambda" {
  name              = "/aws/lambda/${local.prefix}-events"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "notifications_lambda" {
  name              = "/aws/lambda/${local.prefix}-notifications"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "reports_lambda" {
  name              = "/aws/lambda/${local.prefix}-reports"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_sesv2_configuration_set" "forms" {
  configuration_set_name = "${local.prefix}-delivery"

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }
}

data "aws_iam_policy_document" "forms_events_kms" {
  statement {
    sid     = "AccountAdministration"
    actions = ["kms:*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    resources = ["*"]
  }

  statement {
    sid = "AllowFormsEventServices"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey*"
    ]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com", "sns.amazonaws.com"]
    }

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key" "forms_events" {
  description             = "Encrypts Anchor Forms SES events and operational alerts"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.forms_events_kms.json
  tags                    = local.common_tags
}

resource "aws_kms_alias" "forms_events" {
  name          = "alias/${local.prefix}-events"
  target_key_id = aws_kms_key.forms_events.key_id
}

resource "aws_sns_topic" "ses_events" {
  name              = "${local.prefix}-ses-events"
  kms_master_key_id = aws_kms_key.forms_events.arn
  tags              = local.common_tags
}

data "aws_iam_policy_document" "ses_events_topic" {
  statement {
    sid     = "AllowSesPublish"
    actions = ["sns:Publish"]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    resources = [aws_sns_topic.ses_events.arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "ses_events" {
  arn    = aws_sns_topic.ses_events.arn
  policy = data.aws_iam_policy_document.ses_events_topic.json
}

resource "aws_sesv2_configuration_set_event_destination" "forms" {
  configuration_set_name = aws_sesv2_configuration_set.forms.configuration_set_name
  event_destination_name = "submission-status"

  event_destination {
    enabled = true
    matching_event_types = [
      "BOUNCE",
      "COMPLAINT",
      "DELIVERY",
      "DELIVERY_DELAY",
      "REJECT",
      "RENDERING_FAILURE",
      "SEND"
    ]

    sns_destination {
      topic_arn = aws_sns_topic.ses_events.arn
    }
  }

  depends_on = [aws_sns_topic_policy.ses_events]
}

resource "aws_lambda_function" "forms" {
  function_name = "${local.prefix}-handler"
  description   = "Reusable Anchor Web Co form submission backend"
  role          = aws_iam_role.lambda_execution["forms"].arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  environment {
    variables = {
      FORM_SITES_CONFIG_PARAMETER              = aws_ssm_parameter.sites_config.name
      FORM_TURNSTILE_SECRET_PARAMETER          = aws_ssm_parameter.turnstile_secret.name
      FORM_SUBMISSIONS_TABLE                   = aws_dynamodb_table.submissions.name
      FORM_RATE_LIMIT_TABLE                    = aws_dynamodb_table.rate_limits.name
      FORM_ALLOWED_ORIGINS                     = join(",", var.allowed_origins)
      FORM_DEFAULT_FROM_EMAIL                  = var.default_from_email
      FORM_DEFAULT_REPLY_TO_EMAIL              = var.default_reply_to_email
      FORM_RATE_LIMIT_MAX_REQUESTS             = tostring(var.per_ip_max_requests)
      FORM_DESTINATION_RATE_LIMIT_MAX_REQUESTS = tostring(var.per_destination_max_requests)
      FORM_RATE_LIMIT_WINDOW_SECONDS           = tostring(var.per_ip_window_seconds)
      FORM_MAX_PAYLOAD_BYTES                   = tostring(var.max_payload_bytes)
      FORM_SUBMISSION_RETENTION_DAYS           = tostring(var.submission_retention_days)
      FORM_SPAM_RETENTION_DAYS                 = tostring(var.spam_retention_days)
      FORM_ABUSE_HASH_KEY                      = random_password.abuse_hash_key.result
      FORM_SES_CONFIGURATION_SET               = aws_sesv2_configuration_set.forms.configuration_set_name
    }
  }

  tags = local.common_tags

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_lambda_function" "admin" {
  function_name = "${local.prefix}-admin"
  description   = "Protected Anchor Forms reporting API"
  role          = aws_iam_role.lambda_execution["admin"].arn
  runtime       = "nodejs20.x"
  handler       = "admin.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = 256

  environment {
    variables = {
      FORM_SUBMISSIONS_TABLE      = aws_dynamodb_table.submissions.name
      FORM_SITES_CONFIG_PARAMETER = aws_ssm_parameter.sites_config.name
      FORM_ADMIN_USER_POOL_ID     = aws_cognito_user_pool.forms_admin.id
      FORM_ADMIN_CLIENT_ID        = aws_cognito_user_pool_client.forms_admin.id
      FORM_ADMIN_COGNITO_DOMAIN   = "https://${aws_cognito_user_pool_domain.forms_admin.domain}.auth.${var.aws_region}.amazoncognito.com"
      FORM_ADMIN_REDIRECT_URI     = var.admin_redirect_uri
      FORM_ADMIN_LOGOUT_URI       = var.admin_logout_uri
      FORM_ADMIN_ALLOWED_ORIGIN   = var.admin_allowed_origin
    }
  }

  tags       = local.common_tags
  depends_on = [aws_cloudwatch_log_group.admin_lambda]
}

resource "aws_lambda_function" "events" {
  function_name = "${local.prefix}-events"
  description   = "Updates form records from SES delivery feedback"
  role          = aws_iam_role.lambda_execution["events"].arn
  runtime       = "nodejs20.x"
  handler       = "events.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = 256

  environment {
    variables = {
      FORM_SUBMISSIONS_TABLE = aws_dynamodb_table.submissions.name
    }
  }

  tags       = local.common_tags
  depends_on = [aws_cloudwatch_log_group.events_lambda]
}

resource "aws_lambda_function" "reports" {
  function_name = "${local.prefix}-reports"
  description   = "Sends an aggregate monthly form and spam report"
  role          = aws_iam_role.lambda_execution["reports"].arn
  runtime       = "nodejs20.x"
  handler       = "reports.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = 256

  environment {
    variables = {
      FORM_SUBMISSIONS_TABLE            = aws_dynamodb_table.submissions.name
      FORM_ALERTS_TOPIC_ARN             = aws_sns_topic.alerts.arn
      FORM_ADMIN_DASHBOARD_URL          = var.admin_redirect_uri
      FORM_MONTHLY_SPAM_COUNT_THRESHOLD = tostring(var.monthly_spam_count_threshold)
      FORM_MONTHLY_SPAM_RATE_THRESHOLD  = tostring(var.monthly_spam_rate_threshold)
    }
  }

  tags = local.common_tags
  depends_on = [
    aws_cloudwatch_log_group.reports_lambda,
    aws_iam_role_policy_attachment.lambda_permissions["reports"]
  ]
}

resource "aws_lambda_function" "notifications" {
  function_name = "${local.prefix}-notifications"
  description   = "Delivers encrypted operational alerts through the verified Anchor SES identity"
  role          = aws_iam_role.lambda_execution["notifications"].arn
  runtime       = "nodejs20.x"
  handler       = "notifications.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = 256

  environment {
    variables = {
      FORM_ALERT_FROM_EMAIL      = var.default_from_email
      FORM_ALERT_RECIPIENT_EMAIL = var.admin_email
    }
  }

  tags = local.common_tags
  depends_on = [
    aws_cloudwatch_log_group.notifications_lambda,
    aws_iam_role_policy_attachment.lambda_permissions["notifications"]
  ]
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowSesEventsFromSns"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.events.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.ses_events.arn
}

resource "aws_sns_topic_subscription" "ses_events" {
  topic_arn = aws_sns_topic.ses_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.events.arn

  depends_on = [aws_lambda_permission.allow_sns]
}

resource "aws_cognito_user_pool" "forms_admin" {
  name                     = "${local.prefix}-admin"
  mfa_configuration        = "ON"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  software_token_mfa_configuration {
    enabled = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "Your Anchor Forms dashboard"
      email_message = "Your dashboard username is {username} and temporary password is {####}. Sign in at ${var.admin_redirect_uri}"
      sms_message   = "Your Anchor Forms username is {username} and temporary password is {####}."
    }
  }

  password_policy {
    minimum_length                   = 14
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "forms_admin" {
  name         = "${local.prefix}-dashboard"
  user_pool_id = aws_cognito_user_pool.forms_admin.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = [var.admin_redirect_uri]
  logout_urls                          = [var.admin_logout_uri]
  prevent_user_existence_errors        = "ENABLED"
  access_token_validity                = 1
  id_token_validity                    = 1
  refresh_token_validity               = 7

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "forms_admin" {
  domain       = "${local.prefix}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.forms_admin.id
}

resource "aws_cognito_user" "forms_admin" {
  user_pool_id = aws_cognito_user_pool.forms_admin.id
  username     = var.admin_email

  attributes = {
    email          = var.admin_email
    email_verified = "true"
  }

  desired_delivery_mediums = ["EMAIL"]
}

resource "aws_apigatewayv2_api" "forms" {
  name          = "${local.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_authorizer" "forms_admin" {
  api_id           = aws_apigatewayv2_api.forms.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.prefix}-admin"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.forms_admin.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.forms_admin.id}"
  }
}

resource "aws_apigatewayv2_integration" "forms" {
  api_id                 = aws_apigatewayv2_api.forms.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.forms.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = aws_apigatewayv2_api.forms.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "forms" {
  for_each = toset([
    "GET /api/forms/{siteId}",
    "OPTIONS /api/forms/{siteId}",
    "POST /api/forms/{siteId}"
  ])

  api_id    = aws_apigatewayv2_api.forms.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.forms.id}"
}

resource "aws_apigatewayv2_route" "admin_config" {
  api_id    = aws_apigatewayv2_api.forms.id
  route_key = "GET /api/forms-admin/config"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin" {
  for_each = toset([
    "GET /api/forms-admin/summary",
    "GET /api/forms-admin/submissions",
    "GET /api/forms-admin/submissions/{siteId}/{submissionId}"
  ])

  api_id             = aws_apigatewayv2_api.forms.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.forms_admin.id
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

resource "aws_lambda_permission" "allow_admin_api_gateway" {
  statement_id  = "AllowAdminInvokeFromHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.forms.execution_arn}/*/*"
}

resource "aws_sns_topic" "alerts" {
  name              = "${local.prefix}-alerts"
  kms_master_key_id = aws_kms_key.forms_events.arn
  tags              = local.common_tags
}

resource "aws_lambda_permission" "allow_alert_notifications" {
  statement_id  = "AllowOperationalAlertsFromSns"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifications.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}

resource "aws_sns_topic_subscription" "alert_notifications" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.notifications.arn

  depends_on = [aws_lambda_permission.allow_alert_notifications]
}

resource "aws_cloudwatch_event_rule" "monthly_spam_report" {
  name                = "${local.prefix}-monthly-spam-report"
  description         = "Send the aggregate forms and spam report every month"
  schedule_expression = "cron(0 22 1 * ? *)"
  state               = "ENABLED"
  tags                = local.common_tags
}

resource "aws_cloudwatch_event_target" "monthly_spam_report" {
  rule      = aws_cloudwatch_event_rule.monthly_spam_report.name
  target_id = "MonthlyFormsReport"
  arn       = aws_lambda_function.reports.arn
  input     = jsonencode({ schedule = "monthly" })
}

resource "aws_lambda_permission" "allow_monthly_spam_report" {
  statement_id  = "AllowMonthlyFormsReport"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reports.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_spam_report.arn
}

resource "aws_cloudwatch_log_metric_filter" "blocked" {
  name           = "${local.prefix}-blocked"
  pattern        = "{ $.event = \"form_submission_blocked\" }"
  log_group_name = aws_cloudwatch_log_group.lambda.name

  metric_transformation {
    name      = "BlockedSubmissions"
    namespace = "AnchorForms"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "delivery_failed" {
  name           = "${local.prefix}-delivery-failed"
  pattern        = "{ $.event = \"form_delivery_failed\" }"
  log_group_name = aws_cloudwatch_log_group.lambda.name

  metric_transformation {
    name      = "DeliveryFailures"
    namespace = "AnchorForms"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "post_acceptance_delivery_failed" {
  for_each       = toset(["bounced", "complained", "delivery_failed"])
  name           = "${local.prefix}-ses-${replace(each.value, "_", "-")}"
  pattern        = "{ $.event = \"ses_feedback\" && $.messageType = \"lead\" && $.status = \"${each.value}\" }"
  log_group_name = aws_cloudwatch_log_group.events_lambda.name

  metric_transformation {
    name      = "PostAcceptanceDeliveryFailures"
    namespace = "AnchorForms"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "delivery_failed" {
  alarm_name          = "${local.prefix}-delivery-failures"
  alarm_description   = "Form lead delivery failed"
  namespace           = "AnchorForms"
  metric_name         = "DeliveryFailures"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "post_acceptance_delivery_failed" {
  alarm_name          = "${local.prefix}-post-acceptance-delivery-failures"
  alarm_description   = "A non-spam lead bounced, was rejected, rendered incorrectly, or produced a complaint"
  namespace           = "AnchorForms"
  metric_name         = "PostAcceptanceDeliveryFailures"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = {
    forms   = aws_lambda_function.forms.function_name
    admin   = aws_lambda_function.admin.function_name
    events  = aws_lambda_function.events.function_name
    reports = aws_lambda_function.reports.function_name
  }

  alarm_name          = "${each.value}-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = each.value
  }

  tags = local.common_tags
}

resource "aws_budgets_budget" "forms" {
  name         = "${local.prefix}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$${var.project_name}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.admin_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.admin_email]
  }
}
