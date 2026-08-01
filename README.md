# Study XP Tracker — Monorepo

[![Java](https://img.shields.io/badge/Java-21-orange.svg?style=flat-square&logo=openjdk)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Study XP Tracker** is a modern gamified study time management and productivity platform. The project combines a sleek Glassmorphic user interface (React 19, Framer Motion) with a robust backend architecture (Spring Boot 3.3, Redis ZSET, Real-time WebSocket STOMP), empowering learners to maintain focus, earn Experience Points (XP), level up, and compete on dynamic leaderboards.

---

## Project Overview & Key Features

### 1. Focus Timer & Server-Side Anti-Cheat Engine
* **Multiple Timer Modes:** Supports Pomodoro Countdown (25-minute standard) and Stopwatch modes.
* **Server-Side Validation:** The backend records session start timestamps and calculates duration server-side to prevent client-side timer manipulation.
* **Heartbeat Scheduler:** Automatically monitors active sessions, enforcing a 12-hour session limit and awarding a **+10% XP** bonus for completed Pomodoro sessions $\ge 25$ minutes.

### 2. Study Document Drive & Storage Integration
* **Document Management:** Upload, organize, and access personal study documents.
* **Cloud Storage & Fallback Stream:** Interfaces with Azure Blob Storage and Cloudinary CDN using secure access tokens, featuring an authenticated backend stream fallback for CORS resilience.

### 3. High-Performance Real-Time Leaderboard (Redis ZSET)
* **Redis Sorted Sets:** Stores user XP ranks with $O(\log N + M)$ query complexity.
* **Asynchronous Updates:** Listens to `XpEarnedEvent` to update leaderboard state asynchronously without blocking primary response paths.
* **Graceful Fallback:** Automatically falls back to PostgreSQL queries if Redis connectivity is interrupted.

### 4. Social Hub & Real-Time Messaging (WebSocket STOMP)
* **Friend Presence:** Displays real-time online/offline status and current activity.
* **Granular Privacy Controls:** Configurable status visibility (`ActivityStatusVisibility`) and message permissions (`MessagePermission`).
* **Direct Messaging:** Instant, encrypted-in-transit messaging powered by WebSocket STOMP / SockJS.

### 5. Interactive Analytics & Heatmap
* **Contribution Heatmap:** GitHub-style activity grid tracking daily study volume and active streaks.
* **7-Day Focus Chart:** Visualizes weekly study duration and productivity trends via Recharts.

### 6. Internationalization (i18n) & PWA Support
* **Multi-Language Support:** Instant switching between English, Vietnamese, and Chinese (中文).
* **Progressive Web App (PWA):** Installable directly on Desktop, Android, and iOS devices with offline shell detection.

### 7. Administration Portal (Admin Dashboard)
* Real-time active user monitoring, account status management (ban/unban), suspicious activity alert logging, and system-wide metric tracking.

---

## Tech Stack & Architecture

### **Frontend**
* **Core:** React 19, Vite 8, JavaScript (ES6+).
* **Styling & UI:** Tailwind CSS v4, Lucide Icons, Glassmorphism System.
* **Animation & Charts:** Framer Motion, Recharts, Canvas Confetti.
* **Real-time & Networking:** SockJS-client, StompJS, Axios.

### **Backend**
* **Core Framework:** Java 21 (LTS), Spring Boot 3.3.1.
* **Security & Auth:** Spring Security 6, JJWT (Dual Cookie Token Auth: HTTP-Only Refresh Cookie + Access Token), Google OAuth2.
* **Database & ORM:** PostgreSQL 15, Spring Data JPA, Flyway Database Migration.
* **Caching & Real-Time:** Spring Data Redis (ZSET Leaderboard), Spring WebSocket (STOMP / SockJS).
* **Storage Provider:** Pluggable Architecture (Azure Blob Storage / Cloudinary / Local Disk).

### **Infrastructure & CI/CD**
* **Containerization:** Docker, Docker Compose.
* **Infrastructure as Code:** Terraform scripts.
* **Automation:** GitHub Actions Monorepo Workflows (`backend-ci-cd.yml`, `frontend-ci-cd.yml`).

---

## Monorepo Directory Structure

```text
study-tracking/
├── .github/
│   └── workflows/
│       ├── backend-ci-cd.yml      # GitHub Actions CI/CD for Backend
│       └── frontend-ci-cd.yml     # GitHub Actions CI/CD for Frontend
├── backend/                       # Java Spring Boot Backend Service
│   ├── src/                       # Controllers, Services, Repositories, DTOs, Configs
│   ├── Dockerfile                 # Backend Containerization
│   └── pom.xml                    # Maven Configuration
├── frontend/                      # React SPA Frontend Web Application
│   ├── src/                       # Components, Pages, Contexts, Hooks
│   ├── public/                    # Static Assets & PWA Manifest
│   ├── package.json               # NPM Dependencies & Scripts
│   └── vite.config.js             # Vite Configuration
├── infra/                         # Terraform Scripts & Deployment Shells
├── .gitignore
├── LICENSE                        # MIT License
└── README.md                      # Monorepo Documentation
```

---

## Setup & Local Development Guide

### Prerequisites
* **Java 21** or higher.
* **Node.js** 18.x+ & **npm** 9.x+.
* **Maven** 3.8+ (or Maven wrapper included).
* **Docker & Docker Compose** (for running PostgreSQL & Redis).

---

### Step 1: Clone Repository
```bash
git clone https://github.com/khanhtq/study-tracking.git
cd study-tracking
```

---

### Step 2: Start Databases (PostgreSQL & Redis)
Run Docker Compose from the root directory to spin up PostgreSQL (Port `5432`) and Redis (Port `6379`):
```bash
docker compose -f backend/docker-compose.yml up -d
```

---

### Step 3: Configure & Run Backend Service
1. Open terminal and navigate to `backend`:
   ```bash
   cd backend
   ```
2. Build Maven package:
   ```bash
   mvn clean package -DskipTests
   ```
3. Run Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   Backend listens at: **`http://localhost:8080`**

---

### Step 4: Run Frontend Application
1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install NPM dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   Frontend listens at: **`http://localhost:5173`**

---

## Environment Variables

### Backend (`backend/src/main/resources/application.yml` or ENV)
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

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Author & Repository

* **Author:** Tran Quoc Khanh ([@khanhtq](https://github.com/khanhtq))
* **Repository:** [https://github.com/khanhtq/study-tracking](https://github.com/khanhtq/study-tracking)
