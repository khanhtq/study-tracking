# Study XP Tracker - Project State & Architecture Overview

> **Purpose**: This document provides a complete, authoritative overview of the current project state, database schema versions, backend/frontend module breakdown, and core business rules. Agents can reference this file to instantly understand the system state without needing to re-scan the entire codebase.

---

## 1. System Architecture & Tech Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Recharts, SockJS-client, StompJS | Glassmorphism UI, Responsive UX (Mobile/Tablet/Desktop), Dark/Light theme, 3-language i18n, Real-time WebSocket subscriptions |
| **Backend** | Java 21, Spring Boot 3.3.1, Spring Security 6 (JWT + OAuth2), Spring Data JPA, Lettuce Redis, STOMP | RESTful APIs, XP/Level calculation, Anti-Cheat validation, Flyway migrations, Redis leaderboard + fallback, WebSocket broker |
| **Database** | PostgreSQL 15, Redis 7 (Sorted Sets & Cache) | Persistent storage, Flyway version-controlled schema, real-time leaderboard ranking |
| **Storage** | Local Storage (`uploads/`) / Azure Blob Storage / Cloudinary | Storage abstraction for study documents, group chat multimedia, avatars, with fallback |
| **Infrastructure** | Docker, Docker Compose, Terraform, GitHub Actions | Containerization, deployment automation, CI/CD pipelines |

---

## 2. Database State & Flyway Migrations (Current: `V18`)

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
| **V18** | `V18__create_community_chat_tables.sql` | Created Community & Group Real-time Chat subsystem: `chat_groups`, `group_members`, `group_join_requests`, `group_invites`, `group_messages`, `message_attachments`, `message_reactions` |

> **Next Flyway Migration to use**: `V19__<description>.sql`. **Never alter `V1` - `V18`**.

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
| **GroupController** | `/api/v1/chat/groups` | `/`, `/{id}`, `/my-groups`, `/popular`, `/search`, `/{id}/join`, `/{id}/leave` |
| **GroupMemberController** | `/api/v1/chat/groups/{groupId}/members` | `/`, `/{userId}/role`, `/{userId}/kick`, `/{userId}/mute`, `/{userId}/unmute`, `/requests`, `/requests/{reqId}/approve`, `/requests/{reqId}/reject` |
| **GroupInviteController** | `/api/v1/chat` | `/groups/{groupId}/invites` (create, list, revoke), `/invites/{code}` (preview), `/invites/{code}/join` |
| **ChatMediaController** | `/api/v1/chat/groups/{groupId}` | `/attachments` (POST upload, GET list all media), `/share-document` (share from Drive), `/save-document/{attachmentId}` (1-Click save to personal library) |
| **GroupChatStompController** | `/app` & `/topic` | STOMP handlers for group messages, reactions, pins, typing indicators, and system broadcasts |
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
  - Trending Study Groups Widget (`TrendingGroupsWidget.jsx`).
  - Dashboard Customizer (Widget reordering and visibility toggles).
  - Real-time Leaderboard preview and Online Friends bar.
- `Community.jsx`: Community Study Groups Hub (Explore trending groups, Search, My Groups, Create group, Direct Room transition).
- `DocumentDrive.jsx`: Cloud storage drive with folder navigation, drag-and-drop file upload, search, favorites, trash bin, and preview.
- `Profile.jsx`: User profile, XP level progression, stats, badges, account settings, and sound/theme toggles.
- `AdminDashboard.jsx`: User administration, ban management, and system metrics.

### 4.2. Key Modals & Components (`frontend/src/components/`)
- `StudyTimer.jsx`: Focus timer supporting Pomodoro & Stopwatch with audio chimes and XP bonus calculation.
- `TrendingGroupsWidget.jsx`: Dashboard widget for exploring trending study groups, quick join, and instant chat access.
- `CountdownModal.jsx`, `CountdownWidget.jsx`, `FloatingCountdownBadge.jsx`: Multi-event countdown tracker with system presets, community sharing, auto-expiry, and widget pinning.
- `DashboardCustomizerModal.jsx`: Customizes widget visibility (XP bar, timer, manual log, online users, trending groups, countdown, history).
- `ChatModal.jsx` & `FriendsModal.jsx`: Direct peer messaging and friend management via STOMP WebSocket.
- `UploadProgressPopup.jsx` & `AvatarUploader.jsx`: File upload visualizer with chunked/direct progress.

### 4.3. Community & Chat Sub-components (`frontend/src/components/chat/`)
- `GroupChatRoom.jsx`: Full-screen real-time group chat room with STOMP messaging, message search, pinboard, @mentions autocomplete, inline reply bubbles, emoji reactions, drag-and-drop & clipboard paste file attachments, mute banner alert, and responsive pixel-perfect inputs.
- `GroupMediaModal.jsx`: Shared multimedia & documents browser tab with category filtering (All, Media, Documents, Audio), search, direct download, image lightbox, and 1-Click Save to personal Drive.
- `GroupMembersModal.jsx`: Member list management, moderation tools (mute/unmute with countdown, role promotion, kick), and join request approval queue.
- `GroupInviteModal.jsx`: Invite link generator with usage count and expiry management.
- `ShareDocumentModal.jsx`: Select and share study documents directly from user's personal drive into group chat.
- `ChatToast.jsx`: Glassmorphic floating toast alert for smooth, non-intrusive notifications.
- `ConfirmModal.jsx`: Modern glassmorphic action confirmation modal with loading feedback.

### 4.4. Contexts (`frontend/src/context/`)
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

### 5.2. Community Chat & Moderation Rules
- Membership Roles: `OWNER` > `ADMIN` > `MODERATOR` > `MEMBER`.
- Member Mute: Muted members retain group access and history reading but are blocked from sending messages, reactions, and uploading files until `muted_until` expires.
- 1-Click Drive Save: Attachments shared in chat can be cloned directly into the recipient's personal `StudyDocument` storage with zero re-upload.
- Database JSON Mapping: `message_attachments.metadata` column is PostgreSQL `JSONB` and must be mapped using `@JdbcTypeCode(SqlTypes.JSON)`.
- Storage Provider: Automatically defaults to `local` (`backend/uploads/`) during local development and `azure` (Azure Blob Storage) on production profile (`prod`).

### 5.3. Real-Time WebSocket Topics
- Direct Messages: `/topic/messages.{userId}` or `/user/queue/messages`
- Group Messages: `/topic/group.{groupId}.messages`
- Group Reactions: `/topic/group.{groupId}.reactions`
- Group Pinned: `/topic/group.{groupId}.pinned`
- Group Typing: `/topic/group.{groupId}.typing`
- Friend Status & Online Presence: `/topic/presence`
- Live XP / Leaderboard Updates: `/topic/leaderboard`
