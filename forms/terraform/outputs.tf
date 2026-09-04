output "api_id" {
  description = "HTTP API ID"
  value       = aws_apigatewayv2_api.forms.id
}

output "api_base_url" {
  description = "Forms API base URL"
  value       = aws_apigatewayv2_api.forms.api_endpoint
}

output "anchor_form_endpoint" {
  description = "Anchor Web Co form endpoint"
  value       = "${aws_apigatewayv2_api.forms.api_endpoint}/api/forms/anchor-web-co"
}

output "lambda_function_name" {
  description = "Forms Lambda function name"
  value       = aws_lambda_function.forms.function_name
}

output "sites_config_parameter" {
  description = "SSM parameter storing form site configuration"
  value       = aws_ssm_parameter.sites_config.name
}

output "submissions_table_name" {
  description = "DynamoDB table storing form submissions"
  value       = aws_dynamodb_table.submissions.name
}

output "rate_limit_table_name" {
  description = "DynamoDB table storing form rate limits"
  value       = aws_dynamodb_table.rate_limits.name
}

output "admin_dashboard_url" {
  description = "Protected forms reporting dashboard"
  value       = var.admin_redirect_uri
}

output "admin_user_pool_id" {
  description = "Cognito user pool protecting the forms dashboard"
  value       = aws_cognito_user_pool.forms_admin.id
}

output "admin_client_id" {
  description = "Public Cognito OAuth client ID used by the forms dashboard"
  value       = aws_cognito_user_pool_client.forms_admin.id
}

output "turnstile_enabled" {
  description = "Whether a production Turnstile secret was supplied"
  value       = nonsensitive(var.turnstile_secret_key != "")
}

output "alerts_topic_arn" {
  description = "Encrypted SNS topic used for operational alerts and monthly reports"
  value       = aws_sns_topic.alerts.arn
}

output "monthly_report_function_name" {
  description = "Lambda function that sends the aggregate monthly report"
  value       = aws_lambda_function.reports.function_name
}
