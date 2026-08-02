# Vị trí triển khai Resource Group (Chuẩn chính sách Azure Student: Nhật Bản - japaneast)
location            = "japaneast"
resource_group_name = "rg-study-tracking-prod"

# Azure Storage Account cho Backend Documents
storage_account_name = "ststudytrackingprod"
container_name       = "study-documents"

# Azure Container Registry
acr_name = "acrstudytrackingprod"
acr_sku  = "Basic"

# Azure Database for PostgreSQL Flexible Server
db_admin_username = "pgadmin"
db_admin_password = "P@ssw0rdStudyXP2026!" # Đổi thành mật khẩu riêng của bạn
db_name           = "study_xp_db"
db_sku_name       = "B_Standard_B1ms" # Phù hợp Azure Student Free Offer (12 tháng free)
db_storage_mb     = 32768            # 32GB storage free tier

# Upstash Redis Configuration (Dùng Redis miễn phí từ Console.upstash.com)
upstash_redis_host     = "large-jackal-177919.upstash.io"          # Điền endpoint host Upstash của bạn vào đây (ví dụ: "glowing-cat-12345.upstash.io")
upstash_redis_port     = "6379"
upstash_redis_password = "gQAAAAAAArb_AAIgcDI5NDdhMjkyNGFlMjI0MGRkODFmYmM3ZDI2NjBkZDZmYw"          # Điền password Upstash của bạn vào đây

# Azure App Service Backend
backend_app_name      = "app-study-tracking-api-prod"

# Azure Frontend Static Website Storage
frontend_storage_name = "stfestudytrackingprod"

# Application Secrets
jwt_secret = "9a8f7e6d5c4b3a210987654321fedcba9a8f7e6d5c4b3a210987654321fedcba"

# Tags
tags = {
  Environment = "Production"
  Project     = "Study-XP-Tracker"
  ManagedBy   = "Terraform"
}
