# Script PowerShell tự động chạy Terraform Apply khởi tạo Azure Storage
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Triển khai Hạ Tầng Azure Storage (Terraform)      " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot/.."

# 1. Kiểm tra Terraform CLI
if (-not (Get-Command "terraform" -ErrorAction SilentlyContinue)) {
    Write-Error "Terraform chưa được cài đặt! Vui lòng cài đặt Terraform (https://developer.hashicorp.com/terraform/downloads) trước khi tiếp tục."
    exit 1
}

# 2. Khởi tạo Terraform
Write-Host "`n[1/3] Đang khởi tạo Terraform Providers..." -ForegroundColor Yellow
terraform init

# 3. Validate cấu hình
Write-Host "`n[2/3] Đang kiểm tra cấu hình Terraform..." -ForegroundColor Yellow
terraform validate

# 4. Thực thi Terraform Apply
Write-Host "`n[3/3] Đang áp dụng hạ tầng lên Azure..." -ForegroundColor Yellow
terraform apply -auto-approve

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "  Triển khai hạ tầng Azure Storage hoàn tất!       " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Lưu ý: Để lấy Connection String dùng cho backend, chạy câu lệnh:" -ForegroundColor Gray
Write-Host "terraform output -raw primary_connection_string" -ForegroundColor White
