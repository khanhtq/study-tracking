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

variable "azure_storage_connection_string" {
  type        = string
  description = "Connection string trực tiếp tới Azure Storage"
  sensitive   = true
  default     = ""
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

# --- Azure Database for PostgreSQL Flexible Server / External Database ---
variable "db_url" {
  type        = string
  description = "URL kết nối Database PostgreSQL (Neon DB hoặc Azure PostgreSQL)"
  default     = ""
}

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
  description = "Endpoint Hostname của Upstash Redis"
  default     = "large-jackal-177919.upstash.io"
}

variable "upstash_redis_port" {
  type        = string
  description = "Port kết nối Redis"
  default     = "6379"
}

variable "upstash_redis_password" {
  type        = string
  description = "Mật khẩu kết nối Upstash Redis"
  sensitive   = true
  default     = ""
}

# --- Google OAuth2 & Mail (Brevo / Gmail) Configuration ---
variable "google_client_id" {
  type        = string
  description = "Google OAuth2 Client ID"
  default     = "224799995016-gs297ph4n9ldsuikvabcaufkupdalgch.apps.googleusercontent.com"
}

variable "mail_host" {
  type        = string
  description = "SMTP Mail Host (Brevo hoặc Gmail)"
  default     = "smtp-relay.brevo.com"
}

variable "mail_port" {
  type        = string
  description = "SMTP Mail Port"
  default     = "465"
}

variable "mail_username" {
  type        = string
  description = "Tài khoản Mail SMTP"
  default     = "990fd2003@smtp-brevo.com"
}

variable "mail_password" {
  type        = string
  description = "Mật khẩu SMTP Mail"
  sensitive   = true
  default     = ""
}

variable "mail_from" {
  type        = string
  description = "Địa chỉ Email người gửi (SPRING_MAIL_FROM)"
  default     = "trankhanh0525@gmail.com"
}

variable "mail_ssl_enable" {
  type        = string
  description = "SPRING_MAIL_SSL_ENABLE"
  default     = "true"
}

variable "mail_starttls_enable" {
  type        = string
  description = "SPRING_MAIL_STARTTLS_ENABLE"
  default     = "false"
}

variable "brevo_api_key" {
  type        = string
  description = "Brevo API Key"
  sensitive   = true
  default     = ""
}

# --- Cloudinary Configuration ---
variable "cloudinary_cloud_name" {
  type        = string
  description = "Cloudinary Cloud Name"
  default     = "desoarfu8"
}

variable "cloudinary_api_key" {
  type        = string
  description = "Cloudinary API Key"
  default     = "263947446783275"
}

variable "cloudinary_api_secret" {
  type        = string
  description = "Cloudinary API Secret"
  sensitive   = true
  default     = ""
}

# --- VNPay Payment Gateway Configuration ---
variable "vnpay_tmn_code" {
  type        = string
  description = "Mã TMN Code do VNPay cấp"
  default     = "UBV2RBA3"
}

variable "vnpay_hash_secret" {
  type        = string
  description = "Chuỗi mã hóa Secret Key do VNPay cấp"
  sensitive   = true
  default     = "BTNAWUGNPUBDDSRBGMCCNHQFQSMUTRMF"
}

variable "vnpay_pay_url" {
  type        = string
  description = "URL cổng thanh toán VNPay"
  default     = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
}

variable "vnpay_return_url" {
  type        = string
  description = "URL Callback nhận kết quả thanh toán VNPay trên Azure Container Apps"
  default     = "https://app-study-tracking-api-prod.lemonsky-47aa863f.japaneast.azurecontainerapps.io/api/payment/vnpay/return"
}

# --- Storage & Limits ---
variable "storage_provider" {
  type        = string
  description = "STORAGE_PROVIDER (azure | local | cloudinary)"
  default     = "azure"
}

variable "upload_dir" {
  type        = string
  description = "UPLOAD_DIR"
  default     = "uploads"
}

variable "max_file_size_mb" {
  type        = string
  description = "MAX_FILE_SIZE_MB"
  default     = "10"
}

variable "max_user_quota_mb" {
  type        = string
  description = "MAX_USER_QUOTA_MB"
  default     = "1024"
}

# --- Virtual Users Configuration ---
variable "virtual_users_enabled" {
  type        = string
  description = "VIRTUAL_USERS_ENABLED"
  default     = "true"
}

variable "virtual_users_count" {
  type        = string
  description = "VIRTUAL_USERS_COUNT"
  default     = "5"
}

variable "virtual_users_rotation_hours" {
  type        = string
  description = "VIRTUAL_USERS_ROTATION_HOURS"
  default     = "1"
}

variable "virtual_users_auto_reply_enabled" {
  type        = string
  description = "VIRTUAL_USERS_AUTO_REPLY_ENABLED"
  default     = "true"
}

variable "app_frontend_url" {
  type        = string
  description = "APP_FRONTEND_URL"
  default     = "https://studyxp.khaxnh.id.vn"
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
  default     = "9a62aa5c1d2e8b0a701dfc0b2bb2b45a27e7f6e07a3c306dcd37c1527ef94c6f9a62aa5c1d2e8b0a701dfc0b2bb2b45a27e7f6e07a3c306dcd37c1527ef94c6f9"
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
