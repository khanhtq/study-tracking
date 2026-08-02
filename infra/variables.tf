variable "location" {
  type        = string
  description = "Khu vực đám mây Azure cho phép triển khai (dựa trên chính sách Azure Student: japaneast - Nhật Bản)"
  default     = "japaneast"
}

variable "resource_group_name" {
  type        = string
  description = "Tên Resource Group chứa tài nguyên Azure"
  default     = "rg-study-tracking-prod"
}

# --- Azure Storage Account ---
variable "storage_account_name" {
  type        = string
  description = "Tên duy nhất của Azure Storage Account (chữ cái viết thường và số, 3-24 ký tự)"
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

# --- CORS Settings ---
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

# --- Azure Container Registry (ACR) ---
variable "acr_name" {
  type        = string
  description = "Tên Azure Container Registry (chỉ chữ cái và số, duy nhất trên Azure)"
  default     = "acrstudytrackingprod"
}

variable "acr_sku" {
  type        = string
  description = "SKU của ACR (Basic, Standard, Premium)"
  default     = "Basic"
}

# --- Azure Database for PostgreSQL Flexible Server ---
variable "db_admin_username" {
  type        = string
  description = "Tên tài khoản Administrator cho PostgreSQL"
  default     = "pgadmin"
}

variable "db_admin_password" {
  type        = string
  description = "Mật khẩu Administrator cho PostgreSQL"
  sensitive   = true
  default     = "P@ssw0rdStudyXP2026!"
}

variable "db_name" {
  type        = string
  description = "Tên cơ sở dữ liệu PostgreSQL"
  default     = "study_xp_db"
}

variable "db_sku_name" {
  type        = string
  description = "Compute SKU cho PostgreSQL Flexible Server (B_Standard_B1ms phù hợp Azure Student Free Tier)"
  default     = "B_Standard_B1ms"
}

variable "db_storage_mb" {
  type        = number
  description = "Dung lượng lưu trữ DB tính bằng MB (32768MB = 32GB miễn phí)"
  default     = 32768
}

# --- Upstash / External Redis Configuration ---
variable "upstash_redis_host" {
  type        = string
  description = "Endpoint Hostname của Upstash Redis (ví dụ: xxx.upstash.io). Nếu để trống sẽ tự động fallback sang PostgreSQL"
  default     = ""
}

variable "upstash_redis_port" {
  type        = string
  description = "Port kết nối Redis (mặc định Upstash là 6379)"
  default     = "6379"
}

variable "upstash_redis_password" {
  type        = string
  description = "Mật khẩu kết nối Upstash Redis"
  sensitive   = true
  default     = ""
}

# --- Azure App Service (Backend Spring Boot) ---
variable "backend_app_name" {
  type        = string
  description = "Tên Azure Container Instance cho Backend Spring Boot API"
  default     = "app-study-tracking-api-prod"
}

# --- Frontend Static Website Storage ---
variable "frontend_storage_name" {
  type        = string
  description = "Tên Storage Account dành riêng cho Frontend Static Website (3-24 chữ cái viết thường và số)"
  default     = "stfestudytrackingprod"
}

# --- Application Secrets & Environment ---
variable "jwt_secret" {
  type        = string
  description = "Secret key dùng để ký JWT Authentication Token"
  sensitive   = true
  default     = "9a8f7e6d5c4b3a210987654321fedcba9a8f7e6d5c4b3a210987654321fedcba"
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
