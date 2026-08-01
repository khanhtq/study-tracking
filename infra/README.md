# Hướng Dẫn Vận Hành Hạ Tầng Lưu Trữ (Infrastructure as Code)

Thư mục này chứa cấu hình hạ tầng chuẩn hóa cho tính năng lưu trữ tài liệu học tập (Study Drive) và ảnh đại diện (Avatar).

---

## 🛠️ 1. Môi Trường Local Development (Azurite Emulator)

Không cần tài khoản Azure hay kết nối internet. Ứng dụng tích hợp sẵn giả lập **Microsoft Azurite** qua Docker.

### Cách chạy:
```bash
cd backend
docker compose up -d azurite
```

Container Azurite sẽ lắng nghe trên cổng:
- Blob Service: `10000`
- Queue Service: `10001`
- Table Service: `10002`

Backend mặc định sẽ tự kết nối tới Azurite nếu không truyền `AZURE_STORAGE_CONNECTION_STRING` thật.

---

## ☁️ 2. Môi Trường Cloud Production (Terraform)

Quản lý hạ tầng đám mây Azure thông qua Terraform (`hashicorp/azurerm`).

### Các tài nguyên được tự động khởi tạo:
1. **Azure Resource Group**: Nhóm chứa tài nguyên (`rg-study-tracking-prod`).
2. **Azure Storage Account**: Storage Account chuẩn (`Standard_LRS`, Tier Hot).
3. **Blob Container**: Container `study-documents` với mức truy cập `Private`.
4. **CORS Policy**: Tự động cấu hình mở quyền cross-origin cho Frontend React.

### Các cách kết nối Terraform với tài khoản Azure của bạn:

#### Cách 1: Đăng nhập qua Azure CLI (`az login`) - Dễ nhất cho Máy Cá Nhân / Dev
1. Mở Terminal / PowerShell và gõ:
   ```bash
   az login
   ```
2. Trình duyệt mở ra -> Đăng nhập tài khoản Azure của bạn.
3. Nếu có nhiều Subscription, chọn đúng Subscription:
   ```bash
   az account set --subscription "SUBSCRIPTION_ID_CỦA_BẠN"
   ```
4. Terraform sẽ tự động nhận diện và kết nối với tài khoản Azure của bạn!

#### Cách 2: Dùng Service Principal (Cho GitHub Actions / CI/CD)
Khai báo các biến môi trường xác thực:
```bash
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="your-tenant-id"
```

### Các bước triển khai Terraform:

#### Bước 2: Tạo file cấu hình biến
Copy file `terraform.tfvars.example` thành `terraform.tfvars`:
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```
Tùy chỉnh tên `storage_account_name` (tên phải là duy nhất trên toàn cầu).

#### Bước 3: Chạy script triển khai
- **PowerShell (Windows)**:
  ```powershell
  ./scripts/apply-infra.ps1
  ```
- **Bash (Linux/macOS/Git Bash)**:
  ```bash
  chmod +x ./scripts/apply-infra.sh
  ./scripts/apply-infra.sh
  ```

#### Bước 4: Lấy Connection String cho Backend
Chạy câu lệnh sau để lấy chuỗi Connection String:
```bash
terraform output -raw primary_connection_string
```
Copy chuỗi này điền vào biến môi trường `AZURE_STORAGE_CONNECTION_STRING` trên server Production.
