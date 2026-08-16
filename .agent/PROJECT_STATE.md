# Study XP Tracker - Project State & Architecture Overview

> **Purpose**: This document provides a complete, authoritative overview of the current project state, database schema versions, backend/frontend module breakdown, and core business rules. Agents can reference this file to instantly understand the system state without needing to re-scan the entire codebase.

---

## 1. System Architecture & Tech Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Recharts, SockJS-client, StompJS | Glassmorphism UI, Responsive UX (Mobile/Tablet/Desktop), Dark/Light theme, 3-language i18n, Real-time WebSocket subscriptions |
| **Backend** | Java 21, Spring Boot 3.3.1, Spring Security 6 (JWT + OAuth2), Spring Data JPA, Lettuce Redis, STOMP | RESTful APIs, XP/Level calculation, Anti-Cheat validation, Flyway migrations, Redis leaderboard + fallback, WebSocket broker |
| **Database** | PostgreSQL 15, Redis 7 (Sorted Sets & Cache) | Persistent storage, Flyway version-controlled schema, real-time leaderboard ranking |
| **Storage** | Azure Blob Storage / Cloudinary / Local Fallback | Study documents and user avatar uploads |
| **Infrastructure** | Docker, Docker Compose, Terraform, GitHub Actions | Containerization, deployment automation, CI/CD pipelines |

---

## 2. Database State & Flyway Migrations (Current: `V17`)

| Version | Migration Script | Description & Table Changes |
| :--- | :--- | :--- |
| **V1** | `V1__init_schema.sql` | Initial schema: `users`, `xp_level_config`, `study_sessions`, `friendships`, `messages` |
| **V2** | `V2__add_performance_indexes.sql` | Added performance indexes on `study_sessions`, `messages`, and `friendships` |
| **V3** | `V3__seed_xp_level_config.sql` | Seeded base XP level thresholds from Level 1 to Level 100 |
| **V4** | `V4__add_user_ban_columns.sql` | Added `banned`, `ban_reason`, `banned_at`, `banned_by` to `users` |
| **V5** | `V5__add_premium_user_columns.sql` | Added `is_premium`, `premium_until`, `premium_package` to `users` |
| **V6** | `V6__create_payment_orders_table.sql` | Created `payment_orders` for MoMo / VNPay / banking transactions |
| **V7** | `V7__create_payment_packages_table.sql` | Created `payment_packages` table for premium subscription tiers |
| **V8** | `V8__add_is_virtual_to_users.sql` | Added `is_virtual` boolean column for demo/virtual leaderboard users |
| **V9** | `V9__make_password_hash_nullable.sql` | Made `password_hash` nullable to support pure Google OAuth2 registrations |
| **V10** | `V10__add_performance_indexes.sql` | Added indexes on user lookup, email, and session timestamps |
| **V11** | `V11__create_refresh_tokens_table.sql` | Created `refresh_tokens` table for secure JWT rotation and multi-device sessions |
| **V12** | `V12__create_study_documents_table.sql` | Created `study_documents` (hierarchical folders, files, storage paths, soft delete) |
| **V13** | `V13__alter_avatar_url_column_type.sql` | Altered `avatar_url` from `VARCHAR(255)` to `TEXT` for longer data URLs |
| **V14** | `V14__create_presence_logs_table.sql` | Created `presence_logs` for AI camera presence detection timestamps and auto-pause logs |
| **V15** | `V15__create_countdown_and_preset_tables.sql` | Created `system_preset_exams` & `countdown_events` with initial Vietnam exam seeds (THPT QG, DGNL) |
| **V16** | `V16__add_community_events_and_tracker_counts.sql` | Added `created_by_user_id`, `is_community_event`, `tracker_count` to preset exams |
| **V17** | `V17__add_community_events_and_tracker_counts.sql` | Schema consistency check for community exam sharing & tracker counter sync |

> **Next Flyway Migration to use**: `V18__<description>.sql`. **Never alter `V1` - `V17`**.

---

## 3. Backend Modules & Endpoints

| Controller | Base Path | Key Endpoints & Responsibilities |
| :--- | :--- | :--- |
| **AuthController** | `/api/auth` | `/register`, `/login`, `/google`, `/verify-otp`, `/resend-otp`, `/refresh-token`, `/forgot-password`, `/reset-password` |
| **UserController** | `/api/users` | `/me` (profile & stats), `/profile` (update), `/avatar` (upload), `/search` (user discovery), `/public-profile/{id}` |
| **StudySessionController** | `/api/sessions` | `/start`, `/heartbeat`, `/stop`, `/manual` (manual entry), `/history` (paginated past sessions) |
| **PresenceController** | `/api/presence` | `/log` (logs presence status true/false during camera-monitored study sessions) |
| **DocumentController** | `/api/documents` | `/list`, `/upload`, `/folder`, `/delete/{id}`, `/restore/{id}`, `/favorite/{id}`, `/preview/{id}`, `/download/{id}` |
| **CountdownController** | `/api/countdown` | `/events` (CRUD user countdowns, pin widget), `/presets` (preset exams), `/community/create`, `/community/track` |
| **LeaderboardController** | `/api/leaderboard` | `/daily`, `/weekly`, `/monthly`, `/all-time` (Redis sorted sets with PostgreSQL fallback) |
| **FriendshipController** | `/api/friends` | `/list`, `/requests`, `/send/{id}`, `/accept/{id}`, `/reject/{id}`, `/unfriend/{id}` |
| **MessageController** | `/api/messages` | `/conversations`, `/{friendId}` (paginated direct messages) |
| **PaymentController** | `/api/payments` | `/packages`, `/create-order`, `/callback` (MoMo / VNPay simulation & validation) |
| **AdminController** | `/api/admin` | `/users`, `/ban/{id}`, `/unban/{id}`, `/stats`, `/suspicious-activity` |
| **HealthController** | `/api/health` | Service health checks |

---

## 4. Frontend Structure, Pages & Modals

### 4.1. Core Pages (`frontend/src/pages/`)
- `Landing.jsx`: Public landing page with features showcase, CTA, and dynamic preview.
- `Login.jsx` & `Register.jsx`: Authentication forms with Google OAuth2 button and form validation.
- `VerifyOtp.jsx` & `ForgotPassword.jsx`: Email OTP verification and password reset workflows.
- `Dashboard.jsx`: Main study hub with:
  - Smart Focus Timer (Stopwatch, Pomodoro 25/5 & custom intervals).
  - Study Calendar & Heatmap (GitHub-style activity contributions).
  - Countdown Widget & Floating Mini-Badge (Pinned exam/event tracking).
  - Dashboard Customizer (Widget reordering and visibility toggles).
  - Real-time Leaderboard preview and Online Friends bar.
- `DocumentDrive.jsx`: Cloud storage drive with folder navigation, drag-and-drop file upload, search, favorites, trash bin, and preview.
- `Profile.jsx`: User profile, XP level progression, stats, badges, account settings, and sound/theme toggles.
- `AdminDashboard.jsx`: User administration, ban management, and system metrics.

### 4.2. Key Modals & Components (`frontend/src/components/`)
- `StudyTimer.jsx`: Focus timer supporting Pomodoro & Stopwatch with audio chimes and XP bonus calculation.
- `CameraPresenceTracker.jsx` & `utils/presenceDetector.js`: TensorFlow/MediaPipe webcam face detection; pauses timer on 5min continuous absence and deducts inactive XP.
- `CountdownModal.jsx`, `CountdownWidget.jsx`, `FloatingCountdownBadge.jsx`: Multi-event countdown tracker with system presets, community sharing, auto-expiry, and widget pinning.
- `DashboardCustomizerModal.jsx`: Customizes widget visibility and dashboard layout.
- `ChatModal.jsx` & `FriendsModal.jsx`: Real-time instant messaging and friend management via STOMP WebSocket.
- `UploadProgressPopup.jsx` & `AvatarUploader.jsx`: File upload visualizer with chunked/direct progress.

### 4.3. Contexts (`frontend/src/context/`)
- `AuthContext.jsx`: Authentication state, user profile, token persistence, and logout flow.
- `LanguageContext.jsx`: Centralized i18n supporting **`en`** (English), **`vi`** (Vietnamese), and **`zh`** (Chinese).
- `ThemeContext.jsx`: Dark and Light mode state and root class binding.
- `UploadContext.jsx`: Global background upload queue state.

---

## 5. Core Business Logic & Rules

### 5.1. XP & Leveling Engine
- Base XP Formula: $1\text{ minute of focused study} = 1\text{ XP}$.
- Pomodoro Bonus: $+10\%$ bonus XP upon completing a scheduled Pomodoro cycle without interruption.
- Presence Auto-pause: If user is absent for $\ge 5$ minutes continuously, timer pauses and inactive time is deducted from total study duration.
- Anti-Cheat Max Limit: Single session capped at a maximum of 12 hours ($43,200\text{ seconds}$). Sessions exceeding this are clipped or rejected.

### 5.2. Multi-Language Standard
- All keys must exist in `LanguageContext.jsx` under `translations.en`, `translations.vi`, and `translations.zh`.
- Access using `t('section.key')` or `t('key')`.

### 5.3. Real-Time WebSocket Topics
- Chat Direct Messages: `/topic/messages.{userId}` or `/user/queue/messages`
- Friend Status & Online Presence: `/topic/presence`
- Live XP / Leaderboard Updates: `/topic/leaderboard`
