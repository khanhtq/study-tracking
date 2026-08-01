# File mẫu cấu hình biến Terraform cho môi trường Production
# Copy file này thành terraform.tfvars và tùy chỉnh các giá trị bên dưới

location             = "japaneast"
resource_group_name  = "rg-study-tracking-prod"
storage_account_name = "ststudytrackingprod2026"
container_name       = "study-documents"

cors_allowed_origins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://ax-study.vercel.app",
  "https://be-study-xp-tracker.onrender.com"
]

tags = {
  Environment = "Production"
  Project     = "Study-XP-Tracker"
  ManagedBy   = "Terraform"
}
