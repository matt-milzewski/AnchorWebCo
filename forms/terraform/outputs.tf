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
