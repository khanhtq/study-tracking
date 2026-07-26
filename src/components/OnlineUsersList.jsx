import React, { useState, useEffect, memo } from 'react';
import { userApi } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, Clock, Loader2, Search, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanUrl}`;
};

function OnlineUserRow({ user, onSelectUser, onOpenChat }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [elapsed, setElapsed] = useState('');
  const [liveLevel, setLiveLevel] = useState(user.currentLevel || user.baseLevel || 1);
  const [imgErr, setImgErr] = useState(false);

  const currentUserId = currentUser?.id || currentUser?.userId;
  const isSelf = Boolean(currentUserId && (user.userId === currentUserId || String(user.userId) === String(currentUserId)));

  useEffect(() => {
    if (!user.isStudying || !user.studyStartedAt) {
      setElapsed('');
      setLiveLevel(user.currentLevel || user.baseLevel || 1);
      return;
    }

    const calculateXpEarned = (durationSeconds) => {
      const minutes = durationSeconds / 60;
      const baseXp = minutes * 10;
      if (durationSeconds >= 1500) {
        return Math.round(baseXp * 1.1);
      }
      return Math.round(baseXp);
    };

    const getXpRequiredForNextLevel = (level) => {
      return Math.round(100 * Math.pow(level, 1.5));
    };

    const updateRealtimeStats = () => {
      const start = new Date(user.studyStartedAt).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

      const hrs = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;

      if (hrs > 0) {
        setElapsed(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setElapsed(`${mins}m ${secs}s`);
      }

      // Calculate real-time level taking into account active session XP from baseLevel
      const xpEarned = calculateXpEarned(diffSeconds);
      let tempXp = (user.currentXp || 0) + xpEarned;
      let tempLevel = user.baseLevel || 1;

      while (true) {
        const required = getXpRequiredForNextLevel(tempLevel);
        if (tempXp >= required) {
          tempXp -= required;
          tempLevel++;
        } else {
          break;
        }
      }

      setLiveLevel(tempLevel);
    };

    updateRealtimeStats();
    const interval = setInterval(updateRealtimeStats, 1000);
    return () => clearInterval(interval);
  }, [user.isStudying, user.studyStartedAt, user.currentLevel, user.baseLevel, user.currentXp]);

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const baseLevel = user.baseLevel || user.currentLevel || 1;
  const isLevelBoosted = liveLevel > baseLevel;

  return (
    <div 
      onClick={() => onSelectUser && onSelectUser(user.userId)}
      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all gap-3 cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar with status indicator */}
        <div className="relative shrink-0">
          {user.avatarUrl && !imgErr ? (
            <img 
              src={getFullAvatarUrl(user.avatarUrl)} 
              alt={user.displayName} 
              onError={() => setImgErr(true)}
              className="w-10 h-10 rounded-xl object-cover border border-slate-700/50 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-950 border border-slate-700/50 flex items-center justify-center font-bold text-sm text-indigo-300">
              {initials}
            </div>
          )}
          {/* Status Dot */}
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
            user.isStudying
              ? 'bg-emerald-500 animate-[pulse_1.5s_infinite]'
              : 'bg-indigo-400'
          }`} />
        </div>

        <div className="min-w-0">
          <span className="font-semibold text-sm text-slate-200 group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 truncate">
            <span className="truncate">{user.displayName}</span>
            {liveLevel && (
              <span className={`shrink-0 px-1.5 py-0.5 rounded-lg font-extrabold text-[10px] border transition-all ${
                isLevelBoosted
                  ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border-amber-500/40 animate-pulse shadow-sm shadow-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {t('level_short')} {liveLevel} {isLevelBoosted && '⚡'}
              </span>
            )}
          </span>
          {user.isStudying ? (
            <span className="text-[11px] text-indigo-300 font-medium flex items-center gap-1 mt-0.5 truncate">
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate">{t('studying_subject')}: {user.currentSubject || t('timer_placeholder')}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5 truncate">
              {t('status_active_idle')}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {onOpenChat && !isSelf && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat({
                userId: user.userId,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                currentLevel: liveLevel,
                isOnline: true,
              });
            }}
            title="Nhắn tin"
            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
        {user.isStudying && elapsed && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-tight">
            <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="font-mono-timer">{elapsed}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OnlineUsersList({ onSelectUser, onOpenSearch, onOpenChat }) {
  const { t } = useLanguage();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineUsers = async () => {
    try {
      const data = await userApi.getOnline();
      // Sort users: studying first, then by name
      const sorted = [...data].sort((a, b) => {
        if (a.isStudying && !b.isStudying) return -1;
        if (!a.isStudying && b.isStudying) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setOnlineUsers(sorted);
    } catch (err) {
      console.error('Lỗi tải danh sách online:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 6000); // refresh every 6 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <h3 className="text-xl font-bold text-slate-100 flex items-center justify-between mb-4">
        <span className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          {t('online_title')}
        </span>
        <div className="flex items-center gap-2">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all"
              title={t('search_members')}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-900 border border-slate-800 rounded-full text-slate-400">
            {onlineUsers.length} {t('online_users')}
          </span>
        </div>
      </h3>

      {loading && onlineUsers.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : onlineUsers.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          {t('no_online_short')}
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          <AnimatePresence initial={false}>
            {onlineUsers.map(user => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OnlineUserRow user={user} onSelectUser={onSelectUser} onOpenChat={onOpenChat} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default memo(OnlineUsersList);
