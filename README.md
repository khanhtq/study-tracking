# 🛡️ Study XP Tracker — Backend Service

Hệ thống API RESTful và Real-time Server dành cho ứng dụng **Study XP Tracker**, được phát triển dựa trên **Java 21** và **Spring Boot 3.3.1**. Backend chịu trách nhiệm xử lý toàn bộ logic tính toán kinh nghiệm (XP), quản lý cấp độ, cơ chế chống gian lận, bảng xếp hạng Redis, giao tiếp thời gian thực (WebSocket) và quản lý người dùng.

---

## 🎯 1. Bài toán kỹ thuật & Giải pháp Backend

Backend của Study XP Tracker được thiết kế nhằm giải quyết các thách thức kỹ thuật quan trọng trong ứng dụng gamification & theo dõi học tập:

### 1.1. Chống gian lận thời gian học (Server-side Anti-Cheat Engine)
* **Vấn đề:** Người dùng có thể chỉnh sửa dữ liệu timer từ phía Client hoặc can thiệp JavaScript để cộng điểm XP ảo.
* **Giải pháp:**
  * Backend hoàn toàn không tin tưởng dữ liệu thời gian gửi từ Client.
  * Khi bắt đầu học, server ghi lại `start_time`. Khi kết thúc, server tự lấy `end_time` hiện tại của hệ thống để tính số giây thực tế (`duration_seconds`).
  * Tích hợp **Session Heartbeat Scheduler** định kỳ kiểm tra các session bất thường và tự động hủy hoặc giới hạn tối đa **12 tiếng** cho một phiên học liên tục.
  * Áp dụng công thức thưởng **+10% XP** cho phiên học từ **25 phút** trở lên (Pomodoro standard).

### 1.2. Bảng xếp hạng Real-time hiệu năng cao (Redis ZSET + DB Fallback)
* **Vấn đề:** Truy vấn bảng xếp hạng Top XP/Level từ cơ sở dữ liệu quan hệ (PostgreSQL) khi có hàng ngàn người dùng sẽ gây nghẽn I/O.
* **Giải pháp:**
  * Sử dụng **Redis Sorted Set (ZSET)** lưu trữ điểm XP của người dùng với độ phức tạp truy vấn $O(\log N + M)$.
  * Sử dụng Spring Event Listener (`XpEventListener`) lắng nghe `XpEarnedEvent` để cập nhật điểm vào Redis asynchronous mà không làm chậm API response chính.
  * Tích hợp cơ chế **Graceful Fallback**: Nếu dịch vụ Redis ngắt kết nối, hệ thống tự động chuyển sang truy vấn JPA PostgreSQL mà không gián đoạn dịch vụ.

### 1.3. Giao tiếp thời gian thực (WebSocket STOMP + SockJS)
* **Vấn đề:** Hiển thị trạng thái online/offline của bạn bè và tin nhắn tức thì (Direct Messaging).
* **Giải pháp:**
  * Cấu hình WebSocket với đường truyền **STOMP / SockJS**.
  * Quản lý trạng thái hiển thị hoạt động với 3 cấp độ quyền riêng tư (`ActivityStatusVisibility`: `EVERYONE`, `FRIENDS_ONLY`, `NOBODY`).
  * Phân quyền nhắn tin cá nhân (`MessagePermission`: `EVERYONE`, `FRIENDS_ONLY`, `NOBODY`).

### 1.4. Phát nhạc & Proxy âm thanh từ YouTube (YouTube Audio Proxy Service)
* **Vấn đề:** Phát trực tiếp âm thanh từ YouTube bị vướng rào cản CORS và lọc các video không liên quan đến nhạc tập trung.
* **Giải pháp:**
  * `YoutubeAudioService` tự động lọc từ khóa tìm kiếm (bỏ các video vlog, tin tức), chuẩn hóa truy vấn về nhạc lofi/study/ambient.
  * Stream trực tiếp qua đường dẫn proxy backend để vượt qua giới hạn trình duyệt.

### 1.5. Cấu trúc lưu trữ linh hoạt (Pluggable File Storage)
* **Vấn đề:** Cần hỗ trợ cả môi trường phát triển nội bộ (Local Disk) lẫn môi trường production trên Cloud.
* **Giải pháp:**
  * Thiết kế Interface `FileStorageProvider` với 2 triển khai:
    * `LocalStorageProviderImpl`: Lưu ảnh avatar vào thư mục `/uploads` cục bộ.
    * `CloudinaryStorageProviderImpl`: Lưu trữ ảnh tự động lên mây qua Cloudinary API.

---

## 🛠️ 2. Công nghệ & Thư viện (Backend Tech Stack)

| Thành phần | Công nghệ / Thư viện | Mô tả |
| :--- | :--- | :--- |
| **Ngôn ngữ** | Java 21 (LTS) | Sử dụng các tính năng mới của Java 21 |
| **Framework** | Spring Boot 3.3.1 | Core Framework |
| **Security** | Spring Security 6 + JJWT 0.11.5 | Xác thực JWT Token & Phân quyền |
| **Database** | PostgreSQL 15 + Spring Data JPA | Cơ sở dữ liệu quan hệ |
| **Migration** | Flyway DB Migration | Quản lý phiên bản Schema & Seed data |
| **Caching** | Spring Data Redis | Redis ZSET cho Leaderboard real-time |
| **Real-time** | Spring WebSocket (STOMP / SockJS) | Nhắn tin & Trạng thái Online |
| **Mail Service** | Spring Boot Starter Mail | Gửi mã xác thực OTP qua Email |
| **OAuth2** | Google API Client 2.4.0 | Xác thực tài khoản bằng Google |
| **Media Cloud** | Cloudinary SDK 1.38.0 | Lưu trữ avatar người dùng trên Cloud |
| **Testing** | JUnit 5 + Mockito | Unit test & Integration test |

---

## 🏗️ 3. Cấu trúc Thư mục Backend

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/studytracker/
│   │   │   ├── config/          # Cấu hình Security, JWT, Redis, Web, WebSocket, Seed Data
│   │   │   ├── controller/      # Auth, User, Session, Leaderboard, Friend, Message, Music, Admin
│   │   │   ├── dto/             # Request & Response Data Transfer Objects
│   │   │   ├── event/           # System Events (XpEarnedEvent, ...)
│   │   │   ├── listener/        # Event Listeners (XpEventListener)
│   │   │   ├── model/           # JPA Entities (User, StudySession, Friendship, Message, ...)
│   │   │   ├── repository/      # Spring Data JPA Repositories
│   │   │   ├── scheduler/       # Heartbeat Scheduler, Clean Unverified Users Scheduler
│   │   │   ├── service/         # Core Business Logic Services
│   │   │   │   └── storage/     # Local Storage & Cloudinary Storage Providers
│   │   │   └── StudyXpTrackerApplication.java
│   │   └── resources/
│   │       ├── db/migration/    # File V1, V2 Flyway Migration Scripts
│   │       └── application.yml  # Cấu hình môi trường (DB, JWT, Mail, Redis)
│   └── test/                    # Unit Tests (XpService, LeaderboardService, UserService, ...)
├── Dockerfile                   # Docker build cho Backend
└── pom.xml                      # Dependencies Maven
```

---

## 🚀 4. Hướng dẫn Cài đặt & Khởi chạy Backend

### Yêu cầu hệ thống:
* **JDK 21** trở lên.
* **Maven 3.8+**.
* **PostgreSQL 15+** (hoặc chạy qua Docker).
* **Redis 7+** (tùy chọn, ứng dụng tự động fallback sang DB nếu không có Redis).

### Bước 1: Khởi tạo Cơ sở dữ liệu & Redis bằng Docker
Tại thư mục gốc dự án:
```bash
docker compose up -d
```
*Lệnh này sẽ khởi chạy PostgreSQL tại cổng `5432` và Redis tại cổng `6379`.*

### Bước 2: Cấu hình Môi trường
Kiểm tra cấu hình tại [backend/src/main/resources/application.yml](file:///e:/Project/study-tracking/backend/src/main/resources/application.yml) hoặc cập nhật các biến môi trường:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/study_xp_tracker
    username: postgres
    password: password
  data:
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    secret: 9a4f2c8d7e1b5a3f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f
    expiration-ms: 86400000 # 24 giờ
```

### Bước 3: Biên dịch & Chạy Backend
Tại thư mục `backend`:
```bash
# Biên dịch dự án
mvn clean package -DskipTests

# Chạy Backend
mvn spring-boot:run
```
Backend sẽ khởi chạy tại: `http://localhost:8080`

### Bước 4: Chạy Unit Tests
```bash
mvn test
```

---

## 📡 5. Tóm tắt danh sách API Endpoint chính

| Nhóm | Endpoint | Method | Mô tả |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | POST | Đăng ký tài khoản mới & gửi OTP |
| **Auth** | `/api/auth/verify-otp` | POST | Xác thực email bằng mã OTP |
| **Auth** | `/api/auth/login` | POST | Đăng nhập & lấy Access Token JWT |
| **Auth** | `/api/auth/google` | POST | Đăng nhập/Đăng ký qua Google OAuth2 |
| **Session**| `/api/sessions/start` | POST | Bắt đầu một phiên học mới |
| **Session**| `/api/sessions/stop` | POST | Kết thúc phiên học & tính XP tự động |
| **Session**| `/api/sessions/stats` | GET | Thống kê số giờ học & biểu đồ 7 ngày |
| **Leaderboard**| `/api/leaderboard` | GET | Lấy bảng xếp hạng Top XP/Level (Redis/DB) |
| **Friends**| `/api/friends/request` | POST | Gửi lời mời kết bạn |
| **Friends**| `/api/friends/list` | GET | Danh sách bạn bè & trạng thái Online |
| **Messages**| `/api/messages/{friendId}`| GET | Lấy lịch sử nhắn tin với bạn bè |
| **Music** | `/api/music/search` | GET | Tìm kiếm danh sách nhạc lofi học tập |
| **Admin** | `/api/admin/overview` | GET | Dashboard thống kê tổng quan (Dành cho Admin) |

---

## 📝 Licence & Author
Phát triển bởi đội ngũ **Study XP Tracker Team**.
