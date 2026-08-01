# Study XP Tracker — Backend Service

RESTful API and Real-time Server for the **Study XP Tracker** application, developed with **Java 21** and **Spring Boot 3.3.1**. The backend handles all Experience Point (XP) calculation logic, level management, anti-cheat mechanisms, Redis leaderboards, real-time communication (WebSocket), and user management.

---

## 1. Technical Challenges & Backend Solutions

The backend of Study XP Tracker is engineered to solve critical technical challenges in gamification and study tracking applications:

### 1.1. Server-side Anti-Cheat Engine
* **Problem:** Users can manipulate client-side timer data or alter JavaScript execution to artificially increment XP points.
* **Solution:**
  * The backend never trusts client-provided duration values.
  * When a session starts, the server records the `start_time`. Upon session completion, the server calculates actual duration (`duration_seconds`) using system timestamps.
  * An integrated **Session Heartbeat Scheduler** periodically inspects active sessions, automatically terminating or capping sessions at a maximum continuous limit of **12 hours**.
  * Applies a **+10% XP** bonus for sessions $\ge 25$ minutes (Pomodoro standard).

### 1.2. High-Performance Real-Time Leaderboard (Redis ZSET + DB Fallback)
* **Problem:** Querying Top XP/Level leaderboards directly from a relational database (PostgreSQL) under high concurrency creates severe I/O bottlenecks.
* **Solution:**
  * Employs **Redis Sorted Sets (ZSET)** to store user XP with $O(\log N + M)$ query complexity.
  * Uses a Spring Event Listener (`XpEventListener`) listening to `XpEarnedEvent` to update Redis asynchronously without blocking the main API response path.
  * Features **Graceful Fallback**: If Redis loses connectivity, the system automatically falls back to PostgreSQL JPA queries without service interruption.

### 1.3. Real-Time Communication (WebSocket STOMP + SockJS)
* **Problem:** Displaying friends' online/offline presence and direct messaging.
* **Solution:**
  * Configures WebSocket with **STOMP / SockJS** transport protocol.
  * Manages activity visibility with 3 privacy levels (`ActivityStatusVisibility`: `EVERYONE`, `FRIENDS_ONLY`, `NOBODY`).
  * Enforces direct messaging permissions (`MessagePermission`: `EVERYONE`, `FRIENDS_ONLY`, `NOBODY`).

### 1.4. Pluggable File Storage Provider
* **Problem:** Must support both local development storage (Disk) and cloud production storage.
* **Solution:**
  * Implements a `FileStorageProvider` interface with two implementations:
    * `LocalStorageProviderImpl`: Saves avatar images to local `/uploads` directory.
    * `CloudinaryStorageProviderImpl`: Automatically uploads images to Cloudinary CDN API.

---

## 2. Tech Stack & Dependencies

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Language** | Java 21 (LTS) | Java 21 features & syntax |
| **Framework** | Spring Boot 3.3.1 | Core Framework |
| **Security** | Spring Security 6 + JJWT 0.11.5 | JWT Authentication & Authorization |
| **Database** | PostgreSQL 15 + Spring Data JPA | Relational Database |
| **Migration** | Flyway DB Migration | Schema Versioning & Seed Data |
| **Caching** | Spring Data Redis | Redis ZSET for Real-time Leaderboards |
| **Real-time** | Spring WebSocket (STOMP / SockJS) | Real-time Messaging & Presence |
| **Mail Service** | Spring Boot Starter Mail | Email OTP Verification |
| **OAuth2** | Google API Client 2.4.0 | Google OAuth2 Authentication |
| **Media Cloud** | Cloudinary SDK 1.38.0 | Cloud Avatar Storage |
| **Testing** | JUnit 5 + Mockito | Unit & Integration Testing |

---

## 3. Backend Directory Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/studytracker/
│   │   │   ├── config/          # Security, JWT, Redis, Web, WebSocket, Seed Data configs
│   │   │   ├── controller/      # Auth, User, Session, Leaderboard, Friend, Message, Admin
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
│   │       ├── db/migration/    # Flyway Migration Scripts (V1, V2)
│   │       └── application.yml  # Environment Configuration (DB, JWT, Mail, Redis)
│   └── test/                    # Unit Tests (XpService, LeaderboardService, UserService, ...)
├── Dockerfile                   # Backend Docker Build
└── pom.xml                      # Maven Dependencies
```

---

## 4. Setup & Running Backend

### Prerequisites:
* **JDK 21** or higher.
* **Maven 3.8+**.
* **PostgreSQL 15+** (or via Docker).
* **Redis 7+** (optional, fallback to DB available).

### Step 1: Start PostgreSQL & Redis via Docker
From the project root directory:
```bash
docker compose up -d
```
*Runs PostgreSQL on port `5432` and Redis on port `6379`.*

### Step 2: Environment Configuration
Check configuration in `application.yml` or update environment variables:
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
    expiration-ms: 86400000 # 24 hours
```

### Step 3: Build & Run Backend
Navigate to the `backend` directory:
```bash
# Build project
mvn clean package -DskipTests

# Run application
mvn spring-boot:run
```
Backend runs at: `http://localhost:8080`

### Step 4: Run Unit Tests
```bash
mvn test
```

---

## 5. Main API Endpoints Overview

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | POST | Register new account & send OTP |
| **Auth** | `/api/auth/verify-otp` | POST | Verify email using OTP code |
| **Auth** | `/api/auth/login` | POST | Authenticate & return JWT token |
| **Auth** | `/api/auth/google` | POST | Authenticate/Register via Google OAuth2 |
| **Session**| `/api/sessions/start` | POST | Start a new study session |
| **Session**| `/api/sessions/stop` | POST | Stop session & auto-calculate XP |
| **Session**| `/api/sessions/stats` | GET | Retrieve study statistics & 7-day chart data |
| **Leaderboard**| `/api/leaderboard` | GET | Fetch Top XP/Level leaderboard (Redis/DB) |
| **Friends**| `/api/friends/request` | POST | Send friend request |
| **Friends**| `/api/friends/list` | GET | List friends & online presence |
| **Messages**| `/api/messages/{friendId}`| GET | Fetch chat message history with a friend |
| **Admin** | `/api/admin/overview` | GET | Admin overview dashboard statistics |

---

## Author & License
* **Author:** Tran Quoc Khanh
