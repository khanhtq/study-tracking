# Study XP Tracker - Project State & Architecture Overview

> **Purpose**: This document provides a complete, authoritative overview of the current project state, database schema versions, backend/frontend module breakdown, and core business rules. Agents MUST reference this file before every task and MUST update it after every single modification (big or small).

---

## 1. System Architecture & Tech Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Recharts, SockJS-client, StompJS | Glassmorphism UI, Responsive UX (Mobile/Tablet/Desktop), Dark/Light theme, 3-language i18n, Real-time WebSocket subscriptions |
| **Backend** | Java 21, Spring Boot 3.3.1, Spring Security 6 (JWT + OAuth2), Spring Data JPA, Lettuce Redis, STOMP | RESTful APIs, XP/Level calculation, Anti-Cheat validation, Flyway migrations, Redis leaderboard + fallback, WebSocket broker, Group chat engine |
| **Database** | PostgreSQL 15, Redis 7 (Sorted Sets & Cache) | Persistent storage, Flyway version-controlled schema, real-time leaderboard ranking, popularity scoring |
| **Storage** | Azure Blob Storage / Cloudinary / Local Fallback | Study documents, chat media attachments, voice notes, and user avatars |
| **Infrastructure** | Docker, Docker Compose, Terraform, GitHub Actions | Containerization, deployment automation, CI/CD pipelines (Backend & Frontend) |

---

## 2. Database State & Flyway Migrations (Current: `V19`)

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
| **V18** | `V18__create_community_chat_tables.sql` | Comprehensive Community Group Chat system: `chat_groups`, `group_members`, `group_join_requests`, `group_messages`, `message_mentions`, `message_attachments`, `message_reactions`, `group_pinned_messages`, `group_invite_links` |
| **V19** | `V19__add_soft_delete_to_chat_groups.sql` | Added soft delete columns `deleted_at` and `deleted_by` to `chat_groups` with indexes |

> **Next Flyway Migration to use**: `V20__<description>.sql`. **Never alter `V1` - `V19`**.

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
| **GroupController** | `/api/groups` | `/explore` (trending/search), `/my-groups`, `/create`, `/{groupId}` (details/update/delete), `/{groupId}/members` (roles, kick, mute), `/{groupId}/join`, `/{groupId}/leave`, `/{groupId}/requests` (approve/reject), `/{groupId}/invites` (create/revoke links) |
| **GroupChatRestController** | `/api/groups/{groupId}/messages` | Paginated message stream, search messages (FTS), pinned messages, edit message, delete message, reactions, mentions |
| **GroupChatStompController** | WebSocket STOMP | `/app/chat.group.{groupId}.send`, `/app/chat.group.{groupId}.react`, `/app/chat.group.{groupId}.typing`, broadcasts to `/topic/group.{groupId}` |
| **ChatMediaController** | `/api/chat/media` | Upload chat media attachments (images, video, audio voice notes, study documents) |
| **GroupInvitePublicController** | `/api/invite/{code}` | Public invite link resolution, metadata preview, and direct join verification |
| **LeaderboardController** | `/api/leaderboard` | `/daily`, `/weekly`, `/monthly`, `/all-time` (Redis sorted sets with PostgreSQL fallback) |
| **FriendshipController** | `/api/friends` | `/list`, `/requests`, `/send/{id}`, `/accept/{id}`, `/reject/{id}`, `/unfriend/{id}` |
| **MessageController** | `/api/messages` | `/conversations`, `/{friendId}` (paginated direct messages) |
| **PaymentController** | `/api/payments` | `/packages`, `/create-order`, `/callback` (MoMo / VNPay simulation & validation) |
| **AdminController** | `/api/admin` | `/users`, `/ban/{id}`, `/unban/{id}`, `/stats`, `/suspicious-activity` |
| **HealthController** | `/api/health` | Service health checks |

### Backend Background Schedulers
- `SessionHeartbeatScheduler`: Periodically checks and auto-closes dead/abandoned study sessions without recent heartbeat.
- `UnverifiedUserCleanupScheduler`: Automatically purges expired unverified registrations.

---

## 4. Frontend Structure, Pages, Modals & Widgets

### 4.1. Core Pages (`frontend/src/pages/`)
- `Landing.jsx`: Public landing page with features showcase, CTA, and dynamic preview.
- `Login.jsx` & `Register.jsx`: Authentication forms with Google OAuth2 button and form validation.
- `VerifyOtp.jsx` & `ForgotPassword.jsx`: Email OTP verification and password reset workflows.
- `Dashboard.jsx`: Main study hub with:
  - Smart Focus Timer (Stopwatch, Pomodoro 25/5 & custom intervals).
  - Study Calendar & Heatmap (GitHub-style activity contributions).
  - Countdown Widget & Floating Mini-Badge (Pinned exam/event tracking).
  - Trending Groups Widget (Quick access to study communities).
  - Dashboard Customizer (Widget reordering and visibility toggles).
  - Real-time Leaderboard preview and Online Friends bar.
- `Community.jsx`: Community exploration hub to discover study groups, browse trending groups by popularity, search, create groups, and manage memberships.
- `DocumentDrive.jsx`: Cloud storage drive with folder navigation, drag-and-drop file upload, search, favorites, trash bin, and preview.
- `Profile.jsx`: User profile, XP level progression, stats, badges, account settings, and sound/theme toggles.
- `AdminDashboard.jsx`: User administration, ban management, and system metrics.

### 4.2. Chat & Community Components (`frontend/src/components/chat/`)
- `GroupChatRoom.jsx`: Full-featured Discord/Slack-style group chat interface with thread replies, rich attachments, voice notes, document sharing, reactions, typing indicator, pinning, and mention auto-complete.
- `GroupMembersModal.jsx`: Member list, role management (`OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`), kick, ban, and mute controls.
- `GroupInviteModal.jsx`: Generate & manage invite links with expiration time and usage limits.
- `GroupMediaModal.jsx`: Gallery modal showing shared media, files, and links in the group.
- `EditGroupModal.jsx`: Update group metadata, privacy (`PUBLIC`, `PRIVATE`), join policy (`OPEN`, `APPROVAL_REQUIRED`), avatar, and cover image.
- `ShareDocumentModal.jsx`: Select and attach documents directly from DocumentDrive into group chat.
- `ChatToast.jsx` & `ConfirmModal.jsx`: Notification toasts and action confirmation dialogs.

### 4.3. Other Key Modals & Components (`frontend/src/components/`)
- `StudyTimer.jsx`: Focus timer supporting Pomodoro & Stopwatch with audio chimes and XP bonus calculation.
- `CameraPresenceTracker.jsx` & `utils/presenceDetector.js`: TensorFlow/MediaPipe webcam face detection; pauses timer on 5min continuous absence and deducts inactive XP.
- `CountdownModal.jsx`, `CountdownWidget.jsx`, `FloatingCountdownBadge.jsx`: Multi-event countdown tracker with system presets, community sharing, auto-expiry, and widget pinning.
- `TrendingGroupsWidget.jsx`: Dashboard widget showing active/trending study groups.
- `DashboardCustomizerModal.jsx`: Customizes widget visibility and dashboard layout.
- `ChatModal.jsx` & `FriendsModal.jsx`: 1-on-1 direct messaging and friend management.
- `UploadProgressPopup.jsx` & `AvatarUploader.jsx`: File upload visualizer with progress indication.

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

### 5.2. Community Group Chat Rules & Policies
- Group Roles: `OWNER` (full control, transfer ownership, delete group), `ADMIN` (manage settings, invites, members), `MODERATOR` (delete messages, mute members), `MEMBER` (chat, react, share documents).
- Join Policy: `OPEN` (instant join) or `APPROVAL_REQUIRED` (requires admin/mod approval via join requests).
- Privacy: `PUBLIC` (discoverable in explore/search) vs `PRIVATE` (joinable only via invite link).
- Soft Delete: Deleted groups retain data with `deleted_at` and `deleted_by` for audit and recovery.

### 5.3. Multi-Language Standard
- All keys must exist in `LanguageContext.jsx` under `translations.en`, `translations.vi`, and `translations.zh`.
- Access using `t('section.key')` or `t('key')`.

### 5.4. Real-Time WebSocket Topics
- Group Chat Messages & Events: `/topic/group.{groupId}`
- Group Typing Indicators: `/topic/group.{groupId}.typing`
- Direct Messages: `/user/queue/messages` or `/topic/messages.{userId}`
- Friend Presence Updates: `/topic/presence`
- Live Leaderboard Updates: `/topic/leaderboard`

### 5.5. Theme & Design System Standards (Tailwind v4 Inverted Slate)
- **Palette Definition in `index.css`**:
  - `--slate-950`: `#F4F4F6` (Light mode page background) / `#020617` (Dark mode page background).
  - `--slate-900`: `#FFFFFF` (Light mode card background) / `#0f172a` (Dark mode card background).
  - `--slate-800`: `#E5E7EB` (Light border card nhạt) / `#1e293b` (Dark border).
  - `--slate-700`: `#D1D5DB` (Light border rõ / dividers) / `#334155` (Dark divider).
  - `--slate-500`: `#6B7280` (Muted secondary metrics).
  - `--slate-400`: `#4B5563` (Muted labels & placeholders: `placeholder:text-slate-400`).
  - `--slate-200`: `#1F2937` (Strong text / subheadings).
  - `--slate-100`: `#111827` (Darkest primary text in light mode / `#f1f5f9` bright text in dark mode).
- **Rule for Text Contrast**:
  - ALWAYS use `text-slate-100` for primary text / numbers and `text-slate-200` for strong text across BOTH themes.
  - NEVER use `text-slate-900` or `text-slate-800` as text colors (in light mode, `--slate-900` is white `#FFFFFF` causing invisible text on light backgrounds).
  - Explicitly use `placeholder:text-slate-400` on input fields.
- **Text Gradient Policy**:
  - In Light Mode, `.light .bg-clip-text` is automatically reset via CSS to solid `var(--slate-100)` (`#111827`) to prevent washed-out text and preserve readability.
  - In Dark Mode, text gradients remain enabled.
- **Study Calendar Heatmap Green Tiers**:
  - Level 0 (0h): `#E5E7EB` (border `#D1D5DB`)
  - Level 1 (< 1h): `#86efac` (border `#4ade80`)
  - Level 2 (1h - 2h): `#22c55e` (border `#16a34a`)
  - Level 3 (2h - 3h): `#15803d` (border `#166534`)
  - Level 4 (≥ 3h): `#14532d` (border `#052e16`)

---

## 6. Recent Changelog & Completed Tasks

- **Theme Contrast & Light Mode Overhaul**:
  - Replaced washed-out text in `TrendingGroupsWidget`, `SessionHistoryList`, `OnlineUsersList`, `XpBar`, `CountdownWidget`, and `ManualSessionForm` with high-contrast `text-slate-100` / `text-slate-200`.
  - Fixed white-on-white text in `CountdownWidget` (HRS/MINS) and `ManualSessionForm` inputs.
  - Enhanced green heatmap tiers in `StudyCalendar` for WCAG AA compliance.
  - Removed light mode text gradients to ensure solid, crisp typography.
- **Bug Fixes**:
  - Fixed `ReferenceError: Flame is not defined` in `Community.jsx` by importing `Flame` from `lucide-react`.
  - Fixed `ReferenceError: joiningGroupId is not defined` in `Community.jsx` by declaring state and binding `handleJoinViaInvite`.
- **Localization (i18n)**:
  - Standardized official schedule badge key `countdown_official_badge` to `"Lịch chính thức"` (VI), `"Official Schedule"` (EN), and `"官方正式日程"` (ZH).

