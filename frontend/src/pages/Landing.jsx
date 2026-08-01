import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Flame, Sun, Moon, Play, Square, Award, Users, Calendar, 
  TrendingUp, CheckCircle, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Footer from '../components/Footer';

export default function Landing({ onNavigate }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Mock Timer Simulator State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mockLevel, setMockLevel] = useState(1);
  const [mockXp, setMockXp] = useState(0);
  const [mockTotalXp, setMockTotalXp] = useState(0);
  const [gainedXpToast, setGainedXpToast] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const timerIntervalRef = useRef(null);

  // Level Up requirement formula: 100 * level^1.5
  const getXpNeeded = (level) => {
    return Math.round(100 * Math.pow(level, 1.5));
  };

  const xpNeeded = getXpNeeded(mockLevel);

  // Timer Tick Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Handle Mock Timer Start
  const handleStartMock = () => {
    setIsTimerRunning(true);
    setSeconds(0);
  };

  // Handle Mock Timer Stop & XP Claim
  const handleStopMock = () => {
    setIsTimerRunning(false);
    
    // Simulate 1 second = 25 XP to speed up experience for demonstration
    const xpGained = seconds * 25;
    if (xpGained === 0) return;

    setMockTotalXp((prev) => prev + xpGained);
    
    let newXp = mockXp + xpGained;
    let currentLvl = mockLevel;
    let didLevelUp = false;

    while (true) {
      const required = getXpNeeded(currentLvl);
      if (newXp >= required) {
        newXp -= required;
        currentLvl += 1;
        didLevelUp = true;
      } else {
        break;
      }
    }

    setMockXp(newXp);
    setMockLevel(currentLvl);

    // Show Toast
    setGainedXpToast(xpGained);
    setTimeout(() => {
      setGainedXpToast(null);
    }, 4000);

    // Trigger level up animation
    if (didLevelUp) {
      setShowLevelUp(true);
      
      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Continuous burst
      const end = Date.now() + 1.5 * 1000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 200);
    }

    setSeconds(0);
  };

  const handleResetMock = () => {
    setIsTimerRunning(false);
    setSeconds(0);
    setMockLevel(1);
    setMockXp(0);
    setMockTotalXp(0);
    setShowLevelUp(false);
    setGainedXpToast(null);
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 relative overflow-hidden">
      {/* Decorative gradient glowing balls */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header>
        <nav aria-label="Thanh điều hướng chính" className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Flame className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
                Study XP Tracker
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Language Selector Dropdown */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Chọn ngôn ngữ"
                className="bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-800/80 backdrop-blur-md rounded-2xl px-3 py-1.5 text-sm font-semibold outline-none cursor-pointer hover:text-indigo-500 transition-colors"
              >
                <option value="vi" className="bg-slate-950 text-slate-300">Tiếng Việt</option>
                <option value="en" className="bg-slate-950 text-slate-300">English</option>
                <option value="zh" className="bg-slate-950 text-slate-300">简体中文</option>
              </select>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Chuyển đổi giao diện sáng tối"
                className="p-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-indigo-500 border border-slate-800/80 backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                )}
              </button>

              {/* Auth Actions */}
              <button 
                onClick={() => onNavigate('login')}
                className="hidden sm:block text-sm font-bold text-slate-300 hover:text-white px-3 py-1.5 cursor-pointer"
              >
                {t('landing_cta_login')}
              </button>
              <button 
                onClick={() => onNavigate('register')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2 rounded-2xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {t('landing_cta_get_started')}
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-6">
            <Zap className="w-3.5 h-3.5 fill-indigo-300/20" />
            <span>Gamify Your Productivity</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
              {t('landing_slogan')}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10">
            {t('landing_sub')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t('landing_cta_get_started')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {t('landing_cta_features')}
            </a>
          </div>
        </motion.div>
      </section>

      {/* Interactive Mock Timer Simulation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto glass-panel glass-panel-glow rounded-3xl p-6 sm:p-8 border-indigo-500/20"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Simulation UI */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
                  {t('landing_mock_timer_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('landing_mock_timer_desc')} <span className="text-indigo-400 font-semibold">(Mô phỏng tốc độ: 1 giây = 25 XP)</span>
                </p>
              </div>

              {/* Mock XP Level Bar */}
              <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-900/80">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Level</span>
                    <span className="text-2xl font-extrabold text-indigo-400">{mockLevel}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{mockXp} / {xpNeeded} XP</span>
                </div>
                
                {/* Level Bar */}
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800/50">
                  <motion.div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full"
                    animate={{ width: `${(mockXp / xpNeeded) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80 }}
                  />
                </div>

                <div className="flex justify-between mt-3 text-xs text-slate-500">
                  <span>{t('landing_mock_total_xp')}: <strong className="text-slate-300 font-bold">{mockTotalXp} XP</strong></span>
                  {seconds > 0 && (
                    <span className="text-indigo-300 font-medium animate-pulse">+{seconds * 25} XP dự kiến</span>
                  )}
                </div>
              </div>

              {/* Timer clock view */}
              <div className="flex items-center justify-center gap-6 py-6 bg-slate-900/40 rounded-2xl border border-slate-800/30">
                <span className="text-5xl sm:text-6xl font-extrabold font-mono tracking-wider text-slate-100 tabular-nums">
                  {formatTime(seconds)}
                </span>
                
                <div className="flex flex-col gap-2">
                  {!isTimerRunning ? (
                    <button
                      onClick={handleStartMock}
                      className="p-4 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                    >
                      <Play className="w-6 h-6 fill-white" />
                    </button>
                  ) : (
                    <button
                      onClick={handleStopMock}
                      className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                    >
                      <Square className="w-6 h-6 fill-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reset button */}
              {(mockTotalXp > 0 || seconds > 0) && (
                <button
                  onClick={handleResetMock}
                  className="self-center flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Đặt lại giả lập' : language === 'zh' ? '重置模拟' : 'Reset Simulator'}</span>
                </button>
              )}
            </div>

            {/* Dynamic visual panel */}
            <div className="relative h-64 sm:h-80 w-full rounded-2xl bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-slate-900 p-6 flex flex-col justify-center items-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />
              
              <AnimatePresence mode="wait">
                {showLevelUp ? (
                  <motion.div
                    key="levelup"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-center z-10 flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                      <Award className="w-10 h-10 text-amber-400" />
                    </div>
                    <h4 className="text-3xl font-extrabold text-amber-400 uppercase tracking-widest animate-bounce">
                      {t('landing_mock_level_up')}
                    </h4>
                    <p className="text-sm text-slate-300 mt-2">
                      {language === 'vi' ? 'Chào mừng bạn thăng lên Cấp' : language === 'zh' ? '欢迎升级到等级' : 'Welcome to Level'} <strong className="text-indigo-400 font-bold">{mockLevel}</strong>!
                    </p>
                    <button
                      onClick={() => setShowLevelUp(false)}
                      className="mt-5 px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      {language === 'vi' ? 'Tiếp tục học' : language === 'zh' ? '继续学习' : 'Keep Studying'}
                    </button>
                  </motion.div>
                ) : gainedXpToast ? (
                  <motion.div
                    key="toast"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-center z-10"
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 font-extrabold text-lg">
                      +{gainedXpToast}
                    </div>
                    <h4 className="text-xl font-bold text-emerald-400">
                      {language === 'vi' ? 'Claim XP Thành Công!' : language === 'zh' ? '成功领取经验值！' : 'XP Claimed Successfully!'}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs">
                      {t('landing_mock_xp_gained')} <strong>{gainedXpToast} XP</strong> {language === 'vi' ? 'từ phiên học giả lập. Đăng ký tài khoản để bắt đầu lưu điểm thật!' : language === 'zh' ? '来自模拟学习。注册账户开始记录真实数据！' : 'from mock session. Sign up to save real progress!'}
                    </p>
                  </motion.div>
                ) : isTimerRunning ? (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center z-10 flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
                    <h4 className="text-lg font-bold text-indigo-300">
                      {language === 'vi' ? 'Hệ thống đang đếm giờ học' : language === 'zh' ? '系统正在计时' : 'Timer is running'}
                    </h4>
                    <p className="text-sm text-slate-400 max-w-xs">
                      {language === 'vi' ? 'Mỗi giây trôi qua tăng thêm' : language === 'zh' ? '每秒获得' : 'Every second adds'} <strong className="text-indigo-400 font-bold">25 XP</strong>. {language === 'vi' ? 'Hãy tập trung cày cuốc!' : language === 'zh' ? '请保持专注！' : 'Keep focusing!'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center z-10 flex flex-col items-center"
                  >
                    <Flame className="w-16 h-16 text-indigo-500/20 animate-pulse mb-3" />
                    <h4 className="text-lg font-bold text-slate-300">
                      {language === 'vi' ? 'Hãy trải nghiệm thử!' : language === 'zh' ? '请体验试用！' : 'Try it out!'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      {language === 'vi' ? 'Nhấp nút Bắt đầu học thử để trải nghiệm cơ chế theo dõi thời gian và thăng cấp điểm kinh nghiệm trực tuyến.' : language === 'zh' ? '点击开始试用按钮体验在线记录时间和升级经验值机制。' : 'Click Start Free Trial to experience real-time time tracking and experience leveling mechanics.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-900/50 mt-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
            {t('landing_feature_title')}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel rounded-3xl p-6 transition-all hover:border-indigo-500/30 flex flex-col h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-md shadow-indigo-500/5">
              <Play className="w-5 h-5 fill-indigo-400/20" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-100">{t('landing_feature_timer_title')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-grow">{t('landing_feature_timer_desc')}</p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel rounded-3xl p-6 transition-all hover:border-indigo-500/30 flex flex-col h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 shadow-md shadow-purple-500/5">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-100">{t('landing_feature_rpg_title')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-grow">{t('landing_feature_rpg_desc')}</p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel rounded-3xl p-6 transition-all hover:border-indigo-500/30 flex flex-col h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6 shadow-md shadow-teal-500/5">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-100">{t('landing_feature_coop_title')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-grow">{t('landing_feature_coop_desc')}</p>
          </motion.div>

          {/* Feature 4 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel rounded-3xl p-6 transition-all hover:border-indigo-500/30 flex flex-col h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-md shadow-amber-500/5">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-100">{t('landing_feature_heatmap_title')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-grow">{t('landing_feature_heatmap_desc')}</p>
          </motion.div>
        </div>
      </section>

      {/* Visual Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 border-t border-slate-900/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
              {t('landing_showcase_title')}
            </h2>
            <p className="text-slate-400 leading-relaxed">
              {t('landing_showcase_desc')}
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>{t('landing_showcase_item1')}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>{t('landing_showcase_item2')}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>{t('landing_showcase_item3')}</span>
              </li>
            </ul>

            <button
              onClick={() => onNavigate('register')}
              className="inline-flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-bold px-6 py-3 rounded-2xl border border-indigo-500/20 transition-all cursor-pointer"
            >
              <span>{t('landing_showcase_btn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-panel rounded-3xl p-6 border-slate-900 relative overflow-hidden"
          >
            {/* Visual mockup of the app dashboard */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-slate-500 font-mono">dashboard_mockup.js</span>
            </div>

            <div className="space-y-4">
              {/* Mockup Top stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">{t('landing_mock_streak')}</span>
                  <span className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
                    12 <Flame className="w-4 h-4 fill-amber-500/20 shrink-0" />
                  </span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">{t('landing_mock_level')}</span>
                  <span className="text-lg font-bold text-indigo-400">14</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">{t('landing_mock_duration')}</span>
                  <span className="text-lg font-bold text-teal-400">45.5h</span>
                </div>
              </div>

              {/* Mockup Heatmap layout */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                <span className="block text-xs font-semibold text-slate-400 mb-3">{t('landing_mock_heatmap_title')}</span>
                <div className="flex gap-1 overflow-x-auto pb-1 justify-center">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const intensities = ['bg-slate-900', 'bg-indigo-950/50', 'bg-indigo-900/60', 'bg-indigo-700/80', 'bg-indigo-500'];
                    const idx = Math.floor(Math.random() * intensities.length);
                    return (
                      <div key={i} className="flex flex-col gap-1">
                        {Array.from({ length: 4 }).map((_, j) => {
                          const intensity = j === 1 && idx === 4 ? intensities[2] : intensities[Math.floor(Math.random() * intensities.length)];
                          return <div key={j} className={`w-3.5 h-3.5 rounded-sm ${intensity}`} />;
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mockup Online Users list */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-slate-400">{t('landing_mock_coop_title')}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    3 Online
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/40">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">Minh Anh</span>
                      <span className="text-[10px] px-1 rounded bg-indigo-500/10 text-indigo-300 font-bold">Lvl 15</span>
                    </div>
                    <span className="text-slate-500 italic">{t('landing_mock_user1_subject')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/40">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">Hoàng Nam</span>
                      <span className="text-[10px] px-1 rounded bg-indigo-500/10 text-indigo-300 font-bold">Lvl 23</span>
                    </div>
                    <span className="text-slate-500 italic">{t('landing_mock_user2_subject')}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
