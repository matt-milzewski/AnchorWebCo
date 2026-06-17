output "api_id" {
  description = "HTTP API ID"
  value       = aws_apigatewayv2_api.cms.id
}

output "api_base_url" {
  description = "CMS API base URL"
  value       = aws_apigatewayv2_api.cms.api_endpoint
}

output "posts_table_name" {
  description = "DynamoDB table storing CMS posts"
  value       = aws_dynamodb_table.posts.name
}

output "media_bucket_name" {
  description = "S3 bucket storing CMS media"
  value       = aws_s3_bucket.media.bucket
}

output "media_base_url" {
  description = "Public base URL for CMS-uploaded media"
  value       = "https://${aws_s3_bucket.media.bucket}.s3.${var.aws_region}.amazonaws.com"
}

output "sites_config_parameter" {
  description = "SSM parameter storing CMS site configuration"
  value       = aws_ssm_parameter.sites_config.name
}

output "github_token_parameter" {
  description = "SSM parameter storing the GitHub workflow dispatch token"
  value       = aws_ssm_parameter.github_token.name
}

output "lambda_function_name" {
  description = "CMS Lambda function name"
  value       = aws_lambda_function.cms.function_name
}
