#!/usr/bin/env bg
set -e

echo "===================================================="
echo "  Triển khai Hạ Tầng Azure Storage (Terraform)      "
echo "===================================================="

cd "$(dirname "$0")/.."

if ! command -v terraform &> /dev/null; then
    echo "Lỗi: Terraform chưa được cài đặt!"
    exit 1
fi

echo -e "\n[1/3] Đang khởi tạo Terraform Providers..."
terraform init

echo -e "\n[2/3] Đang kiểm tra cấu hình Terraform..."
terraform validate

echo -e "\n[3/3] Đang áp dụng hạ tầng lên Azure..."
terraform apply -auto-approve

echo -e "\n===================================================="
echo "  Triển khai hạ tầng Azure Storage hoàn tất!       "
echo "===================================================="
echo "Lấy Connection String: terraform output -raw primary_connection_string"
