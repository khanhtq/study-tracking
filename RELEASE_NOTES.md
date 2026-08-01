# Study XP Tracker v2.0.0 — Monorepo Consolidation & Unified Architecture

## Overview
We are excited to announce the official release of **Study XP Tracker v2.0.0**, marking the transition from separate component repositories into a single, unified **Monorepo** architecture. This release consolidates the Java 21 / Spring Boot 3.3 backend, React 19 / Vite 8 frontend, and Terraform infrastructure management into one repository while preserving full historical commit records.

---

## What's New

### 1. Monorepo Migration & Repository Consolidation
- **Unified Codebase:** Merged standalone backend, frontend, and infrastructure repositories into a structured monorepo tree (`backend/`, `frontend/`, `infra/`).
- **Preserved Commit History:** Retained 100% commit history, timestamps, authors, and diffs from prior component repositories using Git Subtree.
- **Root CI/CD Pipeline:** Configured GitHub Actions workflows (`.github/workflows/backend-ci-cd.yml`, `.github/workflows/frontend-ci-cd.yml`) featuring directory-level path filtering (`backend/**`, `frontend/**`) to optimize build triggers.

### 2. Backend Services & Core Infrastructure
- **Framework Upgrade:** Standardized on Java 21 (LTS) and Spring Boot 3.3.1.
- **Server-Side Anti-Cheat Engine:** Implemented server-calculated session duration with automatic 12-hour session capping via heartbeat scheduler, eliminating client-side timer tampering.
- **High-Performance Leaderboard:** Integrated Redis Sorted Sets (ZSET) for O(log N + M) leaderboard queries with asynchronous event handling and graceful PostgreSQL JPA fallback.
- **Study Document Drive API:** Built RESTful APIs for file and folder management supporting pluggable storage providers (Azure Blob Storage with SAS Tokens, Cloudinary CDN, and Local Disk).
- **Enhanced Authentication & Security:** Upgraded to HTTP-Only Cookie dual-token authentication (Access Token + Refresh Token rotation) alongside Google OAuth2 integration.
- **Real-Time Messaging:** Enabled WebSocket STOMP / SockJS transport with configurable privacy settings (`ActivityStatusVisibility`, `MessagePermission`).

### 3. Frontend Web Application & User Experience
- **Core Architecture:** Upgraded to React 19, Vite 8, and Tailwind CSS v4.
- **Study Document Drive UI:** Designed a drag-and-drop document management interface with custom deletion modals, i18n support, and CORS-resilient download streaming.
- **Analytics & Heatmap:** Built interactive GitHub-style contribution heatmaps and 7-day focus analytics using Recharts.
- **Gamification Mechanics:** Integrated Level Up celebrations, titles, badges, and real-time XP gain predictions.
- **Internationalization (i18n):** Enabled instant runtime language switching between English, Vietnamese, and Chinese (中文).
- **Progressive Web App (PWA):** Provided native-like PWA installation support and offline network detection banners.
- **Admin Management Portal:** Added real-time online user tracking, account status controls (ban/unban), suspicious activity alert monitoring, and system metrics.

---

## Upgrade Instructions & Environment Setup

1. **Clone Monorepo:**
   ```bash
   git clone https://github.com/khanhtq/study-tracking.git
   cd study-tracking
   ```

2. **Environment Configuration:**
   - **Backend:** Copy `backend/scripts/environment/set-env.example.ps1` (Windows) or `set-env.example.sh` (Linux/macOS) and execute to export environment variables.
   - **Frontend:** Copy `frontend/.env.example` to `frontend/.env` and update `VITE_API_URL`.

3. **Database Launch:**
   ```bash
   docker compose -f backend/docker-compose.yml up -d
   ```

4. **Launch Application Services:**
   - **Backend:** `cd backend && mvn spring-boot:run`
   - **Frontend:** `cd frontend && npm install && npm run dev`
