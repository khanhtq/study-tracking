# Study XP Tracker — Backend Service

RESTful API and real-time server for the **Study XP Tracker** platform, built with **Java 21** and **Spring Boot 3.3.1**. The backend handles XP calculation, anti-cheat validation, Redis leaderboards, real-time messaging via WebSocket, and user management.

---

## Architecture & Key Features

### Server-Side Anti-Cheat Engine
The backend validates all study session data server-side to prevent client manipulation. Session timestamps are recorded when a session starts, and duration is calculated server-side upon completion. An automated heartbeat scheduler continuously monitors active sessions, enforcing a 12-hour maximum limit and awarding a +10% XP bonus for completed Pomodoro sessions (≥25 minutes).

### High-Performance Real-Time Leaderboards
Redis Sorted Sets (ZSET) power the leaderboard with O(log N + M) query complexity. Leaderboard updates happen asynchronously through Spring event listeners without blocking the main API response path. If Redis becomes unavailable, the system gracefully falls back to PostgreSQL queries.

### Real-Time Communication
WebSocket STOMP protocol enables instant messaging and friend presence features. Privacy controls offer three levels: `EVERYONE`, `FRIENDS_ONLY`, and `NOBODY` for both activity visibility and messaging permissions.

### Pluggable Cloud Storage
Supports multiple storage backends through a provider interface. Local storage for development and Cloudinary integration for production cloud uploads, with transparent fallback support.

---

## Technology Stack

- **Runtime:** Java 21 (LTS) with Spring Boot 3.3.1
- **Security:** Spring Security 6 with JWT authentication and Google OAuth2
- **Database:** PostgreSQL 15 with Spring Data JPA
- **Schema Management:** Flyway for database migrations
- **Caching & Leaderboards:** Redis with Spring Data Redis
- **Real-Time Communication:** Spring WebSocket (STOMP / SockJS)
- **Email Service:** Spring Boot Mail for OTP verification
- **Cloud Integration:** Cloudinary SDK for avatar storage
- **Testing:** JUnit 5 and Mockito

---

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/studytracker/
│   │   │   ├── config/          # Security, JWT, Redis, WebSocket configs
│   │   │   ├── controller/      # API Controllers
│   │   │   ├── dto/             # Request & Response DTOs
│   │   │   ├── event/           # System Events (XpEarnedEvent)
│   │   │   ├── listener/        # Event Listeners
│   │   │   ├── model/           # JPA Entities
│   │   │   ├── repository/      # Data Access Layer
│   │   │   ├── scheduler/       # Background Tasks
│   │   │   ├── service/         # Business Logic
│   │   │   │   └── storage/     # Storage Providers
│   │   │   └── StudyXpTrackerApplication.java
│   │   └── resources/
│   │       ├── db/migration/    # Flyway Migration Scripts
│   │       └── application.yml  # Configuration
│   └── test/                    # Unit & Integration Tests
├── Dockerfile                   # Container Build
└── pom.xml                      # Maven Dependencies
```

---

## Quick Start (Local Development)

### 1. Khởi động hạ tầng Docker
Chạy toàn bộ dịch vụ phụ trợ (PostgreSQL, Redis, Azurite Storage, Mailpit SMTP):
```bash
cd backend
docker compose up -d
```

| Dịch vụ | Cổng Host | Mục đích |
| :--- | :--- | :--- |
| **PostgreSQL 15** | `5432` | Database chính (`study_xp_tracker` / `postgres` / `password`) |
| **Redis 7** | `6379` | Cache, Leaderboard, Presence |
| **Azurite** | `10000` | Giả lập Azure Blob Storage offline |
| **Mailpit Web UI** | `8025` | Giao diện xem email OTP / Password reset offline |
| **Mailpit SMTP** | `1025` | Cổng gửi thư SMTP nội bộ |

### 2. Nạp biến môi trường Local (PowerShell)
```powershell
cd backend
. .\scripts\environment\set-env-local.ps1
```

### 3. Chạy Backend Service
```powershell
mvn spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:8080` (WebSocket tại: `ws://localhost:8080/ws`).

---

## Author & License
* **Author:** Tran Quoc Khanh

