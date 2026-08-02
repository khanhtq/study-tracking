# Hướng Dẫn Vận Hành Hạ Tầng Hệ Thống Trọn Gói Trên Azure (Terraform IaC)

Thư mục này chứa toàn bộ mã nguồn cấu hình hạ tầng tự động (Infrastructure as Code - IaC) bằng **Terraform** (`hashicorp/azurerm`) để triển khai hệ thống **Study XP Tracker** lên **Microsoft Azure** (Tối ưu cho tài khoản **Azure for Students**).

---

## 🏛️ Các Tài Nguyên Được Khởi Tạo Tự Động

| Tài nguyên Azure | Tên mặc định / SKU | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Resource Group** | `rg-study-tracking-prod` | Nhóm quản lý tập trung toàn bộ tài nguyên |
| **Storage Account & Blob** | `ststudytrackingprod` | Lưu trữ tài liệu học tập (`study-documents`) & ảnh đại diện |
| **Container Registry (ACR)** | `acrstudytrackingprod` (Basic) | Lưu trữ Docker Image của Backend Spring Boot |
| **PostgreSQL Flexible Server** | `pg-study-tracking-...` (`B_Standard_B1ms`) | Cơ sở dữ liệu chính (PostgreSQL 15), 32GB Storage miễn phí |
| **Azure Cache for Redis** | `redis-study-tracking-prod` (Basic C0) | Bảng xếp hạng XP thời gian thực (Redis ZSET) & Caching |
| **Azure App Service Plan & App** | `app-study-tracking-api-prod` (B1 Linux) | Host dịch vụ Backend Spring Boot Containerized API & WebSockets |
| **Azure Static Web Apps** | `swa-study-tracking-frontend-prod` (Free) | Host ứng dụng React SPA Frontend tốc độ cao qua CDN |

---

## 🛠️ 1. Môi Trường Local Development (Azurite Emulator)

Nếu muốn phát triển và test ở máy cá nhân mà không cần tài khoản Cloud:
```bash
cd backend
docker compose up -d
```
Backend sẽ kết nối tới Azurite & PostgreSQL/Redis container trên máy local.

---

## ☁️ 2. Môi Trường Cloud Azure Production (Terraform)

### Bước 1: Yêu Cầu Cần Chuẩn Bị
- **Terraform CLI**: $\ge 1.5.0$ (`terraform -v`)
- **Azure CLI**: (`az --version`)
- **Tài khoản Azure for Students** hoặc Azure Subscription bất kỳ.

### Bước 2: Đăng Nhập Tài Khoản Azure Qua Azure CLI
1. Mở Terminal / PowerShell:
   ```bash
   az login
   ```
2. Trình duyệt mở ra -> Đăng nhập tài khoản Azure (Student).
3. Nếu bạn có nhiều Subscription, kiểm tra và chọn đúng Subscription:
   ```bash
   az account list --output table
   az account set --subscription "SUBSCRIPTION_ID_CỦA_BẠN"
   ```

### Bước 3: Khởi Tạo File Biến Cấu Hình (`terraform.tfvars`)
Chuyển vào thư mục `infra` và copy file ví dụ:
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```
*Lưu ý: Tùy chỉnh `db_admin_password` và các tham số khác trong `terraform.tfvars` nếu muốn.*

### Bước 4: Chạy Lệnh Triển Khai Hạ Tầng
Mở PowerShell hoặc Bash tại thư mục `infra`:

- **Khởi tạo Terraform provider**:
  ```bash
  terraform init
  ```
- **Xem trước danh sách tài nguyên sẽ được tạo (`Dry-run`)**:
  ```bash
  terraform plan
  ```
- **Áp dụng triển khai tài nguyên lên Azure**:
  ```bash
  terraform apply -auto-approve
  ```

---

## 🚀 3. Cấu Hình CI/CD GitHub Actions Đã Tích Hợp

Sau khi `terraform apply` hoàn tất, Terraform sẽ xuất các thông số Output (`outputs.tf`). Bạn hãy lấy các giá trị này để điền vào **GitHub Secrets** của Repository (`Settings -> Secrets and variables -> Actions`):

1. **`AZURE_CREDENTIALS`**: Service Principal JSON đăng nhập Azure (dùng cho GitHub Actions).
2. **`AZURE_REGISTRY_SERVER`**: Output `container_registry_login_server` (ví dụ: `acrstudytrackingprod.azurecr.io`).
3. **`AZURE_REGISTRY_USERNAME`**: Output `container_registry_admin_username`.
4. **`AZURE_REGISTRY_PASSWORD`**: Mật khẩu Admin ACR (lấy qua `az acr credential show --name acrstudytrackingprod`).
5. **`AZURE_WEBAPP_NAME`**: Output `backend_app_service_name` (ví dụ: `app-study-tracking-api-prod`).
6. **`AZURE_STATIC_WEB_APPS_API_TOKEN`**: Output `frontend_static_web_app_api_key`.

---

## 🔍 4. Kiểm Tra & Lấy Thông Số Kết Nối

- **Lấy danh sách các biến Output**:
  ```bash
  terraform output
  ```
- **Lấy URL Backend API**:
  ```bash
  terraform output backend_app_service_url
  ```
- **Lấy URL Frontend Web App**:
  ```bash
  terraform output frontend_static_web_app_url
  ```
- **Hủy toàn bộ tài nguyên trên Azure (khi không dùng nữa)**:
  ```bash
  terraform destroy
  ```
