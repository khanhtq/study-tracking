# Study XP Tracker — Frontend Web Application

Modern Single Page Application (SPA) frontend for the **Study XP Tracker** platform, built with **React 19**, **Vite 8**, **Tailwind CSS v4**, **Framer Motion**, and **Recharts**.

Designed with a sleek **Glassmorphism** aesthetic, fluid micro-animations, optimized User Experience (UX), and internationalization (i18n) support.

---

## 1. Key Features & User Experience (UX)

### 1.1. Focus Timer Engine & Real-time XP Calculation
* **Multiple Modes:** Supports Stopwatch and Pomodoro Countdown timers.
* **Real-time XP Preview:** Predicts XP gains based on active study duration.
* **Pomodoro Bonus Mechanism:** Automatically awards a **+10% XP** bonus for completed sessions $\ge 25$ minutes.
* **Anti-cheat Syncing:** Directly interfaces with server endpoints to validate session integrity.

### 1.2. Gamification & Level Up Celebrations
* **Leveling Formula:** Calculates XP required for upcoming levels based on $XP = 100 \times Level^{1.5}$.
* **Celebration Effects:** Triggers Canvas Confetti fireworks and celebration modals upon leveling up.
* **Titles & Badges:** Unlocks exclusive badges and user titles as milestones are reached.

### 1.3. Analytics & Interactive Heatmap
* **Contribution Heatmap:** GitHub-style calendar logging daily study activity and tracking continuous streaks.
* **7-Day Statistics Chart:** Uses **Recharts** bar charts to visualize weekly study volume and focus trends.

### 1.4. Internationalization (i18n)
* Supports instant language switching without page reloads:
  * **Vietnamese** (Default)
  * **English**
  * **Chinese (中文)**



### 1.6. Social Hub & Real-time Messaging
* Friend list displaying live **Online / Offline** presence and levels.
* Direct Messaging interface powered by WebSocket STOMP for instant communication.

### 1.7. PWA (Progressive Web App) & Offline Shell
* Installable directly onto Desktop / Android / iOS home screens as a native-feeling app.
* Includes network connectivity detection banners (Offline Banner).

### 1.8. Guest Mode & Admin Dashboard
* **Guest Mode:** Instant access to study timers without mandatory registration.
* **Admin Dashboard:** Dedicated administration portal monitoring system metrics, online users, and session logs.

---

## 2. Tech Stack & Libraries

| Library / Technology | Version | Role & Purpose |
| :--- | :--- | :--- |
| **React** | `19.2.7` | Core UI Library |
| **Vite** | `8.1.1` | Build Tool & Dev Server |
| **Tailwind CSS** | `4.3.3` | Utility-first Styling Framework |
| **Framer Motion** | `12.42.2` | Motion & Animation Library |
| **Recharts** | `3.9.2` | Interactive Analytics Charting |
| **Canvas Confetti** | `1.9.4` | Level Up Celebration Fireworks |
| **StompJS & SockJS** | `7.3.0` | Real-time WebSocket Client |
| **Lucide React** | `1.25.0` | Modern UI Icon Set |
| **Google OAuth** | `0.13.5` | Google Single Sign-On |
| **Oxlint** | `1.71.0` | Code Linter |

---

## 3. Frontend Directory Structure

```
frontend/
├── src/
│   ├── assets/              # Static media assets
│   ├── components/          # Reusable UI Components
│   │   ├── AdminOnlineTable.jsx       # Admin online users table
│   │   ├── AdminOverviewCards.jsx     # Admin metric summary cards
│   │   ├── AdminUserStatsTable.jsx    # Admin detailed user statistics table
│   │   ├── ChatBox.jsx                # Real-time direct chat modal
│   │   ├── FriendList.jsx             # Friend list & online presence
│   │   ├── HeatmapCalendar.jsx        # GitHub-style contribution heatmap
│   │   ├── Leaderboard.jsx            # Top XP & Level leaderboard
│   │   ├── LevelProgress.jsx          # XP progress bar & level badge
│   │   ├── ManualSessionModal.jsx     # Manual session entry modal
│   │   ├── Navbar.jsx                 # Main navigation header
│   │   ├── OfflineBanner.jsx          # Network disconnection banner
│   │   ├── PwaInstallPrompt.jsx       # PWA installation banner
│   │   ├── UserSessionDetailModal.jsx # User session history modal
│   │   └── WeeklyChart.jsx            # Recharts 7-day analytics chart
│   ├── context/             # React Context State Providers
│   │   ├── AuthContext.jsx            # Auth state, user profile, JWT handling
│   │   ├── LanguageContext.jsx        # i18n translation state
│   │   └── ThemeContext.jsx           # Dark/Light theme state
│   ├── pages/               # Top-level Page Views
│   │   ├── AdminDashboard.jsx         # Admin management portal
│   │   ├── Dashboard.jsx              # Main user study workplace
│   │   ├── ForgotPassword.jsx         # Password recovery page
│   │   ├── Landing.jsx                # Landing page
│   │   ├── Login.jsx                  # Login page
│   │   ├── Profile.jsx                # User profile settings
│   │   ├── Register.jsx               # Account registration page
│   │   └── VerifyOtp.jsx              # Email OTP verification page
│   ├── App.jsx              # App Root Component & Router
│   ├── main.jsx             # Entry Point
│   └── index.css            # Main Stylesheet & Tailwind v4 Config
├── public/                  # Static web assets & PWA manifest
├── package.json             # NPM dependencies & scripts
└── vite.config.js           # Vite Configuration
```

---

## 4. Setup & Running Frontend

### Prerequisites:
* **Node.js** 18.x or higher.
* **npm** 9.x or higher.

### Step 1: Install Dependencies
Navigate to the `frontend` directory:
```bash
npm install
```

### Step 2: Environment Configuration (Optional)
Create a `.env` file in the `frontend` directory if custom backend URLs or Google Client IDs are required:
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 3: Run Development Server
```bash
npm run dev
```
Access the application in your browser at: `http://localhost:5173`

### Step 4: Production Build
```bash
# Lint code
npm run lint

# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

---

## Author & License
* **Author:** Tran Quoc Khanh
