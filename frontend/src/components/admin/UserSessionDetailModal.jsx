import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { X, BookOpen, Clock, Zap, Timer, Edit3, Loader2, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BanUserModal from './BanUserModal';
import UnbanUserModal from './UnbanUserModal';

export default function UserSessionDetailModal({ user, onClose, onRefresh }) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userToBan, setUserToBan] = useState(null);
  const [userToUnban, setUserToUnban] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchUserSessions = async () => {
      try {
        setLoading(true);
        const data = await adminApi.getUserSessions(user.userId);
        setSessions(data);
      } catch (err) {
        console.error('Lỗi tải lịch sử session user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserSessions();
  }, [user]);

  if (!user) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl glass-panel rounded-3xl p-6 overflow-hidden flex flex-col max-h-[85vh] border border-slate-700/50 shadow-2xl shadow-indigo-950/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {t('admin_modal_history_title')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-200">{user.displayName}</span> ({user.email})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Boolean(user.isBanned || user.banned) ? (
                <button
                  onClick={() => setUserToUnban(user)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  title="Mở khóa tài khoản"
                >
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  Mở khóa
                </button>
              ) : (
                <button
                  onClick={() => setUserToBan(user)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  title="Khóa tài khoản"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Cấm
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User quick stats banner */}
          <div className="grid grid-cols-3 gap-3 my-4 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/60 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500">{t('admin_user_col_level')}</span>
              <span className="font-bold text-indigo-300">Level {user.currentLevel} ({user.totalXp} XP)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">{t('admin_user_col_sessions')}</span>
              <span className="font-bold text-emerald-400">{user.totalSessionsCount} sessions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">{t('admin_user_col_hours')}</span>
              <span className="font-bold text-amber-300">{formatDuration(user.totalStudySeconds)}</span>
            </div>
          </div>

          {/* Content / Session List Table */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {t('admin_modal_no_sessions')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('admin_session_col_subject')}</th>
                      <th className="py-2.5 px-3 font-semibold">{t('admin_session_col_duration')}</th>
                      <th className="py-2.5 px-3 font-semibold">{t('admin_session_col_xp')}</th>
                      <th className="py-2.5 px-3 font-semibold">{t('admin_session_col_source')}</th>
                      <th className="py-2.5 px-3 font-semibold">{t('admin_session_col_started')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {session.subject || t('timer_placeholder')}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono">
                          {session.endedAt ? formatDuration(session.durationSeconds) : (
                            <span className="text-amber-400 animate-pulse font-bold">Đang học...</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-amber-300 font-bold">
                          +{session.xpEarned || 0} XP
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 ${
                            session.source === 'MANUAL'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          }`}>
                            {session.source === 'MANUAL' ? <Edit3 className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                            {session.source === 'MANUAL' ? t('admin_session_source_manual') : t('admin_session_source_timer')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {formatDate(session.startedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {userToBan && (
          <BanUserModal
            user={userToBan}
            onClose={() => setUserToBan(null)}
            onSuccess={() => { if (onRefresh) onRefresh(); onClose(); }}
          />
        )}

        {userToUnban && (
          <UnbanUserModal
            user={userToUnban}
            onClose={() => setUserToUnban(null)}
            onSuccess={() => { if (onRefresh) onRefresh(); onClose(); }}
          />
        )}
      </div>
    </AnimatePresence>
  );
}
