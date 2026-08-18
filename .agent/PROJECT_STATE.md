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

## 2. Database State & Flyway Migrations (Current: `V20`)

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
| **V20** | `V20__remove_non_thpt_presets.sql` | Purged default non-THPT preset exams and decoupled existing foreign keys to NULL |
| **V21** | `V21__assign_thpt_to_admin.sql` | Assigned national THPT QG exam preset creator to Admin user |
| **V22** | `V22__create_group_countdown_links_table.sql` | Created `group_countdown_links` table for group exam milestone tracking and daily automated briefings |

> **Next Flyway Migration to use**: `V23__<description>.sql`. **Never alter `V1` - `V22`**.

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
- `ToastContext.jsx`: Centralized Toast notifications (`success`, `error`, `warning`, `info`) and Promise-based Confirm/Alert popup dialogs.
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

### 6.1. Community Group Chat & Realtime Communication
- **Group Settings & Info Modification (`EditGroupModal.jsx`)**:
  - Implemented group metadata editing modal (Group Name, Description, Avatar upload via storage API, Privacy `PUBLIC`/`PRIVATE`, Join Policy `OPEN`/`APPROVAL_REQUIRED`, Max Members count with validation).
  - Added Owner Danger Zone: Permanent group deletion with double-confirmation dialog and cascade cleanup.
  - Fully synchronized all labels, placeholders, and error toasts with `LanguageContext.jsx` in 3 languages (`vi`, `en`, `zh`).
- **Comprehensive Light & Dark Theme Overhaul**:
  - Solved root-cause color token inversion in `index.css` for `.light` mode (`--slate-950: #f8fafc`, `--slate-900: #ffffff`, `--slate-800: #e2e8f0`, `--slate-700: #cbd5e1`, `--slate-100: #0f172a`, `--slate-50: #f1f5f9`).
  - Completely overhauled all chat components (`GroupChatRoom.jsx`, `GroupMembersModal.jsx`, `GroupMediaModal.jsx`, `GroupInviteModal.jsx`, `ShareDocumentModal.jsx`, `EditGroupModal.jsx`, `ConfirmModal.jsx`, `Community.jsx`, `TrendingGroupsWidget.jsx`) to eliminate hardcoded dark containers and ensure 100% WCAG AA contrast on light mode.
  - Aligned Trending Groups widget color palette to Indigo/Violet brand theme.
- **Bug Fixes & Hardening**:
  - Fixed `ReferenceError: formatBytes is not defined` and missing `formatDate` in `GroupMediaModal.jsx`.
  - Fixed JSX root container duplication and duplicate closing tags in `GroupMediaModal.jsx` and `EditGroupModal.jsx`.
  - Fixed backend REST routing `api/v1/chat/groups` vs `/api/groups` and verified production Flyway migration `V18`/`V19`.

### 6.2. Donation & Footer Section
- **MB Bank Donation Block (`Footer.jsx` & `LanguageContext.jsx`)**:
  - Added MB Bank donation column (STK: `0946931005`, Chủ TK: `TRAN QUOC KHANH`), 1-click clipboard copy with visual feedback, and VietQR scan preview.
  - Added i18n translation keys (`donation_title`, `donation_bank`, `donation_account_num`, `donation_account_holder`, `donation_copy_btn`, `donation_copied`, `donation_qr_tooltip`) across `vi`, `en`, and `zh`.

### 6.3. Theme Contrast & Light Mode Standards
- Replaced washed-out text in `TrendingGroupsWidget`, `SessionHistoryList`, `OnlineUsersList`, `XpBar`, `CountdownWidget`, and `ManualSessionForm` with high-contrast `text-slate-100` / `text-slate-200`.
- Enhanced green heatmap tiers in `StudyCalendar` for WCAG AA compliance.
- Removed light mode text gradients to ensure solid, crisp typography.
- Standardized official schedule badge key `countdown_official_badge` to `"Lịch chính thức"` (VI), `"Official Schedule"` (EN), and `"官方正式日程"` (ZH).

### 6.4. Countdown Multi-Event Tracking, Widget Pinning & Lifecycle Management (`feature/countdown-multi-events-lifecycle`)
- **Multi-Event Tracking & Dashboard Widget Pinning**:
  - Refactored `Dashboard.jsx`, `CountdownModal.jsx`, and `CountdownWidget.jsx` to allow users to track multiple exam presets and custom events simultaneously without overwriting previous events.
  - Implemented dynamic widget pinning: Users can pin/unpin any tracked countdown to be prominently displayed on the Dashboard widget, with carousel `<` `>` navigation and quick switch dropdown.
- **Event Lifecycle & Auto-Expiry**:
  - **Backend Filtering**: `getAllPresets` and `getUserCountdowns` automatically filter out expired countdowns (`targetDate > Instant.now()`).
  - **Daily Cleanup Job**: Scheduled task running daily at 2:00 AM (`cleanupExpiredCountdowns`) to purge expired countdown events and community presets.
  - **Frontend Auto-Transition**: If an active pinned event expires, the UI automatically transitions to the next available future event.
- **Creator Deletion Constraints & Cascading Cleanup**:
  - **Active Tracking Deletion Guard**: If a creator attempts to delete a community event that is still active (`targetDate > now`) and has other active trackers (`totalTrackers > 1`), the deletion is blocked with a descriptive error message (`IllegalStateException`).
  - **Cascading Deletion**: When an owner legitimately deletes their event (expired or no other trackers), all associated tracking records across all users are automatically cleaned up (`deleteByPresetExamCode`).
  - **Regular Tracker Untracking**: Non-creators can untrack events anytime from their personal list without deleting the community preset.
- **Database Schema Fixes & Flyway Auto-Patching**:
  - Added migration `V16__add_community_events_and_tracker_counts.sql` and enabled `spring.flyway.out-of-order: true`.
  - Added startup auto-patching via `JdbcTemplate` in `DataInitializer.java` to ensure `created_by_user_id`, `is_community_event`, and `tracker_count` columns always exist in PostgreSQL.
- **Automated Verification**:
  - Added comprehensive test suites: `CountdownControllerTest.java` (5 tests) and `CountdownServiceTest.java` (8 tests) - 13/13 tests passing (100% PASS).

### 6.5. Official THPT QG Preset Exclusivity & User-Created Countdown Editing (`feature/countdown-edit-and-thpt-filter`)
- **Default Preset Clean-up**:
  - Exclusively retained `THPT_QG_2027` (Kỳ thi Tốt nghiệp THPT Quốc Gia 2027) as the sole default official preset exam across the backend database and frontend guest presets fallback.
  - Added Flyway migration `V20__remove_non_thpt_presets.sql` and startup auto-patching in `DataInitializer.java` to purge non-THPT preset exams (`DGNL_...`, `TET_AM_...`).
- **Owner-Only Countdown Event Editing & Safe Deletion**:
  - **Strict Ownership Guard**: Users can ONLY edit countdown events they created themselves (custom private events or community events where `created_by_user_id == user.id`). If a user attempts to edit a preset or another user's community event that they are merely tracking, the backend rejects it with an `IllegalStateException`.
  - **Unfollow Icon in List (`EyeOff`)**: In `CountdownModal.jsx` under "Sự kiện của tôi" (My Countdowns), the button next to Edit/Pin is converted into an `EyeOff` icon (con mắt gạch chéo) representing unfollowing / untracking an event.
  - **Permanent Event Deletion in Edit Form**: In the Edit form, creators can delete their event. However, if the community event still has active followers (`otherTrackers > 0` and `targetDate > now`), deletion is blocked and a warning is displayed. An event can only be deleted if created by the user and has 0 other followers.
  - **Backend Support**: Extended `CountdownService.updateCountdown` and `CountdownService.deleteCountdown` to update `SystemPresetExam` and propagate changes to subscribers or guard deletion when followers exist. `CountdownDto` includes `isOwner`, `canEdit`, `createdByUserId`, and `isCommunityEvent`.
  - **Multi-language Support**: Added i18n keys for editing countdowns, deleting events, and unfollowing in Vietnamese, English, and Chinese.
- **Verification & Environment Startup**:
  - Successfully verified live startup with `./scripts/environment/set-env.ps1` connecting to Azure PostgreSQL & Upstash Redis with Flyway v20.
  - 54/54 backend unit tests passing (100% PASS).
  - Frontend production build completed cleanly with Vite (100% PASS).

### 6.6. Modern Global Toast & Confirm/Alert Dialog System (`feature/modern-toast-and-dialogs`)
- **Global Toast & Dialog Context (`ToastContext.jsx`)**:
  - Built a centralized, highly aesthetic Toast notification and Promise-based Confirm/Alert dialog system.
  - **Toasts**: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()` with animated stacked list, auto-dismiss, smooth exit animations via Framer Motion, and high contrast styling in dark/light mode.
  - **Confirm Modal**: Promise-based `confirm({ title, message, confirmText, cancelText, type: 'danger'|'warning'|'info' })` replacing all native `window.confirm()` with custom glassmorphism modal, backdrop blur, and custom action buttons.
- **Codebase Migration**:
  - Removed all raw `alert()` and `window.confirm()` calls across all components (`CountdownModal.jsx`, `Dashboard.jsx`, `FriendsModal.jsx`, `PublicProfileModal.jsx`, `ChatModal.jsx`, `StudyTimer.jsx`, `ManualSessionForm.jsx`, `PremiumUpgradeModal.jsx`, `AdminPaymentPackages.jsx`).

### 6.7. Admin Group & Event/Countdown Management with Full Override Privileges (`feature/admin-group-and-event-management`)
- **THPT QG Exam Assigned to Admin**:
  - Automatically assigned `THPT_QG_2027` creator to the system admin user via Flyway migration `V21__assign_thpt_to_admin.sql` and startup auto-patching in `DataInitializer.java`.
- **Admin Full Override Authority**:
  - **Group Management (`AdminGroupsManager.jsx`)**: Admin can view all public, private, and archived groups; edit group metadata (name, description, privacy, join policy, max members, avatars); toggle soft-delete/archive state; or permanently delete groups.
  - **Event & Countdown Management (`AdminCountdownsManager.jsx`)**: Admin can create official or community preset exams; edit any preset and auto-sync changes to all subscribers; and **force-delete** any event or preset unconditionally without tracker count restrictions.
- **Admin UI & API Integration**:
  - Added dedicated tabs in `AdminDashboard.jsx`: **Quản Lý Nhóm Học** and **Quản Lý Sự Kiện & Lịch Thi**.
  - Extended `AdminController.java`, `GroupService.java`, `CountdownService.java`, and `frontend/src/api.js`.
  - Added full multi-language translations (VI, EN, ZH) in `LanguageContext.jsx`.
- **Verification**:
  - 55/55 backend unit tests passing (100% PASS).
  - Frontend production build completed with 0 errors (100% PASS).

### 6.8. Dashboard Layout Settings Popup Smoothness & Animation Optimization
- **Exit Animation & Flickering Fix (`DashboardCustomizerModal.jsx`)**:
  - Encapsulated `{isOpen && ...}` inside `<AnimatePresence>` instead of returning `null` before `AnimatePresence`. Resolved the abrupt disappearance bug, ensuring the fade-out and scale-down exit animations play smoothly upon dismissal.
- **Tuned Spring Dynamics & GPU Acceleration**:
  - Configured optimized Spring Physics (`mass: 0.7, stiffness: 380, damping: 28`) for the modal window and smooth backdrop fade (`0.22s easeOut`).
  - Added `transform-gpu` and refined backdrop blur (`backdrop-blur-xl`) to eliminate frame stuttering on high-refresh rate displays (120Hz/144Hz).
- **Fluid Toggle Switch Motion**:
  - Replaced abrupt CSS step transitions with Framer Motion `motion.span` (`spring` physics: `stiffness: 500, damping: 30`), achieving iOS/macOS-style gliding transitions when toggling widget visibility.
- **Micro-Interactions & UX Polish**:
  - Added smooth `whileHover` and `whileTap` scale feedback on widget toggle items, reset button, close button, and save button.
  - Implemented `Escape` key shortcut listener for swift dismissal.
  - Added automatic background body scroll locking (`overflow: hidden`) during modal display to prevent jitter and accidental background scrolling.

### 6.9. Message Editor UI & UX Enhancement (`GroupChatRoom.jsx`)
- **Spacious Message Editing Experience**:
  - Replaced the narrow inline bubble with an expanded, dedicated editor card (`max-w-full sm:max-w-xl md:max-w-2xl`).
  - Textarea increased to comfortable multiline height (`min-h-[100px] sm:min-h-[120px] max-h-[320px] resize-y`) with smooth focus ring and clean border.
  - Added keyboard shortcut support: `Enter` to save, `Shift + Enter` for new line, `Esc` to cancel editing.
  - Added i18n keys for editor title and keyboard shortcuts (`edit_message_title`, `edit_message_hint`) across `vi`, `en`, `zh`.
  - Added `savingEdit` state with spinner and disabled states during asynchronous update requests.

### 6.10. Agent Rules Discovery Standardization & Strict UI Icon Policy
- **System Rules Initialization (`GEMINI.md` & `AGENTS.md`)**:
  - Established root-level `GEMINI.md` and `AGENTS.md` and synchronized with `.agents/rules/development_guidelines.md` and `.agent/rules/development_guidelines.md`.
  - Configured mandatory pre-task context checking of `PROJECT_STATE.md` and post-task synchronization on every turn.
- **Strict UI Icon Policy (`NO REDUNDANT / EXCESSIVE ICONS`)**:
  - Prohibited adding unnecessary, repetitive, or decorative clutter icons across all UI components, buttons, badges, tables, and headers.
  - Required icons to be used strictly when they provide clear visual utility or improve UX affordance (action triggers, status badges), avoiding icon-stuffing across plain text labels.

### 6.11. Group Countdown Milestones & Daily Automated Broadcast (`feature/community-realtime-chat`)
- **Group Exam Milestone Linking (`group_countdown_links`)**:
  - Added Flyway migration `V22__create_group_countdown_links_table.sql` supporting foreign keys to `system_preset_exams` and `countdown_events` with cascading deletion.
  - **Group Owner/Admin Privileges**: Allowed group creators and moderators to link official preset exams or custom countdowns to the group, and unlink anytime with confirmation modals.
  - **Real-time Announcement**: Emitted real-time system message into the chat room immediately upon linking/unlinking events.
- **Daily Automated Countdown Briefing (`GroupCountdownDailyScheduler.java`)**:
  - Scheduled daily cron job running at 7:00 AM VN time (`@Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")`).
  - Aggregates active milestones, calculates accurate remaining days, formats a styled daily briefing card, and broadcasts to `/topic/group.{groupId}.messages` via WebSocket STOMP.
  - Recorded `last_daily_notified_at` to prevent duplicate daily notifications on server restart.
- **UI & UX Integration (`GroupChatRoom.jsx` & `GroupCountdownsModal.jsx`)**:
  - **Header Milestone Pill**: Displays active countdown milestone badge in the group chat header with remaining days.
  - **Group Countdowns Modal**: Complete management modal to view milestones, browse available exams, and link/unlink events.
  - **Card-Style System Messages**: Upgraded multi-line countdown reminders into glassmorphism alert cards with gradient badges and clean typography.
  - **Full i18n**: Added translation keys across Vietnamese, English, and Chinese.
- **Automated Verification**:
  - Added unit test suite `GroupCountdownServiceTest.java` (7/7 tests passing - 100% PASS).
  - 62/62 full Maven backend unit tests passing (100% PASS).
  - Vite production build completed with 0 errors (100% PASS).

### 6.12. Unjoined Group Toast Protection & Clean System Messages Refinement
- **Unjoined Group Toast Guard (`Community.jsx` & `TrendingGroupsWidget.jsx`)**:
  - When clicking on any group card that the current user has not joined, the UI immediately notifies the user via Toast notification (`must_join_group_first`) instead of navigating into the room and failing with a 403 error.
  - Added fallback auto-exit in `GroupChatRoom.jsx` if a non-member direct URL access occurs.
- **Clean System Messages Formatting**:
  - Stripped all raw `**` markdown bold symbols and decorative emojis from system announcements across `GroupCountdownService.java` and `GroupChatRoom.jsx`.
  - Polished dropdown selector text in `GroupCountdownsModal.jsx` and added 100% i18n key coverage.

### 6.13. Linking Countdown Milestones during Group Creation (`feature/community-realtime-chat`)
- **Direct Event Linking on Group Creation**:
  - Updated `CreateGroupRequest.java` and `GroupService.java` to support `linkedPresetExamId` and `linkedCustomCountdownId`.
  - Added endpoint `GET /api/v1/chat/groups/countdowns/available` allowing the group creator to fetch active system preset exams and their own countdown events before the group is instantiated.
  - Automatically establishes the milestone link and creates the initial system announcement upon group creation.
- **Frontend Integration (`Community.jsx`)**:
  - Added an intuitive milestone selector dropdown in the Create Group Modal with remaining day counters and official badges.
  - Fully translated across Vietnamese, English, and Chinese in `LanguageContext.jsx`.
- **Verification**:
  - Maven tests `GroupCountdownServiceTest` and `GroupServiceTest` passing (10/10 PASS).
  - Vite production build completed with 0 errors.

