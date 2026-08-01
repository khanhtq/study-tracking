import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Radio, BookOpen, CheckCircle2, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminOverviewCards({ stats, loading }) {
  const { t } = useLanguage();

  const formatHours = (seconds) => {
    if (!seconds) return '0h';
    const hrs = (seconds / 3600).toFixed(1);
    return `${hrs}h`;
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const cardData = [
    {
      title: t('admin_stat_total_users'),
      value: formatNumber(stats?.totalUsers),
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      title: t('admin_stat_online_now'),
      value: formatNumber(stats?.onlineUsersCount),
      icon: Radio,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      badge: stats?.onlineUsersCount > 0 ? 'Live' : null,
    },
    {
      title: t('admin_stat_studying_now'),
      value: formatNumber(stats?.studyingUsersCount),
      icon: BookOpen,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
    {
      title: t('admin_stat_total_sessions'),
      value: formatNumber(stats?.totalSessions),
      icon: CheckCircle2,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    },
    {
      title: t('admin_stat_total_hours'),
      value: formatHours(stats?.totalStudySeconds),
      icon: Clock,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      title: t('admin_stat_total_xp'),
      value: formatNumber(stats?.totalXpDistributed),
      icon: Zap,
      color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cardData.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} border glass-panel flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 truncate pr-1">
                {card.title}
              </span>
              <IconComponent className={`w-4 h-4 shrink-0 ${card.color.split(' ').pop()}`} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 tracking-tight">
                {loading ? '...' : card.value}
              </span>
              {card.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 animate-pulse">
                  {card.badge}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
