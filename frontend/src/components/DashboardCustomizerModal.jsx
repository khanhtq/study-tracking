import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, Eye, EyeOff, RotateCcw, Sparkles, Clock, FilePlus, Users, Calendar, History, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const WIDGET_CONFIGS = [
  {
    id: 'xpBar',
    nameKey: 'widget_xpBar_name',
    descKey: 'widget_xpBar_desc',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'studyTimer',
    nameKey: 'widget_studyTimer_name',
    descKey: 'widget_studyTimer_desc',
    icon: Clock,
    color: 'from-indigo-500 to-purple-600',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'manualSession',
    nameKey: 'widget_manualSession_name',
    descKey: 'widget_manualSession_desc',
    icon: FilePlus,
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'onlineUsers',
    nameKey: 'widget_onlineUsers_name',
    descKey: 'widget_onlineUsers_desc',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'trendingGroups',
    nameKey: 'widget_trendingGroups_name',
    descKey: 'widget_trendingGroups_desc',
    icon: MessageSquare,
    color: 'from-amber-500 to-rose-600',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'countdown',
    nameKey: 'widget_countdown_name',
    descKey: 'widget_countdown_desc',
    icon: Calendar,
    color: 'from-rose-500 to-pink-600',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'sessionHistory',
    nameKey: 'widget_sessionHistory_name',
    descKey: 'widget_sessionHistory_desc',
    icon: History,
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-500/30',
  },
];

export const DEFAULT_WIDGET_VISIBILITY = {
  xpBar: true,
  studyTimer: true,
  manualSession: true,
  onlineUsers: true,
  trendingGroups: true,
  countdown: true,
  sessionHistory: true,
};

export default function DashboardCustomizerModal({
  isOpen,
  onClose,
  widgetVisibility = DEFAULT_WIDGET_VISIBILITY,
  onToggleWidget,
  onResetDefault,
}) {
  const { t } = useLanguage();

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const visibleCount = Object.values(widgetVisibility || {}).filter(Boolean).length;
  const totalCount = WIDGET_CONFIGS.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.7 }}
            className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-800/80 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden backdrop-blur-xl z-10 my-auto transform-gpu"
          >
            {/* Top Decorative Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-slate-800/80 flex items-center justify-between gap-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                    <span>{t('dashboard_customizer_title')}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {visibleCount}/{totalCount}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    {t('dashboard_customizer_desc')}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Widget Toggles List */}
            <div className="p-6 sm:p-8 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {WIDGET_CONFIGS.map((widget) => {
                const Icon = widget.icon;
                const isVisible = widgetVisibility[widget.id] ?? true;

                return (
                  <motion.div
                    key={widget.id}
                    whileHover={{ scale: 1.008 }}
                    whileTap={{ scale: 0.992 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onToggleWidget(widget.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-200 cursor-pointer select-none ${
                      isVisible
                        ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-indigo-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/40 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${widget.color} flex items-center justify-center text-white shadow-md shrink-0 transition-all duration-200 ${
                          !isVisible ? 'grayscale filter opacity-60' : ''
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          {t(widget.nameKey)}
                          {!isVisible && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                              {t('widget_hidden_badge')}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {t(widget.descKey)}
                        </p>
                      </div>
                    </div>

                    {/* Custom Toggle Switch */}
                    <div className="flex items-center gap-2 pl-4">
                      {isVisible ? (
                        <Eye className="w-4 h-4 text-indigo-400 hidden sm:block" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-500 hidden sm:block" />
                      )}

                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 p-0.5 rounded-full transition-colors duration-200 ease-in-out ${
                          isVisible ? 'bg-indigo-600 shadow-md shadow-indigo-600/30' : 'bg-slate-800'
                        }`}
                      >
                        <motion.span
                          animate={{ x: isVisible ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onResetDefault}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>{t('reset_default')}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                {t('save_and_close')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
