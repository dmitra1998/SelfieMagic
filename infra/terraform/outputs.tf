output "bucket_name" {
  description = "Name of the private video bucket."
  value       = aws_s3_bucket.videos.id
}

output "bucket_arn" {
  description = "ARN of the private video bucket."
  value       = aws_s3_bucket.videos.arn
}

output "upload_api_role_arn" {
  description = "Role ARN for the production upload API workload."
  value       = aws_iam_role.upload_api.arn
}
