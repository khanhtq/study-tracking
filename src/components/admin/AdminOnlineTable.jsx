import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Filter, Radio, BookOpen, Clock, Loader2, ShieldCheck, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function OnlineRow({ user, onSelectUser, onOpenChat }) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!user.isStudying || !user.studyStartedAt) {
      setElapsed('');
      return;
    }
    const updateElapsed = () => {
      const start = new Date(user.studyStartedAt).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      setElapsed(hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [user.isStudying, user.studyStartedAt]);

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const formatLastActive = (iso) => {
    if (!iso) return '-';
    const diffSecs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSecs < 10) return 'Vừa mới';
    if (diffSecs < 60) return `${diffSecs}s trước`;
    return `${Math.floor(diffSecs / 60)}m trước`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700/80 transition-all gap-4">
      {/* Left: User Info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-950 border border-slate-700/60 flex items-center justify-center font-extrabold text-sm text-indigo-300 shadow-md">
            {initials}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
            user.isStudying ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-400'
          }`} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100">{user.displayName}</span>
            {user.role === 'ROLE_ADMIN' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Lvl {user.currentLevel || 1}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Center: Current Status */}
      <div className="flex items-center gap-3">
        {user.isStudying ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold block">{user.currentSubject || t('timer_placeholder')}</span>
              {elapsed && <span className="font-mono text-[11px] text-emerald-400">{elapsed}</span>}
            </div>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/30 text-slate-400 text-xs font-medium">
            {t('status_active_idle')}
          </div>
        )}
      </div>

      {/* Right: Last active & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {formatLastActive(user.lastActiveAt)}
        </span>
        {onOpenChat && user.role !== 'ROLE_ADMIN' && (
          <button
            onClick={() => onOpenChat({ userId: user.userId || user.id, id: user.userId || user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, email: user.email })}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            title={t('admin_btn_send_msg')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {t('admin_btn_send_msg')}
          </button>
        )}

        {onSelectUser && (
          <button
            onClick={() => onSelectUser(user)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            {t('admin_btn_history')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminOnlineTable({ onSelectUser, onOpenChat }) {
  const { t } = useLanguage();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOnline = async () => {
    try {
      const data = await adminApi.getOnlineUsersDetailed();
      setOnlineUsers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách online admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = onlineUsers.filter((u) => {
    const matchesSearch =
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'studying') return u.isStudying;
    if (statusFilter === 'idle') return !u.isStudying;
    return true;
  });

  return (
    <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            {t('admin_tab_online')}
            <span className="px-2.5 py-0.5 text-xs font-extrabold bg-slate-900 border border-slate-800 rounded-full text-emerald-400">
              {onlineUsers.length} online
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin_search_placeholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer transition-all"
            >
              <option value="all">{t('admin_status_filter_all')}</option>
              <option value="studying">{t('admin_status_filter_studying')}</option>
              <option value="idle">{t('admin_status_filter_idle')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Online Users List */}
      {loading && onlineUsers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {t('no_online_short')}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredUsers.map((user) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <OnlineRow user={user} onSelectUser={onSelectUser} onOpenChat={onOpenChat} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
