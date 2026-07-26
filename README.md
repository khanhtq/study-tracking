# 🎨 Study XP Tracker — Frontend Web Application

Giao diện ứng dụng web Single Page Application (SPA) hiện đại dành cho hệ thống **Study XP Tracker**, được xây dựng trên nền tảng **React 19**, **Vite 8**, **Tailwind CSS v4**, **Framer Motion** và **Recharts**.

Giao diện được thiết kế theo phong cách **Glassmorphism**, hiệu ứng chuyển động mượt mà, tối ưu trải nghiệm người dùng (UX) và hỗ trợ đa ngôn ngữ.

---

## 🌟 1. Tính năng nổi bật & Trải nghiệm Người dùng (UX Features)

### 1.1. Bộ đếm thời gian học tập & Tính điểm XP (Focus Timer Engine)
* **Chế độ đa dạng:** Hỗ trợ Đồng hồ bấm giờ (Stopwatch) và Bộ đếm ngược (Pomodoro Timer).
* **Hiển thị XP thời gian thực:** Dự đoán lượng XP người dùng sẽ đạt được dựa trên số phút học tập.
* **Cơ chế Thưởng Pomodoro:** Tự động tính thêm **+10% XP** khi hoàn thành phiên học từ 25 phút trở lên.
* **Đồng bộ Anti-cheat:** Kết nối trực tiếp với Server để đảm bảo điểm XP được kiểm tra tính hợp lệ trên Backend.

### 1.2. Trải nghiệm Gamification & Thăng cấp hoành tráng (Level Up & Achievements)
* **Cơ chế thăng cấp:** Tự động tính toán lượng XP cần thiết cho cấp tiếp theo theo công thức $XP = 100 \times Level^{1.5}$.
* **Hiệu ứng ăn mừng:** Màn hình tự động bắn pháo hoa **Canvas Confetti 🎉** kết hợp Modal chúc mừng thăng cấp hoành tráng.
* **Danh hiệu & Huy hiệu (Titles & Badges):** Mở khóa danh hiệu độc quyền khi đạt các mốc level nhất định.

### 1.3. Thống kê & Biểu đồ trực quan (Analytics & Heatmap)
* **Bảng nhiệt đóng góp (Contribution Heatmap):** Phong cách GitHub ghi nhận tất cả các ngày bạn học tập và theo dõi chuỗi ngày liên tục (**Streaks**).
* **Biểu đồ thống kê 7 ngày:** Sử dụng thư viện **Recharts** vẽ biểu đồ cột thể hiện chính xác thời lượng học tập theo từng ngày trong tuần.

### 1.4. Đa ngôn ngữ (Internationalization - i18n)
* Hỗ trợ chuyển đổi tức thì giữa 3 ngôn ngữ mà không cần tải lại trang:
  * 🇻🇳 **Tiếng Việt** (Mặc định)
  * 🇬🇧 **English**
  * 🇨🇳 **中文 (Chinese)**

### 1.5. Trình phát nhạc Lofi/Study (YouTube Music Player)
* Widget phát nhạc học tập nhỏ gọn, hỗ trợ nghe các bản nhạc Lofi, Piano, Ambient được lọc từ YouTube.
* Tự động stream qua đường dẫn Proxy Backend hạn chế lỗi bản quyền và CORS.

### 1.6. Mạng xã hội & Khung chat Real-time (Social & Chat Hub)
* Danh sách bạn bè hiển thị trạng thái **Online / Offline** và cấp độ hiện tại.
* Khung chat trực tiếp (**Direct Messaging**) sử dụng WebSocket kết nối ngay tức thì.

### 1.7. PWA (Progressive Web App) & Offline Shell
* Cho phép cài đặt ứng dụng trực tiếp lên màn hình chính (Desktop / Android / iOS) như ứng dụng Native.
* Tích hợp thanh thông báo trạng thái kết nối mạng (**Offline Banner**).

### 1.8. Chế độ Khách (Guest Mode) & Quản trị (Admin Dashboard)
* **Guest Mode:** Cho phép trải nghiệm nhanh các tính năng bấm giờ mà chưa cần đăng ký tài khoản.
* **Admin Dashboard:** Bảng điều khiển riêng cho quản trị viên xem tổng quan hệ thống, danh sách người dùng online và chi tiết phiên học.

---

## 🛠️ 2. Công nghệ & Thư viện (Frontend Tech Stack)

| Thư viện / Công nghệ | Phiên bản | Vai trò & Mục đích |
| :--- | :--- | :--- |
| **React** | `19.2.7` | Thư viện UI cốt lõi |
| **Vite** | `8.1.1` | Build tool & Dev server siêu tốc |
| **Tailwind CSS** | `4.3.3` | Framework Styling theo Utility-first |
| **Framer Motion** | `12.42.2` | Thư viện tạo hiệu ứng chuyển động & animation |
| **Recharts** | `3.9.2` | Vẽ biểu đồ thống kê thời lượng học |
| **Canvas Confetti** | `1.9.4` | Hiệu ứng pháo hoa chúc mừng thăng cấp |
| **StompJS & SockJS** | `7.3.0` | Client kết nối WebSocket real-time |
| **Lucide React** | `1.25.0` | Bộ biểu tượng (Icon set) hiện đại |
| **Google OAuth** | `0.13.5` | Đăng nhập nhanh bằng tài khoản Google |
| **Oxlint** | `1.71.0` | Linter mã nguồn siêu nhanh |

---

## 📁 3. Cấu trúc Thư mục Frontend

```
frontend/
├── src/
│   ├── assets/              # Hình ảnh, biểu trưng
│   ├── components/          # Các Component giao diện tái sử dụng
│   │   ├── AdminOnlineTable.jsx       # Bảng người dùng Online (Admin)
│   │   ├── AdminOverviewCards.jsx     # Thẻ thống kê tổng quan (Admin)
│   │   ├── AdminUserStatsTable.jsx    # Bảng thống kê chi tiết User (Admin)
│   │   ├── ChatBox.jsx                # Khung chat thời gian thực
│   │   ├── FriendList.jsx             # Danh sách bạn bè & trạng thái
│   │   ├── HeatmapCalendar.jsx        # GitHub-style Contribution Heatmap
│   │   ├── Leaderboard.jsx            # Bảng xếp hạng XP & Level
│   │   ├── LevelProgress.jsx          # Thanh tiến trình XP & Cấp độ
│   │   ├── ManualSessionModal.jsx     # Modal nhập thủ công phiên học
│   │   ├── MusicModal.jsx             # Trình tìm kiếm & danh sách nhạc
│   │   ├── MusicWidget.jsx            # Trình phát nhạc thu nhỏ
│   │   ├── Navbar.jsx                 # Thanh điều hướng chính
│   │   ├── OfflineBanner.jsx          # Cảnh báo khi mất kết nối mạng
│   │   ├── PwaInstallPrompt.jsx       # Banner gợi ý cài đặt PWA
│   │   ├── UserSessionDetailModal.jsx # Modal xem chi tiết phiên học
│   │   └── WeeklyChart.jsx            # Biểu đồ 7 ngày Recharts
│   ├── context/             # React Context State Management
│   │   ├── AuthContext.jsx            # Quản lý Đăng nhập, User, JWT Token
│   │   ├── LanguageContext.jsx        # Quản lý ngôn ngữ & bản dịch i18n
│   │   ├── MusicContext.jsx           # Quản lý trình phát nhạc Lofi
│   │   └── ThemeContext.jsx           # Quản lý Dark/Light Theme
│   ├── pages/               # Các trang giao diện chính
│   │   ├── AdminDashboard.jsx         # Trang quản trị Admin
│   │   ├── Dashboard.jsx              # Trang làm việc / học tập chính
│   │   ├── ForgotPassword.jsx         # Trang quên mật khẩu
│   │   ├── Landing.jsx                # Trang giới thiệu ứng dụng
│   │   ├── Login.jsx                  # Trang đăng nhập
│   │   ├── Profile.jsx                # Trang hồ sơ cá nhân
│   │   ├── Register.jsx               # Trang đăng ký
│   │   └── VerifyOtp.jsx              # Trang xác nhận mã OTP
│   ├── App.jsx              # App Root Component & Routing
│   ├── main.jsx             # Entry Point
│   └── index.css            # Stylesheet chính & Cấu hình Tailwind v4
├── public/                  # Static assets & Manifest file PWA
├── package.json             # Danh sách thư viện & Scripts
└── vite.config.js           # Cấu hình Vite Build Tool
```

---

## 🚀 4. Hướng dẫn Cài đặt & Khởi chạy Frontend

### Yêu cầu hệ thống:
* **Node.js** 18.x trở lên.
* **npm** 9.x trở lên (hoặc yarn / pnpm).

### Bước 1: Cài đặt Dependencies
Tại thư mục `frontend`:
```bash
npm install
```

### Bước 2: Cấu hình Biến môi trường (Tùy chọn)
Tạo file `.env` tại thư mục `frontend` nếu cần thay đổi URL Backend hoặc Google Client ID:
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Bước 3: Khởi chạy Server Phát triển (Development Server)
```bash
npm run dev
```
Trình duyệt sẽ mở tại địa chỉ mặc định: `http://localhost:5173`

### Bước 4: Khởi tạo Bản build Sản xuất (Production Build)
```bash
# Kiểm tra linter
npm run lint

# Tạo bản build tối ưu
npm run build

# Chạy thử bản build sản xuất
npm run preview
```

---

## 📝 Author & Licence
Phát triển bởi đội ngũ **Study XP Tracker Team**.
