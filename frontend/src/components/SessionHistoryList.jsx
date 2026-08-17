import React, { memo, useState, useMemo } from 'react';
import { History, Calendar, Clock, Sparkles, TrendingUp, Lock, UserPlus, Filter, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import StudyCalendar from './StudyCalendar';
import PremiumUpgradeModal from './PremiumUpgradeModal';

const METHOD_CONFIG = {
  FREE_MODE: { icon: '⏱️', labelKey: 'method_free' },
  POMODORO_25_5: { icon: '🍅', labelKey: 'method_pomodoro_25_5' },
  POMODORO_50_10: { icon: '🍅', labelKey: 'method_pomodoro_50_10' },
  RULE_52_17: { icon: '⚡', labelKey: 'method_rule_52_17' },
  DEEP_WORK_90_20: { icon: '🧠', labelKey: 'method_deep_work_90_20' },
  ACTIVE_RECALL_30_10: { icon: '📝', labelKey: 'method_active_recall_30_10' },
};

function SessionHistoryList({ sessions, isGuest, onNavigateRegister }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const [filterType, setFilterType] = useState('ALL');
  const [customDate, setCustomDate] = useState('');

  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return sessions.filter(session => {
      if (!session.startedAt) return true;
      const sessionDate = new Date(session.startedAt);
      const sessionTime = sessionDate.getTime();

      if (filterType === 'TODAY') {
        return sessionTime >= startOfToday;
      }
      if (filterType === 'LAST_7D') {
        const sevenDaysAgo = startOfToday - (6 * 24 * 60 * 60 * 1000);
        return sessionTime >= sevenDaysAgo;
      }
      if (filterType === 'LAST_30D') {
        const thirtyDaysAgo = startOfToday - (29 * 24 * 60 * 60 * 1000);
        return sessionTime >= thirtyDaysAgo;
      }
      if (filterType === 'CUSTOM' && customDate) {
        const [year, month, day] = customDate.split('-').map(Number);
        return (
          sessionDate.getFullYear() === year &&
          (sessionDate.getMonth() + 1) === month &&
          sessionDate.getDate() === day
        );
      }
      return true;
    });
  }, [sessions, filterType, customDate]);
  
  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    
    return parts.join(' ');
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const localeMap = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
      const locale = localeMap[language] || 'vi-VN';
      return date.toLocaleString(locale, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Group by day for the chart data
  const getChartData = () => {
    const dailyData = {};
    
    // Process sessions in chronological order
    [...sessions].reverse().forEach(session => {
      if (!session.endedAt) return;
      const date = new Date(session.startedAt);
      const localeMap = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
      const locale = localeMap[language] || 'vi-VN';
      const dayKey = date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
      
      const durationMins = Math.round(session.durationSeconds / 60);
      dailyData[dayKey] = (dailyData[dayKey] || 0) + durationMins;
    });

    const result = Object.entries(dailyData).map(([date, mins]) => ({
      date,
      [t('chart_minutes_label')]: mins,
    })).slice(-7);

    // If guest and no data yet, create mock placeholder data for visual blur effect
    if (result.length === 0 && isGuest) {
      return [
        { date: 'T2', [t('chart_minutes_label')]: 45 },
        { date: 'T3', [t('chart_minutes_label')]: 60 },
        { date: 'T4', [t('chart_minutes_label')]: 30 },
        { date: 'T5', [t('chart_minutes_label')]: 90 },
        { date: 'T6', [t('chart_minutes_label')]: 75 },
        { date: 'T7', [t('chart_minutes_label')]: 120 },
        { date: 'CN', [t('chart_minutes_label')]: 50 },
      ];
    }

    return result;
  };

  const chartData = getChartData();

  return (
    <div className="w-full space-y-6">
      {/* 7-Day Stats & Heatmap Container with Blur Overlay for Guests */}
      <div className="relative space-y-6">
        {/* 7-Day Visual Chart Panel with Premium / Guest Blur Overlay */}
        {(sessions.length > 0 || isGuest || !user?.isPremium) && (
          <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                {t('chart_title')}
              </h3>
              {!user?.isPremium && !isGuest && (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {t('chart_vip_feature_tag')}
                </span>
              )}
            </div>
            
            <div className="relative">
              <div className={`w-full h-48 mt-2 transition-all duration-300 ${!user?.isPremium || isGuest ? 'filter blur-md opacity-30 select-none pointer-events-none' : ''}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#F4F4F5', 
                        borderColor: theme === 'dark' ? '#334155' : '#D1D5DB', 
                        borderRadius: '12px',
                        color: theme === 'dark' ? '#f1f5f9' : '#1F2937'
                      }}
                      labelStyle={{ color: theme === 'dark' ? '#94a3b8' : '#4B5563', fontWeight: 'bold' }}
                    />
                    <Bar dataKey={t('chart_minutes_label')} fill="url(#colorMinutes)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Premium Lock Overlay for Non-Premium User */}
              {!user?.isPremium && !isGuest && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md rounded-2xl border border-amber-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Crown className="w-7 h-7 text-slate-950 fill-slate-950" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">
                      {t('chart_lock_title')}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                      {t('chart_lock_desc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPremiumModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Crown className="w-4 h-4 fill-slate-950" />
                    <span>{t('chart_lock_upgrade_btn')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GitHub-style Study Calendar */}
        <div className={`transition-all duration-300 ${isGuest ? 'filter blur-md opacity-40 select-none pointer-events-none' : ''}`}>
          <StudyCalendar sessions={sessions} />
        </div>

        {/* Overlay for Guest Users */}
        {isGuest && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-3xl bg-slate-950/70 backdrop-blur-lg border border-indigo-500/20 shadow-2xl">
            <div className="max-w-md w-full text-center flex flex-col items-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
                <Lock className="w-8 h-8 text-white" />
              </div>

              <h4 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end tracking-tight">
                {t('guest_overlay_title')}
              </h4>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {t('guest_overlay_desc')}
              </p>

              <button
                onClick={onNavigateRegister}
                className="mt-2 flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer"
              >
                <UserPlus className="w-4.5 h-4.5" />
                <span>{t('guest_register_cta')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History List Panel with Filter Bar */}
      <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            {t('history_title')}
          </h3>

          {/* Date Filter Controls */}
          {sessions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                {t('filter_title')}
              </span>
              
              <button
                onClick={() => { setFilterType('ALL'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('filter_all')}
              </button>

              <button
                onClick={() => { setFilterType('TODAY'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === 'TODAY'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('filter_today')}
              </button>

              <button
                onClick={() => { setFilterType('LAST_7D'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === 'LAST_7D'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('filter_7d')}
              </button>

              <button
                onClick={() => { setFilterType('LAST_30D'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === 'LAST_30D'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('filter_30d')}
              </button>

              {/* Custom Date Picker */}
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setFilterType('CUSTOM');
                }}
                className={`bg-slate-900/60 border rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all ${
                  filterType === 'CUSTOM' ? 'border-indigo-500 text-indigo-300 font-bold' : 'border-slate-800'
                }`}
              />
            </div>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium">{t('no_sessions')}</p>
            <p className="text-xs text-slate-600 mt-1">{t('no_sessions_subtitle')}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium">{t('no_filtered_sessions')}</p>
            <button
              onClick={() => { setFilterType('ALL'); setCustomDate(''); }}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
            >
              {t('filter_all')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F9FAFB] dark:bg-slate-900/40 border border-[#E5E7EB] dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm truncate">
                      {session.subject || t('timer_placeholder')}
                    </span>
                    
                    {session.studyMethod && METHOD_CONFIG[session.studyMethod] && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <span>{METHOD_CONFIG[session.studyMethod].icon}</span>
                        <span>{t(METHOD_CONFIG[session.studyMethod].labelKey)}</span>
                      </span>
                    )}

                    {session.isCompleted && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span>🎉 +15% XP</span>
                      </span>
                    )}

                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      session.source === 'TIMER' 
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30' 
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {session.source === 'TIMER' ? t('source_timer') : t('source_manual')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {formatDuration(session.durationSeconds)}
                    </span>
                    <span>•</span>
                    <span>{formatDate(session.startedAt)}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {session.xpEarned !== null ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      +{session.xpEarned} XP
                    </span>
                  ) : (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                      {t('timer_counting')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PremiumUpgradeModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        featureName="Biểu đồ Phân tích 7 Ngày"
      />
    </div>
  );
}

export default memo(SessionHistoryList);
