# Study XP Tracker - System Agent Instructions & Rules

> **CRITICAL META-INSTRUCTION (ALWAYS ENFORCED)**:
> In **EVERY single task, turn, or user request**, the Agent **MUST** first review and internalize the project state and guidelines before taking action, and **MUST** synchronize state after finishing.

---

## 1. Mandatory Pre-Task & Post-Task Checklist

### 🔍 Step 1: Pre-Task Context Check (MANDATORY)
Before proposing or executing ANY task, code change, or plan:
1. **Read [.agent/PROJECT_STATE.md](file:///e:/Project/study-tracking/.agent/PROJECT_STATE.md)** to check:
   - Current database migration state (e.g. `V21__assign_thpt_to_admin.sql` - Next migration MUST be `V22`).
   - Active backend endpoints, DTOs, services, schedulers, and entity models.
   - Active frontend pages, modals, widgets, contexts, and design system tokens.
   - Core business rules (XP calculation, 5-min presence auto-pause, 12h anti-cheat cap, etc.).
2. **Read [.agent/rules/development_guidelines.md](file:///e:/Project/study-tracking/.agent/rules/development_guidelines.md)** to strictly adhere to:
   - **i18n (3 languages)**: Every UI string must be translated into `en`, `vi`, `zh` in `frontend/src/context/LanguageContext.jsx`. Hardcoded JSX text is strictly prohibited.
   - **Git Push Rules**: NEVER run `git push` unless explicitly requested in the CURRENT turn.
   - **Branching**: Always develop features on dedicated branches (`feature/...` or `feat/...`), never directly push to `main`.
   - **Flyway Migrations**: Never modify existing `V1`-`V21` scripts; always create `V<Next>__<name>.sql`.
   - **Backend**: Spring Boot 3.3.1, Java 21, Spring Security 6 (JWT + OAuth2), layered architecture. Server-side validation for all XP / anti-cheat.
   - **Frontend**: React 19, Tailwind CSS v4 (Glassmorphism, Light/Dark theme compatibility), centralized API in `api.js`, clean STOMP cleanup.
   - **UI & Icons**: Exclusively use `lucide-react`. **NO REDUNDANT / EXCESSIVE ICONS**: Strictly DO NOT add unnecessary, repetitive, or cluttered icons across UI components, labels, buttons, or modals. Only place icons where they provide clear functional UX value.

### 📝 Step 2: Post-Task Synchronization (MANDATORY)
After EVERY task, bug fix, refactor, or feature implementation (big or small):
- **Immediately update [.agent/PROJECT_STATE.md](file:///e:/Project/study-tracking/.agent/PROJECT_STATE.md)** with the latest changelog, new Flyway scripts, new endpoints, new components, or modified behaviors.

---

## 2. Quick Architecture Summary
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + Framer Motion + Lucide React + Recharts + STOMP / SockJS.
- **Backend**: Java 21 + Spring Boot 3.3.1 + Spring Data JPA + PostgreSQL 15 + Redis 7 + Flyway + WebSocket STOMP.
- **Current Flyway Migration Version**: `V21` (Next: `V22`).
