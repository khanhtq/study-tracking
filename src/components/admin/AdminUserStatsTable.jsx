import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Calendar, BarChart2, BookOpen, Clock, Zap, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminUserStatsTable({ onSelectUser }) {
  const { t } = useLanguage();
  const [usersStats, setUsersStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all');
  const [search, setSearch] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUserStatsList(range);
      setUsersStats(data);
    } catch (err) {
      console.error('Lỗi tải thống kê người dùng admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredUsers = usersStats.filter((u) => {
    return (
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            {t('admin_tab_users_stats')}
            <span className="px-2.5 py-0.5 text-xs font-extrabold bg-slate-900 border border-slate-800 rounded-full text-indigo-400">
              {filteredUsers.length} users
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
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

          {/* Time Range Selector */}
          <div className="relative flex items-center gap-1 bg-slate-900/60 p-1 border border-slate-800 rounded-2xl">
            {[
              { key: 'all', label: t('admin_period_all') },
              { key: 'today', label: t('admin_period_today') },
              { key: '7d', label: t('admin_period_7d') },
              { key: '30d', label: t('admin_period_30d') },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setRange(btn.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  range === btn.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Không tìm thấy người dùng phù hợp.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_user')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_status')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_level')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_sessions')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_hours')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_xp_period')}</th>
                <th className="py-3 px-3 font-semibold">{t('admin_user_col_last_active')}</th>
                <th className="py-3 px-3 font-semibold text-right">{t('admin_user_col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-800/30 transition-all">
                  {/* User Name & Email */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-indigo-950 border border-slate-700/50 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                        {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          {user.displayName}
                          {user.role === 'ROLE_ADMIN' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                              Admin
                            </span>
                          )}
                          {user.isSuspicious && (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/40 flex items-center gap-1 shadow-sm cursor-help"
                              title={user.suspiciousReasons?.join(' | ')}
                            >
                              🚨 Bất thường
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Online Status */}
                  <td className="py-3 px-3">
                    {user.isStudying ? (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px] inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Đang học
                      </span>
                    ) : user.isOnline ? (
                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold text-[11px] inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Online
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-slate-800/40 text-slate-500 border border-slate-800 text-[11px]">
                        Offline
                      </span>
                    )}
                  </td>

                  {/* Level / Total XP */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-indigo-300 block">Lvl {user.currentLevel}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{user.totalXp?.toLocaleString()} XP</span>
                  </td>

                  {/* Sessions Count */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-200 block">{user.periodSessionsCount}</span>
                    {range !== 'all' && (
                      <span className="text-[10px] text-slate-500">tổng {user.totalSessionsCount}</span>
                    )}
                  </td>

                  {/* Total Study Time */}
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                    {formatDuration(user.periodStudySeconds)}
                  </td>

                  {/* Earned XP */}
                  <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                    +{user.periodXpEarned?.toLocaleString() || 0} XP
                  </td>

                  {/* Last Active */}
                  <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                    {formatDate(user.lastActiveAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectUser(user)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-slate-700/60 hover:border-indigo-500 transition-all inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('admin_view_history')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
