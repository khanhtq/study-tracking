variable "location" {
  type        = string
  description = "Khu vực đám mây Azure để triển khai tài nguyên (e.g. southeastasia)"
  default     = "southeastasia"
}

variable "resource_group_name" {
  type        = string
  description = "Tên Resource Group chứa tài nguyên Azure"
  default     = "rg-study-tracking-prod"
}

variable "storage_account_name" {
  type        = string
  description = "Tên duy nhất của Azure Storage Account (chỉ chữ cái viết thường và số)"
  default     = "ststudytrackingprod"
}

variable "storage_account_tier" {
  type        = string
  description = "Phân cấp hiệu năng Storage Account (Standard hoặc Premium)"
  default     = "Standard"
}

variable "storage_replication_type" {
  type        = string
  description = "Loại sao lưu dữ liệu (LRS, GRS, ZRS)"
  default     = "LRS"
}

variable "container_name" {
  type        = string
  description = "Tên Container lưu trữ tài liệu học tập"
  default     = "study-documents"
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Danh sách domain client được phép gửi request (CORS)"
  default     = ["*"]
}

variable "cors_allowed_methods" {
  type        = list(string)
  description = "Các phương thức HTTP được phép trong quy tắc CORS"
  default     = ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"]
}

variable "cors_allowed_headers" {
  type        = list(string)
  description = "Các HTTP Headers được phép"
  default     = ["*"]
}

variable "cors_exposed_headers" {
  type        = list(string)
  description = "Các HTTP Headers exposed"
  default     = ["*"]
}

variable "cors_max_age_in_seconds" {
  type        = number
  description = "Thời gian cache quy tắc CORS (seconds)"
  default     = 3600
}

variable "tags" {
  type        = map(string)
  description = "Nhãn đánh dấu tài nguyên Azure"
  default = {
    Environment = "Production"
    Project     = "Study-XP-Tracker"
    ManagedBy   = "Terraform"
  }
}
