variable "aws_region" {
  description = "AWS region for the video bucket."
  type        = string
  default     = "eu-north-1"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name must be a valid lowercase S3 bucket name."
  }
}

variable "environment" {
  description = "Deployment environment used in resource tags."
  type        = string
  default     = "production"
}

variable "retention_days" {
  description = "Number of days to retain current video objects."
  type        = number
  default     = 730

  validation {
    condition     = var.retention_days >= 365
    error_message = "retention_days must be at least 365 days."
  }
}

variable "backend_service_principal" {
  description = "AWS service allowed to assume the upload API role."
  type        = string
  default     = "ecs-tasks.amazonaws.com"
}

variable "tags" {
  description = "Additional resource tags."
  type        = map(string)
  default     = {}
}
