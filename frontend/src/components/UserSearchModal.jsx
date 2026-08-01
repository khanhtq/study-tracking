import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { Search, X, Loader2, UserCheck, Shield, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserSearchModal({ isOpen, onClose, onSelectUser }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await userApi.searchUsers(query);
        setResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg glass-panel rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Search Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/60">
            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search_members_placeholder')}
              className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results Area */}
          <div className="p-4 overflow-y-auto flex-1 scrollbar-thin space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang tìm kiếm thành viên...</span>
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                {t('no_members_found')}
              </div>
            ) : !query.trim() ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium flex flex-col items-center gap-2">
                <UserCheck className="w-8 h-8 text-slate-400 mb-1" />
                <span>{t('search_members_placeholder')}</span>
              </div>
            ) : (
              results.map((user) => (
                <UserSearchResultCard
                  key={user.userId}
                  user={user}
                  onSelect={() => {
                    onSelectUser(user.userId);
                    onClose();
                  }}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanUrl}`;
};

function UserSearchResultCard({ user, onSelect }) {
  const { t } = useLanguage();
  const [imgErr, setImgErr] = useState(false);

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div
      onClick={onSelect}
      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {user.avatarUrl && !imgErr ? (
            <img
              src={getFullAvatarUrl(user.avatarUrl)}
              alt={user.displayName}
              onError={() => setImgErr(true)}
              className="w-11 h-11 rounded-xl object-cover border border-slate-700/60 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-950 border border-slate-700/60 flex items-center justify-center font-bold text-sm text-indigo-300">
              {initials}
            </div>
          )}

          {/* Status badge dot */}
          <div
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
              user.isStudying
                ? 'bg-emerald-500 animate-[pulse_1.5s_infinite]'
                : user.isOnline
                ? 'bg-indigo-400'
                : 'bg-slate-600'
            }`}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors text-sm truncate">
              {user.displayName}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-extrabold text-[10px] shrink-0">
              {t('level_short')} {user.currentLevel || 1}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
              <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{t('title_' + (user.selectedTitle || 'Tân Binh Tập Trung')) || user.selectedTitle || 'Tân Binh Tập Trung'}</span>
            </span>
            {user.isStudying && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                <BookOpen className="w-3 h-3" />
                <span>{t('member_status_studying')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-xs font-semibold group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0 cursor-pointer">
        {t('view_profile')}
      </button>
    </div>
  );
}
