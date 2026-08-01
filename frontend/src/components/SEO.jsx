import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const DOMAIN = 'https://ax-study.vercel.app';

const metaContentByView = {
  landing: {
    vi: {
      title: 'Study Tracker - Web Theo Dõi Học Tập & Thăng Cấp XP Miễn Phí',
      description: 'Công cụ Study Tracker miễn phí hàng đầu. Bấm giờ Pomodoro, tích lũy điểm XP thăng cấp kiểu RPG, duy trì chuỗi ngày học tập liên tục (Streak) và thi đua cùng bạn bè.',
      keywords: 'study tracker, free study tracker, online study tracker, theo dõi học tập, ứng dụng theo dõi thời gian học, study tracker online, pomodoro study tracker, game hóa học tập, study xp tracker, ax study',
    },
    en: {
      title: 'Free Online Gamified Study Tracker - Study XP Tracker',
      description: 'Best free online study tracker with Pomodoro timer, RPG level up system, and real-time co-studying rooms. Track study hours, earn XP, and boost your focus.',
      keywords: 'study tracker, free study tracker, online study tracker, gamified study tracker, pomodoro study tracker, study time tracker, study tracker app, study xp tracker, ax study',
    },
    zh: {
      title: 'Free Online Study Tracker - 游戏化学习追踪与等级提升',
      description: '免费在线 Study Tracker！使用 Pomodoro 番茄钟记录学习时间，获取经验值 (XP)、像 RPG 游戏一样升级并保持每日学习打卡。',
      keywords: 'study tracker, 学习追踪, 免费学习打卡, 游戏化学习, 番茄钟, 学习 XP, ax study',
    },
  },
  login: {
    vi: {
      title: 'Đăng Nhập | Study Tracker - Study XP Tracker',
      description: 'Đăng nhập vào tài khoản Study Tracker để tiếp tục chuỗi học tập và tích lũy XP của bạn.',
      keywords: 'đăng nhập study tracker, login study xp tracker, study time tracker login',
    },
    en: {
      title: 'Log In | Free Online Study Tracker',
      description: 'Log in to your Study Tracker account to continue your study streak and earn XP.',
      keywords: 'login study tracker, sign in study tracker, online study tracker login',
    },
    zh: {
      title: '登录 | Study Tracker',
      description: '登录您的 Study Tracker 账户，继续保持学习连续记录并赚取经验值。',
      keywords: '登录 study tracker, study xp tracker 登录',
    },
  },
  register: {
    vi: {
      title: 'Đăng Ký Tài Khoản Miễn Phí | Study Tracker',
      description: 'Tạo tài khoản Study Tracker miễn phí để bắt đầu hành trình biến việc học thành trò chơi thăng cấp hấp dẫn.',
      keywords: 'đăng ký study tracker, tạo tài khoản study tracker, free study tracker signup',
    },
    en: {
      title: 'Sign Up Free | Gamified Study Tracker',
      description: 'Create a free Study Tracker account to turn your learning into an exciting RPG level-up journey.',
      keywords: 'register study tracker, free study tracker account, create study tracker account',
    },
    zh: {
      title: '免费注册 | Study Tracker',
      description: '免费创建 Study Tracker 账户，开启游戏化升级的学习之旅。',
      keywords: '注册 study tracker, 免费 study tracker',
    },
  },
  dashboard: {
    vi: {
      title: 'Bảng Điều Khiển | Study Tracker - Bấm Giờ & Thăng Cấp',
      description: 'Theo dõi thời gian học tập trực tiếp, bấm giờ Pomodoro, kiểm tra XP hiện tại và lịch sử học tập.',
      keywords: 'bảng điều khiển study tracker, study tracker dashboard, pomodoro study timer',
    },
    en: {
      title: 'Study Dashboard | Free Online Study Tracker',
      description: 'Track your live study sessions, manage Pomodoro timer, view your level progress and study statistics.',
      keywords: 'study tracker dashboard, study tracker live, online study timer',
    },
    zh: {
      title: '学习仪表板 | Study Tracker',
      description: '实时追踪学习时间，使用番茄钟，查看当前等级进度和学习统计。',
      keywords: 'study tracker 仪表板, 番茄钟, 学习统计',
    },
  },
  admin: {
    vi: {
      title: 'Admin Dashboard | Study Tracker',
      description: 'Trang quản trị hệ thống, theo dõi người dùng đang online realtime và thống kê lịch sử học tập.',
      keywords: 'admin study tracker, trang quan tri study xp, online user tracking',
    },
    en: {
      title: 'Admin Dashboard | Study Tracker',
      description: 'System administration dashboard for realtime online user tracking and detailed study session logs.',
      keywords: 'admin dashboard, study tracker admin, user study analytics',
    },
    zh: {
      title: '管理员仪表板 | Study Tracker',
      description: '系统管理仪表板，用于实时在线用户追踪和详细学习记录统计。',
      keywords: '管理员仪表板, 在线用户追踪',
    },
  },
};

export default function SEO({ view = 'landing' }) {
  const { language } = useLanguage();
  const currentLang = language || 'vi';

  useEffect(() => {
    const langData = metaContentByView[view]?.[currentLang] || metaContentByView.landing.vi;
    const pageUrl = view === 'landing' ? `${DOMAIN}/` : `${DOMAIN}/#${view}`;

    // Update document title
    document.title = langData.title;

    // Update HTML lang attribute
    document.documentElement.lang = currentLang;

    // Helper function to update or create meta tag
    const updateMetaTag = (selector, attributeName, attributeValue, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attributeName, attributeValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper function to update link tag
    const updateLinkTag = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // Primary meta tags
    updateMetaTag('meta[name="title"]', 'name', 'title', langData.title);
    updateMetaTag('meta[name="description"]', 'name', 'description', langData.description);
    updateMetaTag('meta[name="keywords"]', 'name', 'keywords', langData.keywords);

    // Open Graph
    updateMetaTag('meta[property="og:title"]', 'property', 'og:title', langData.title);
    updateMetaTag('meta[property="og:description"]', 'property', 'og:description', langData.description);
    updateMetaTag('meta[property="og:url"]', 'property', 'og:url', pageUrl);
    updateMetaTag('meta[property="og:locale"]', 'property', 'og:locale', currentLang === 'vi' ? 'vi_VN' : currentLang === 'zh' ? 'zh_CN' : 'en_US');

    // Twitter
    updateMetaTag('meta[property="twitter:title"]', 'property', 'twitter:title', langData.title);
    updateMetaTag('meta[property="twitter:description"]', 'property', 'twitter:description', langData.description);
    updateMetaTag('meta[property="twitter:url"]', 'property', 'twitter:url', pageUrl);

    // Canonical
    updateLinkTag('canonical', pageUrl);
  }, [view, currentLang]);

  return null;
}
