output "api_id" {
  description = "HTTP API ID"
  value       = aws_apigatewayv2_api.health_check.id
}

output "api_base_url" {
  description = "API base URL"
  value       = aws_apigatewayv2_api.health_check.api_endpoint
}

output "health_check_endpoint" {
  description = "Public POST endpoint for website health checks"
  value       = "${aws_apigatewayv2_api.health_check.api_endpoint}/api/health-check"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.health_check.function_name
}

output "pagespeed_api_key_parameter" {
  description = "SSM parameter name where PageSpeed API key is stored"
  value       = aws_ssm_parameter.pagespeed_api_key.name
}

output "runs_table_name" {
  description = "DynamoDB table storing health check runs"
  value       = aws_dynamodb_table.health_check_runs.name
}

output "rate_limit_table_name" {
  description = "DynamoDB table storing per-IP rate limit counters"
  value       = aws_dynamodb_table.health_check_rate_limits.name
}
