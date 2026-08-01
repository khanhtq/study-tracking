# 🎓 Study XP Tracker — Monorepo

[![Java](https://img.shields.io/badge/Java-21-orange.svg?style=flat-square&logo=openjdk)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Study XP Tracker** là nền tảng quản lý & theo dõi thời gian học tập ứng dụng **Gamification (Trò chơi hóa)** hiện đại. Dự án kết hợp giữa giao diện người dùng trực quan, hiệu ứng mượt mà (Glassmorphic UI, Framer Motion) và kiến trúc Backend mạnh mẽ (Spring Boot, Redis ZSET, Real-time WebSocket), giúp người học duy trì động lực, tích lũy điểm kinh nghiệm (XP), thăng cấp và cạnh tranh lành mạnh trên bảng xếp hạng.

---

## 📌 Tổng Quan Dự Án & Tính Năng Nổi Bật

### 1. Đồng Hồ Học Tập & Động Cơ Chống Gian Lận Server-Side
* **Đa dạng chế độ:** Hỗ trợ Đếm ngược Pomodoro (25 phút standard) và Đếm xuôi (Stopwatch).
* **Cơ chế chống gian lận (Anti-Cheat):** Server tự ghi nhận `start_time` và tự tính toán thời lượng thực tế dựa trên timestamp hệ thống thay vì tin tưởng dữ liệu đếm ở phía Client.
* **Heartbeat Scheduler:** Tự động giám sát và giới hạn phiên học tối đa 12 tiếng liên tục. Tự động thưởng **+10% XP** cho các phiên Pomodoro chuẩn $\ge 25$ phút.

### 2. Quản Lý Tài Liệu Học Tập (Study Document Drive)
* **Kho lưu trữ tài liệu tích hợp:** Tải lên, phân loại và quản lý tài liệu học tập cá nhân.
* **Hỗ trợ Cloud Storage & SAS Token:** Tích hợp linh hoạt với Azure Blob Storage / Cloudinary CDN với đường dẫn tải an toàn, hỗ trợ fallback stream trực tiếp từ backend khi gặp CORS.

### 3. Bảng Xếp Hạng Thời Gian Thực Hiệu Năng Cao (Redis ZSET + DB Fallback)
* **Cơ chế Redis ZSET:** Lưu trữ điểm XP của toàn bộ người dùng trên Redis Sorted Set cho tốc độ truy vấn $O(\log N + M)$.
* **Bất đồng bộ với Event Listener:** Cập nhật điểm XP qua `XpEarnedEvent` mà không làm nghẽn luồng xử lý chính.
* **Graceful Fallback:** Tự động chuyển sang truy vấn PostgreSQL nếu kết nối Redis gặp sự cố.

### 4. Mạng Xã Hội & Nhắn Tin Thời Gian Thực (WebSocket STOMP)
* **Danh sách bạn bè & Trạng thái Online:** Hiển thị trực tiếp bạn bè đang học hay rảnh rỗi.
* **Quyền riêng tư linh hoạt:** Cấu hình mức độ hiển thị trạng thái (`ActivityStatusVisibility`) và cho phép nhắn tin (`MessagePermission`).
* **Nhắn tin trực tiếp (Direct Messaging):** Nhắn tin bảo mật và tức thì qua giao thức WebSocket STOMP / SockJS.

### 5. Phân Tích & Biểu Đồ Trực Quan
* **Contribution Heatmap:** Biểu đồ ô vuông nhiệt phong cách GitHub ghi nhận mật độ học tập mỗi ngày và chuỗi streak học tập liên tục.
* **Biểu đồ 7 ngày (Recharts):** Thống kê tổng quan thời gian học và xu hướng tập trung trong tuần.

### 6. Đa Ngôn Ngữ (i18n) & PWA
* Chuyển đổi ngôn ngữ tức thì không cần tải lại trang: **Tiếng Việt**, **English**, **中文 (Chinese)**.
* **PWA (Progressive Web App):** Hỗ trợ cài đặt trực tiếp trên Desktop / Android / iOS với giao diện mượt như app bản địa.

### 7. Trang Quản Trị Hệ Thống (Admin Dashboard)
* Giám sát người dùng đang hoạt động thời gian thực, quản lý phân quyền, xử lý vi phạm (Ban/Unban account), cảnh báo hoạt động bất thường và theo dõi các chỉ số tổng quan của hệ thống.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### **Frontend**
* **Core:** React 19, Vite 8, JavaScript (ES6+).
* **Styling & UI:** Tailwind CSS v4, Lucide Icons, Glassmorphism Design System.
* **Animation & Charts:** Framer Motion, Recharts, Canvas Confetti.
* **Real-time & Network:** SockJS-client, StompJS, Axios.

### **Backend**
* **Core Framework:** Java 21 (LTS), Spring Boot 3.3.1.
* **Security & Auth:** Spring Security 6, JJWT (Dual Cookie Token Auth: HTTP-Only Refresh Cookie + Access Token), Google OAuth2.
* **Database & ORM:** PostgreSQL 15, Spring Data JPA, Flyway Database Migration.
* **Caching & Real-time:** Spring Data Redis (ZSET Leaderboard), Spring WebSocket (STOMP / SockJS).
* **Storage Provider:** Pluggable Architecture (Azure Blob Storage / Cloudinary / Local Disk).

### **Infrastructure & CI/CD**
* **Containerization:** Docker, Docker Compose.
* **Infrastructure as Code:** Terraform scripts.
* **Automation:** GitHub Actions Monorepo Workflows (`backend-ci-cd.yml`, `frontend-ci-cd.yml`).

---

## 📁 Cấu Trúc Thư Mục Monorepo

```text
study-tracking/
├── .github/
│   └── workflows/
│       ├── backend-ci-cd.yml      # GitHub Actions CI/CD cho Backend
│       └── frontend-ci-cd.yml     # GitHub Actions CI/CD cho Frontend
├── backend/                       # Java Spring Boot Backend Service
│   ├── src/                       # Controller, Service, Repository, DTO, Config
│   ├── Dockerfile                 # Backend Containerization
│   └── pom.xml                    # Maven Configuration
├── frontend/                      # React SPA Frontend Web Application
│   ├── src/                       # Components, Pages, Context, Hooks
│   ├── public/                    # Static Assets & PWA Manifest
│   ├── package.json               # NPM Dependencies & Scripts
│   └── vite.config.js             # Vite Configuration
├── infra/                         # Terraform Scripts & Deploy Shells
├── .gitignore
├── LICENSE                        # MIT License
└── README.md                      # Documentation
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Local Development)

### Yêu Cầu Tiền Đề (Prerequisites)
* **Java 21** hoặc cao hơn.
* **Node.js** 18.x trở lên & **npm** 9.x trở lên.
* **Maven** 3.8+ (hoặc dùng Maven wrapper trong dự án).
* **Docker & Docker Compose** (để khởi chạy PostgreSQL & Redis nhanh chóng).

---

### Bước 1: Clone Repository
```bash
git clone https://github.com/khanhtq/study-tracking.git
cd study-tracking
```

---

### Bước 2: Khởi Chạy Database (PostgreSQL & Redis)
Chạy lệnh Docker Compose từ thư mục gốc để khởi tạo PostgreSQL (Port `5432`) và Redis (Port `6379`):
```bash
docker compose -f backend/docker-compose.yml up -d
# Hoặc nếu chạy từ folder backend:
# cd backend && docker compose up -d
```

---

### Bước 3: Cấu Hình & Chạy Backend Service
1. Mở cửa sổ Terminal thứ nhất và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Build và cài đặt các phụ thuộc Maven:
   ```bash
   mvn clean package -DskipTests
   ```
3. Khởi chạy ứng dụng Spring Boot:
   ```bash
   mvn spring-boot:run
   ```
   👉 Backend sẽ lắng nghe tại: **`http://localhost:8080`**

---

### Bước 4: Khởi Chạy Frontend Web Application
1. Mở cửa sổ Terminal thứ hai và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói NPM:
   ```bash
   npm install
   ```
3. Khởi chạy Vite Dev Server:
   ```bash
   npm run dev
   ```
   👉 Frontend sẽ lắng nghe tại: **`http://localhost:5173`**

---

## ⚙️ Biến Môi Trường (Environment Variables)

### Backend (`backend/src/main/resources/application.yml` hoặc ENV)
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/study_xp_tracker
SPRING_DATASOURCE_USERNAME: postgres
SPRING_DATASOURCE_PASSWORD: password
SPRING_DATA_REDIS_HOST: localhost
SPRING_DATA_REDIS_PORT: 6379
APP_JWT_SECRET: <your-256-bit-secret-key>
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

---

## 📄 Giấy Phép (License)

Dự án này được phân phối dưới giấy phép **MIT License**. Xem thông tin chi tiết tại file [LICENSE](LICENSE).

---

## 👨‍💻 Tác Giả & Đóng Góp (Author)

* **Tác giả:** Trần Quốc Khánh ([@khanhtq](https://github.com/khanhtq))
* **Repository:** [https://github.com/khanhtq/study-tracking](https://github.com/khanhtq/study-tracking)
