import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { sessionApi, countdownApi } from '../api';
import XpBar from '../components/XpBar';
import StudyTimer from '../components/StudyTimer';
import ManualSessionForm from '../components/ManualSessionForm';
import SessionHistoryList from '../components/SessionHistoryList';
import OnlineUsersList from '../components/OnlineUsersList';
import UserSearchModal from '../components/UserSearchModal';
import PublicProfileModal from '../components/PublicProfileModal';
import FriendsModal from '../components/FriendsModal';
import ChatModal from '../components/ChatModal';
import CountdownWidget from '../components/CountdownWidget';
import TrendingGroupsWidget from '../components/TrendingGroupsWidget';
import FloatingCountdownBadge from '../components/FloatingCountdownBadge';
import CountdownModal from '../components/CountdownModal';
import DashboardCustomizerModal, { DEFAULT_WIDGET_VISIBILITY } from '../components/DashboardCustomizerModal';
import Footer from '../components/Footer';
import { User, Flame, X, ShieldCheck, Search, Users, MessageSquare, CheckCircle2, Sparkles, Plus, Clock, FolderOpen, SlidersHorizontal, LayoutGrid, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WIDGET_STORAGE_KEY = 'study_tracker_dashboard_widgets_v1';

const DEFAULT_GUEST_PRESETS = [
  {
    examCode: 'THPT_QG_2027',
    title: 'Kỳ thi Tốt nghiệp THPT Quốc Gia 2027',
    targetDate: '2027-06-25T07:30:00.000Z',
    isOfficialDate: false,
    color: 'indigo',
    description: 'Kỳ thi tốt nghiệp THPT Quốc Gia chính thức hàng năm'
  },
  {
    examCode: 'DGNL_HCMUT_2027',
    title: 'Kỳ thi ĐGNL Bách Khoa HCMUT 2027',
    targetDate: '2027-04-04T07:30:00.000Z',
    isOfficialDate: false,
    color: 'cyan',
    description: 'Kỳ thi Đánh giá năng lực Trường Đại học Bách Khoa TP.HCM'
  },
  {
    examCode: 'DGNL_VNU_HCM_2027',
    title: 'Kỳ thi ĐGNL ĐHQG TP.HCM Đợt 1 2027',
    targetDate: '2027-03-28T07:30:00.000Z',
    isOfficialDate: false,
    color: 'emerald',
    description: 'Kỳ thi Đánh giá năng lực Đại học Quốc gia TP.HCM'
  }
];

const calculateXpEarned = (durationSeconds) => {
  const minutes = durationSeconds / 60;
  const baseXp = minutes * 10;
  if (durationSeconds >= 1500) {
    return Math.round(baseXp * 1.1);
  }
  return Math.round(baseXp);
};

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanUrl}`;
};

export default function Dashboard({ onNavigateAdmin, onNavigateRegister, onNavigateProfile, onNavigateDrive, onNavigateCommunity }) {
  const { user, token, progress, refreshProgress, activeSession } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sessionToast, setSessionToast] = useState(null);
  const [liveXpProgress, setLiveXpProgress] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

  // Widget customizer state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_WIDGET_VISIBILITY, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse dashboard widget settings', e);
    }
    return DEFAULT_WIDGET_VISIBILITY;
  });

  const handleToggleWidget = useCallback((widgetId) => {
    setWidgetVisibility(prev => {
      const updated = { ...prev, [widgetId]: !prev[widgetId] };
      try {
        localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save widget settings', e);
      }
      return updated;
    });
  }, []);

  const handleResetWidgetVisibility = useCallback(() => {
    setWidgetVisibility(DEFAULT_WIDGET_VISIBILITY);
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(DEFAULT_WIDGET_VISIBILITY));
    } catch (e) {
      console.error('Failed to reset widget settings', e);
    }
  }, []);

  // Countdown state - Initialized synchronously from localStorage for 0ms flicker-free reload
  const [countdownPresets, setCountdownPresets] = useState(DEFAULT_GUEST_PRESETS);
  const [userCountdowns, setUserCountdowns] = useState(() => {
    try {
      const saved = localStorage.getItem('guest_countdowns');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeCountdown, setActiveCountdown] = useState(() => {
    try {
      const saved = localStorage.getItem('active_countdown_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);

  // Helper to update active countdown and save selection to localStorage
  const handleSetActiveCountdown = (event) => {
    setActiveCountdown(event);
    if (event) {
      const key = event.id || event.presetExamCode || event.title;
      localStorage.setItem('active_countdown_key', key);
      localStorage.setItem('active_countdown_data', JSON.stringify(event));
    } else {
      localStorage.removeItem('active_countdown_key');
      localStorage.removeItem('active_countdown_data');
    }
  };

  const fetchCountdowns = useCallback(async () => {
    let presets = DEFAULT_GUEST_PRESETS;
    try {
      const resPresets = await countdownApi.getPresets();
      if (resPresets && resPresets.length > 0) {
        presets = resPresets;
        setCountdownPresets(resPresets);
      }
    } catch (e) {
      console.warn('Using default countdown presets');
    }

    const isGuestUser = Boolean(user?.isGuest) || !localStorage.getItem('token');

    const nowMs = Date.now();
    let events = [];
    if (!isGuestUser) {
      try {
        const rawEvents = await countdownApi.getEvents();
        events = (rawEvents || []).filter(e => new Date(e.targetDate).getTime() > nowMs);
        setUserCountdowns(events);
      } catch (e) {
        console.error('Failed to load user countdowns', e);
      }
    } else {
      try {
        const savedGuest = localStorage.getItem('guest_countdowns');
        if (savedGuest) {
          const parsed = JSON.parse(savedGuest);
          events = (parsed || []).filter(e => new Date(e.targetDate).getTime() > nowMs);
        } else {
          // Initialize guest user with the first valid future default preset
          const initialPreset = presets.find(p => new Date(p.targetDate).getTime() > nowMs) || presets[0] || DEFAULT_GUEST_PRESETS[0];
          const defaultInitialEvent = {
            id: `guest_${initialPreset.examCode}`,
            presetExamCode: initialPreset.examCode,
            title: initialPreset.title,
            targetDate: initialPreset.targetDate,
            category: initialPreset.category || 'exam',
            color: initialPreset.color || 'indigo',
            isOfficialDate: Boolean(initialPreset.isOfficialDate),
            isPinned: true,
            emailNotify: false
          };
          events = [defaultInitialEvent];
          localStorage.setItem('guest_countdowns', JSON.stringify(events));
        }
        setUserCountdowns(events);
      } catch (e) {
        console.error('Failed to load guest countdowns', e);
      }
    }

    // Determine active countdown from non-expired events
    let matchedActive = null;
    const savedActiveKey = localStorage.getItem('active_countdown_key');

    if (savedActiveKey && events.length > 0) {
      const cleanKey = savedActiveKey.startsWith('preset_') ? savedActiveKey.replace('preset_', '') : savedActiveKey;
      matchedActive = events.find(e => 
        e.id === savedActiveKey || 
        e.presetExamCode === savedActiveKey || 
        e.presetExamCode === cleanKey || 
        e.title === savedActiveKey
      );
    }

    if (!matchedActive && events.length > 0) {
      const pinned = events.find(e => e.isPinned);
      matchedActive = pinned || events[0];
    }

    handleSetActiveCountdown(matchedActive);
  }, [user]);

  useEffect(() => {
    fetchCountdowns();
  }, [fetchCountdowns]);

  const handleSaveCountdown = async (payload) => {
    const isGuestUser = Boolean(user?.isGuest) || !localStorage.getItem('token');
    const tempId = `temp_${Date.now()}`;
    
    // Auto-pin if user has no events yet, or if explicitly requested
    const shouldPin = payload.isPinned === true || userCountdowns.length === 0;

    const newEvent = {
      id: tempId,
      presetExamCode: payload.presetExamCode || null,
      title: payload.title,
      targetDate: payload.targetDate,
      category: payload.category || 'custom',
      color: payload.color || 'indigo',
      note: payload.note || '',
      emailNotify: payload.emailNotify ?? true,
      isPinned: shouldPin,
      isOfficialDate: Boolean(payload.isOfficialDate)
    };

    // Filter existing duplicate matching preset/title without removing unrelated events
    const filterExisting = (list) => list.filter(e => {
      if (payload.presetExamCode && e.presetExamCode) {
        return e.presetExamCode !== payload.presetExamCode;
      }
      return e.id !== tempId && e.title !== payload.title;
    });

    const filtered = filterExisting(userCountdowns);
    const updatedEvents = shouldPin
      ? [newEvent, ...filtered.map(e => ({ ...e, isPinned: false }))]
      : [newEvent, ...filtered];

    setUserCountdowns(updatedEvents);
    if (shouldPin || !activeCountdown) {
      handleSetActiveCountdown(newEvent);
    }

    if (isGuestUser) {
      try {
        localStorage.setItem('guest_countdowns', JSON.stringify(updatedEvents));
      } catch (e) {
        console.error('Failed to save guest countdowns', e);
      }
      return;
    }

    try {
      const savedEvent = await countdownApi.createEvent({
        presetExamCode: payload.presetExamCode || null,
        title: payload.title,
        targetDate: payload.targetDate,
        category: payload.category || 'custom',
        color: payload.color || 'indigo',
        note: payload.note || '',
        emailNotify: payload.emailNotify ?? true,
        isPinned: shouldPin,
        isCommunityEvent: payload.isCommunityEvent
      });
      setUserCountdowns(prev => {
        const updated = prev.map(e => e.id === tempId ? savedEvent : (shouldPin ? { ...e, isPinned: false } : e));
        return updated;
      });
      if (shouldPin || !activeCountdown) {
        handleSetActiveCountdown(savedEvent);
      }
      fetchCountdowns();
    } catch (err) {
      console.error('Save countdown failed:', err);
      setUserCountdowns(prev => prev.filter(e => e.id !== tempId));
    }
  };

  const handleDeleteCountdown = async (id) => {
    const targetToDelete = userCountdowns.find(e => e.id === id || e.presetExamCode === id);
    const targetId = targetToDelete ? targetToDelete.id : id;
    const isGuestUser = Boolean(user?.isGuest) || !localStorage.getItem('token');

    const remaining = userCountdowns.filter(e => e.id !== targetId && e.presetExamCode !== id && e.title !== id);
    
    // If deleted event was pinned, auto-pin the first remaining event
    let updatedEvents = remaining;
    if (targetToDelete?.isPinned && remaining.length > 0) {
      updatedEvents = remaining.map((e, idx) => ({ ...e, isPinned: idx === 0 }));
    }
    setUserCountdowns(updatedEvents);

    const nextActive = updatedEvents.find(e => e.isPinned) || (updatedEvents.length > 0 ? updatedEvents[0] : null);
    handleSetActiveCountdown(nextActive);

    if (isGuestUser) {
      try {
        localStorage.setItem('guest_countdowns', JSON.stringify(updatedEvents));
      } catch (e) {
        console.error('Failed to update guest countdowns after delete', e);
      }
      return;
    }

    if (!targetId || targetId.startsWith('temp_') || targetId.startsWith('guest_') || targetId.startsWith('preset_')) return;

    try {
      await countdownApi.deleteEvent(targetId);
      if (targetToDelete?.isPinned && updatedEvents.length > 0) {
        await countdownApi.pinEvent(updatedEvents[0].id);
      }
      fetchCountdowns();
    } catch (err) {
      console.error('Delete countdown failed:', err);
      // Rollback optimistic delete
      if (targetToDelete) {
        setUserCountdowns(userCountdowns);
        handleSetActiveCountdown(activeCountdown);
      }
      alert(err.message || 'Không thể xóa sự kiện lúc này.');
    }
  };

  const handlePinCountdown = async (id) => {
    const target = userCountdowns.find(e => e.id === id || e.presetExamCode === id);
    if (!target) return;

    const targetId = target.id;
    const updatedEvents = userCountdowns.map(e => ({
      ...e,
      isPinned: e.id === targetId || (e.presetExamCode && e.presetExamCode === id)
    }));
    setUserCountdowns(updatedEvents);
    handleSetActiveCountdown({ ...target, isPinned: true });

    const isGuestUser = Boolean(user?.isGuest) || !localStorage.getItem('token');
    if (isGuestUser) {
      try {
        localStorage.setItem('guest_countdowns', JSON.stringify(updatedEvents));
      } catch (e) {
        console.error('Failed to save guest countdown pin', e);
      }
      return;
    }

    if (!targetId || targetId.startsWith('temp_') || targetId.startsWith('guest_') || targetId.startsWith('preset_')) return;

    try {
      await countdownApi.pinEvent(targetId);
      fetchCountdowns();
    } catch (err) {
      console.error('Pin countdown failed:', err);
    }
  };



  const fetchHistory = useCallback(async () => {
    try {
      const data = await sessionApi.getHistory();
      setSessions(data);
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!activeSession) {
      setLiveXpProgress(null);
      return;
    }

    const getXpRequiredForNextLevel = (level) => {
      return Math.round(100 * Math.pow(level, 1.5));
    };

    const updateLiveXp = () => {
      const start = new Date(activeSession.startedAt);
      const now = new Date();
      const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
      const xpEarned = calculateXpEarned(elapsedSeconds);
      
      let tempXp = (progress?.currentXp ?? 0) + xpEarned;
      let tempLevel = progress?.currentLevel ?? 1;
      
      while (true) {
        const xpRequired = getXpRequiredForNextLevel(tempLevel);
        if (tempXp >= xpRequired) {
          tempXp -= xpRequired;
          tempLevel++;
        } else {
          break;
        }
      }

      const xpRequiredForNextLevel = getXpRequiredForNextLevel(tempLevel);

      setLiveXpProgress({
        currentLevel: tempLevel,
        currentXp: tempXp,
        xpRequiredForNextLevel,
        totalXp: (progress?.totalXp ?? 0) + xpEarned,
      });
    };

    updateLiveXp();
    const interval = setInterval(updateLiveXp, 1000);
    return () => clearInterval(interval);
  }, [activeSession, progress]);

  const handleStopResult = useCallback((result) => {
    // Show XP earned toast
    setSessionToast({
      subject: result.subject || t('timer_placeholder'),
      durationSeconds: result.durationSeconds,
      xpEarned: result.xpEarned,
    });

    // Refresh history
    fetchHistory();

    // Auto-hide session toast after 5 seconds
    setTimeout(() => {
      setSessionToast(null);
    }, 5000);
  }, [fetchHistory, t]);

  const handleManualSuccess = useCallback((newSession) => {
    fetchHistory();
    setSessionToast({
      subject: newSession.subject || t('timer_placeholder'),
      durationSeconds: newSession.durationSeconds,
      xpEarned: newSession.xpEarned,
    });
    setTimeout(() => {
      setSessionToast(null);
    }, 5000);

    refreshProgress();
  }, [fetchHistory, refreshProgress, t]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 relative overflow-hidden">
      {/* Decorative gradient glowing balls */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Flame className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="hidden lg:inline-block font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
              Study XP Tracker
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-2xl px-3 py-1.5 text-slate-100 hover:text-purple-600 dark:hover:text-purple-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              title={t('nav_messages_title')}
            >
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden lg:inline">{t('nav_messages')}</span>
              {progress?.unreadMessagesCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold rounded-full animate-pulse">
                  {progress.unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsFriendsOpen(true)}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl px-3 py-1.5 text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              title={t('nav_friends_title')}
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden lg:inline">{t('nav_friends')}</span>
              {progress?.pendingFriendRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold rounded-full animate-pulse">
                  {progress.pendingFriendRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={onNavigateDrive}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-2xl px-3 py-1.5 text-slate-100 hover:text-sky-400 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              title={t('nav_drive_title')}
            >
              <FolderOpen className="w-4 h-4 text-sky-400" />
              <span className="hidden lg:inline">{t('nav_drive')}</span>
            </button>

            <button
              onClick={() => onNavigateCommunity && onNavigateCommunity()}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl px-3 py-1.5 text-slate-100 hover:text-indigo-400 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              title={t('nav_community_title')}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline">{t('nav_community')}</span>
            </button>

            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl px-3 py-1.5 text-slate-100 hover:text-indigo-400 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              title={t('customize_dashboard')}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline">{t('customize_dashboard')}</span>
            </button>


            {user?.role === 'ROLE_ADMIN' && (
              <button
                onClick={onNavigateAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all"
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="hidden lg:inline">Admin</span>
              </button>
            )}

            {user?.isGuest && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  {t('guest_badge')}
                </span>
                <button
                  onClick={onNavigateRegister}
                  className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <span>{t('guest_register_cta')}</span>
                </button>
              </div>
            )}

            <button
              onClick={onNavigateProfile}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl px-3 py-1.5 text-sm transition-all cursor-pointer shadow-md text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold"
              title="Quản lý trang cá nhân & Cài đặt"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-xs text-white font-bold">
                {user?.avatarUrl ? (
                  <img
                    src={getFullAvatarUrl(user.avatarUrl)}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.displayName || 'User'}`;
                    }}
                  />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <span className="hidden lg:inline text-slate-200 font-semibold text-xs sm:text-sm">{user?.displayName}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* XP Progress Bar Widget */}
        {widgetVisibility.xpBar && (liveXpProgress || progress) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <XpBar
              currentLevel={liveXpProgress?.currentLevel ?? progress.currentLevel}
              currentXp={liveXpProgress?.currentXp ?? progress.currentXp}
              xpRequiredForNextLevel={liveXpProgress?.xpRequiredForNextLevel ?? progress.xpRequiredForNextLevel}
              totalXp={liveXpProgress?.totalXp ?? progress.totalXp}
            />
          </motion.div>
        )}

        {/* Empty state when all widgets are hidden */}
        {Object.values(widgetVisibility).every(v => !v) ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 border border-slate-800/80 my-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">{t('all_widgets_hidden')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('all_widgets_hidden_desc')}</p>
            </div>
            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t('customize_dashboard')}</span>
            </button>
          </div>
        ) : (
          /* Dashboard Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Timer, Manual Log, Online Users */}
            {(widgetVisibility.studyTimer || widgetVisibility.manualSession || widgetVisibility.onlineUsers) && (
              <div className="lg:col-span-1 space-y-8">
                {widgetVisibility.studyTimer && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <StudyTimer onStopResult={handleStopResult} />
                  </motion.div>
                )}

                {widgetVisibility.manualSession && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ManualSessionForm onSuccess={handleManualSuccess} />
                  </motion.div>
                )}

                {widgetVisibility.onlineUsers && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <OnlineUsersList 
                      onSelectUser={(userId) => setSelectedUserId(userId)} 
                      onOpenSearch={() => setIsSearchOpen(true)} 
                      onOpenChat={(targetUser) => {
                        setActiveChatUser(targetUser);
                        setIsChatOpen(true);
                      }}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {/* Right Column: Countdown Widget, Trending Groups & History */}
            {(widgetVisibility.countdown || widgetVisibility.trendingGroups || widgetVisibility.sessionHistory) && (
              <div className={`space-y-8 ${
                !(widgetVisibility.studyTimer || widgetVisibility.manualSession || widgetVisibility.onlineUsers)
                  ? 'lg:col-span-3'
                  : 'lg:col-span-2'
              }`}>
                {widgetVisibility.countdown && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <CountdownWidget
                      activeCountdown={activeCountdown}
                      presets={countdownPresets}
                      events={userCountdowns}
                      onOpenManage={() => setIsCountdownModalOpen(true)}
                      onSelectEvent={(event) => handleSetActiveCountdown(event)}
                      onPinEvent={handlePinCountdown}
                    />
                  </motion.div>
                )}

                {widgetVisibility.trendingGroups && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <TrendingGroupsWidget
                      onNavigateCommunity={onNavigateCommunity}
                      onOpenGroup={(groupId) => onNavigateCommunity && onNavigateCommunity(groupId)}
                    />
                  </motion.div>
                )}

                {widgetVisibility.sessionHistory && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {loadingHistory ? (
                      <div className="glass-panel rounded-3xl p-12 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <SessionHistoryList 
                        sessions={sessions} 
                        isGuest={user?.isGuest} 
                        onNavigateRegister={onNavigateRegister} 
                      />
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Floating Bottom-Right Countdown Badge */}
      <FloatingCountdownBadge
        activeCountdown={activeCountdown}
        onClick={() => setIsCountdownModalOpen(true)}
      />

      {/* Day Countdown Management Modal */}
      <CountdownModal
        isOpen={isCountdownModalOpen}
        onClose={() => setIsCountdownModalOpen(false)}
        activeCountdown={activeCountdown}
        presets={countdownPresets}
        events={userCountdowns}
        onSaveEvent={handleSaveCountdown}
        onDeleteEvent={handleDeleteCountdown}
        onPinEvent={handlePinCountdown}
      />

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        widgetVisibility={widgetVisibility}
        onToggleWidget={handleToggleWidget}
        onResetDefault={handleResetWidgetVisibility}
      />


      {/* User Search Modal */}
      <UserSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelectUser={(userId) => setSelectedUserId(userId)} 
      />

      {/* Public Profile Modal */}
      <PublicProfileModal 
        userId={selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
        onOpenChat={(targetUser) => {
          setActiveChatUser(targetUser);
          setIsChatOpen(true);
        }}
      />

      {/* Friends Management Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        onViewProfile={(userId) => setSelectedUserId(userId)}
        onRefreshUserProgress={refreshProgress}
        onOpenChat={(targetUser) => {
          setActiveChatUser(targetUser);
          setIsChatOpen(true);
        }}
      />

      {/* Direct Messaging Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeTargetUser={activeChatUser}
        onSelectProfile={(userId) => setSelectedUserId(userId)}
      />

      {/* Session Result Toast - Toast message on the right side of the screen */}
      <AnimatePresence>
        {sessionToast && (
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-20 right-6 z-50 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
          >
            <div className="glass-panel glass-panel-glow border-indigo-500/40 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 relative overflow-hidden pointer-events-auto flex flex-col gap-3">
              {/* Background ambient glow */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{t('session_completed')}</span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm block truncate max-w-[170px] sm:max-w-[200px]">
                      {sessionToast.subject}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs flex items-center gap-1 shadow-sm">
                    <Plus className="w-3 h-3 text-emerald-400" />
                    {sessionToast.xpEarned} XP
                  </span>
                  <button
                    onClick={() => setSessionToast(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details footer line */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {t('timer_title')}
                </span>
                <span className="font-semibold text-slate-200">
                  {Math.round(sessionToast.durationSeconds / 60)} {t('minutes')} ({sessionToast.durationSeconds}s)
                </span>
              </div>

              {/* Auto-dismiss countdown bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 origin-left"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
