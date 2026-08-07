# Study XP Tracker 

[![Java](https://img.shields.io/badge/Java-21-orange.svg?style=flat-square&logo=openjdk)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

## Overview

**Study XP Tracker** is a gamified study platform that helps learners maintain focus and stay productive. The platform combines a modern, elegant interface with advanced backend systems to deliver real-time features, anti-cheat mechanisms, and social collaboration tools. Users earn Experience Points (XP) while studying, compete on leaderboards, track progress through heatmaps, and enjoy a fully responsive, installable experience across all devices.

---

### 1. Smart Focus Timer with Anti-Cheat Engine
Track study sessions with multiple timer modes (Pomodoro and Stopwatch) while the backend validates all session data server-side to prevent cheating. Sessions are monitored continuously, with a 12-hour limit enforced and a +10% XP bonus awarded for completed Pomodoro sessions.

### 2. Study Document Management
Upload, organize, and access study materials seamlessly. The platform integrates with cloud storage providers (Azure Blob Storage, Cloudinary) with secure fallback streaming for maximum reliability.

### 3. Real-Time Leaderboards
Powered by Redis sorted sets for high-performance querying, leaderboards update asynchronously as users earn XP. The system gracefully falls back to PostgreSQL if Redis becomes unavailable.

### 4. Social Features & Real-Time Messaging
Connect with friends through instant messaging and real-time presence updates. Privacy controls let users manage who can see their activity status and send them messages.

### 5. Analytics & Activity Heatmap
Visualize study progress with GitHub-style contribution heatmaps showing daily study volume and active streaks. Weekly focus charts display productivity trends over time.

### 6. Multi-Language & Progressive Web App
Switch instantly between English, Vietnamese, and Chinese. Install the app directly on desktop, Android, or iOS devices with full offline shell support.

### 7. Admin Dashboard
Monitor active users in real-time, manage account statuses, track suspicious activity, and view system-wide metrics.

---

## Technology Stack

### Frontend
- **Framework:** React 19 with Vite 8
- **Styling:** Tailwind CSS v4 with Glassmorphism design system
- **Animations:** Framer Motion and Canvas Confetti
- **Charts & Visualization:** Recharts
- **Real-time Communication:** SockJS-client and StompJS

### Backend
- **Runtime:** Java 21 with Spring Boot 3.3.1
- **Authentication:** Spring Security 6 with JWT and Google OAuth2
- **Database:** PostgreSQL 15 with Spring Data JPA and Flyway migrations
- **Caching & Real-time:** Redis for leaderboards and WebSocket STOMP for messaging
- **Storage:** Pluggable cloud storage architecture

### Infrastructure
- **Containerization:** Docker and Docker Compose
- **Deployment:** Terraform infrastructure as code
- **CI/CD:** GitHub Actions automated workflows

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Author & Repository

* **Author:** Tran Quoc Khanh ([@khanhtq](https://github.com/khanhtq))
* **Repository:** [https://github.com/khanhtq/study-tracking](https://github.com/khanhtq/study-tracking)
