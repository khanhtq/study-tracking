# Study XP Tracker — Frontend Web Application

Modern Single Page Application (SPA) built with **React 19**, **Vite 8**, **Tailwind CSS v4**, **Framer Motion**, and **Recharts**. Designed with a sleek Glassmorphism aesthetic, fluid micro-animations, and internationalization support across English, Vietnamese, and Chinese.

---

## Key Features & User Experience

### Focus Timer Engine with XP Preview
The platform supports both Stopwatch and Pomodoro Countdown timers with real-time XP predictions. It automatically rewards a +10% XP bonus for completed Pomodoro sessions (≥25 minutes) and syncs directly with the backend to validate session integrity and prevent cheating.

### Gamification & Level System
Users earn XP based on study duration and level up following a formula where XP required = 100 × Level^1.5. Level-up celebrations trigger Canvas Confetti animations and achievement modals. Exclusive badges and user titles unlock as milestones are reached.

### Interactive Analytics & Heatmap
A GitHub-style contribution heatmap logs daily study activity and tracks continuous streaks. Weekly statistics charts powered by Recharts visualize study volume and focus trends over a 7-day period.

### Multi-Language Support
Instant language switching without page reloads supports:
- Vietnamese (Default)
- English
- Chinese (中文)

### Social Features & Real-Time Messaging
The platform displays live online/offline presence and user levels in the friend list. Direct messaging powered by WebSocket STOMP enables instant communication with friends.

### Progressive Web App (PWA)
Install the application directly onto desktop, Android, or iOS home screens as a native-feeling app. Network connectivity detection banners notify users when offline.

### Guest Mode & Admin Dashboard
Study timers are accessible immediately without registration through Guest Mode. A dedicated Admin Dashboard monitors system metrics, online users, and session activity.

---

## Technology Stack

- **UI Framework:** React 19.2.7
- **Build Tool:** Vite 8.1.1
- **Styling:** Tailwind CSS 4.3.3 with Glassmorphism design system
- **Animation:** Framer Motion 12.42.2 with Canvas Confetti 1.9.4 for celebrations
- **Charts:** Recharts 3.9.2 for analytics visualization
- **Real-Time Communication:** StompJS 7.3.0 and SockJS for WebSocket
- **Icons:** Lucide React 1.25.0
- **Authentication:** Google OAuth 0.13.5
- **Code Quality:** Oxlint 1.71.0

---

## Project Structure

```
frontend/
├── src/
│   ├── assets/              # Static media assets
│   ├── components/          # Reusable UI Components
│   │   ├── AdminOnlineTable.jsx
│   │   ├── AdminOverviewCards.jsx
│   │   ├── AdminUserStatsTable.jsx
│   │   ├── ChatBox.jsx
│   │   ├── FriendList.jsx
│   │   ├── HeatmapCalendar.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── LevelProgress.jsx
│   │   ├── ManualSessionModal.jsx
│   │   ├── Navbar.jsx
│   │   ├── OfflineBanner.jsx
│   │   ├── PwaInstallPrompt.jsx
│   │   ├── UserSessionDetailModal.jsx
│   │   └── WeeklyChart.jsx
│   ├── context/             # React Context State
│   │   ├── AuthContext.jsx            # Auth & JWT handling
│   │   ├── LanguageContext.jsx        # i18n translations
│   │   └── ThemeContext.jsx           # Dark/Light theme
│   ├── pages/               # Top-level Page Views
│   │   ├── AdminDashboard.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Profile.jsx
│   │   ├── Register.jsx
│   │   └── VerifyOtp.jsx
│   ├── App.jsx              # Root Component & Router
│   ├── main.jsx             # Entry Point
│   └── index.css            # Tailwind v4 Stylesheet
├── public/                  # Static assets & PWA manifest
├── package.json             # NPM dependencies & scripts
└── vite.config.js           # Vite Configuration
```

---

## Author & License
* **Author:** Tran Quoc Khanh
