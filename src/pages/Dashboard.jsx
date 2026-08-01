import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { sessionApi } from '../api';
import XpBar from '../components/XpBar';
import StudyTimer from '../components/StudyTimer';
import ManualSessionForm from '../components/ManualSessionForm';
import SessionHistoryList from '../components/SessionHistoryList';
import OnlineUsersList from '../components/OnlineUsersList';
import UserSearchModal from '../components/UserSearchModal';
import PublicProfileModal from '../components/PublicProfileModal';
import FriendsModal from '../components/FriendsModal';
import ChatModal from '../components/ChatModal';
import Footer from '../components/Footer';
import { User, Flame, X, ShieldCheck, Search, Users, MessageSquare, CheckCircle2, Sparkles, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function Dashboard({ onNavigateAdmin, onNavigateRegister, onNavigateProfile }) {
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Flame className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end">
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
              <span className="hidden sm:inline">{t('nav_messages')}</span>
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
              <span className="hidden sm:inline">{t('nav_friends')}</span>
              {progress?.pendingFriendRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold rounded-full animate-pulse">
                  {progress.pendingFriendRequestsCount}
                </span>
              )}
            </button>


            {user?.role === 'ROLE_ADMIN' && (
              <button
                onClick={onNavigateAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all"
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Admin</span>
              </button>
            )}

            {user?.isGuest && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  {t('guest_badge')}
                </span>
                <button
                  onClick={onNavigateRegister}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
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
              <span className="text-slate-200 font-semibold text-xs sm:text-sm">{user?.displayName}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* XP Progress Bar */}
        {(liveXpProgress || progress) && (
          <XpBar
            currentLevel={liveXpProgress?.currentLevel ?? progress.currentLevel}
            currentXp={liveXpProgress?.currentXp ?? progress.currentXp}
            xpRequiredForNextLevel={liveXpProgress?.xpRequiredForNextLevel ?? progress.xpRequiredForNextLevel}
            totalXp={liveXpProgress?.totalXp ?? progress.totalXp}
          />
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Timer & Manual Log */}
          <div className="lg:col-span-1 space-y-8">
            <StudyTimer onStopResult={handleStopResult} />
            <ManualSessionForm onSuccess={handleManualSuccess} />
            <OnlineUsersList 
              onSelectUser={(userId) => setSelectedUserId(userId)} 
              onOpenSearch={() => setIsSearchOpen(true)} 
              onOpenChat={(targetUser) => {
                setActiveChatUser(targetUser);
                setIsChatOpen(true);
              }}
            />
          </div>

          {/* Right Column: Statistics & History */}
          <div className="lg:col-span-2">
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
          </div>
        </div>
      </main>

      <Footer />

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
