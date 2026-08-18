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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0"
      />

      {/* Modal Window */}
      <div className="relative w-full max-w-2xl h-[580px] max-h-[85vh] glass-panel bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-modal-enter transform-gpu">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2">
                <span>{t('dashboard_customizer_title')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {visibleCount}/{totalCount}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('dashboard_customizer_desc')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Widget Toggles List */}
        <div className="p-6 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
          {WIDGET_CONFIGS.map((widget) => {
            const Icon = widget.icon;
            const isVisible = widgetVisibility[widget.id] ?? true;

            return (
              <div
                key={widget.id}
                onClick={() => onToggleWidget(widget.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none ${
                  isVisible
                    ? 'bg-slate-950/70 border-slate-800 hover:bg-slate-950 hover:border-indigo-500/40 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${widget.color} flex items-center justify-center text-white shadow-sm shrink-0 transition-opacity duration-150 ${
                      !isVisible ? 'grayscale filter opacity-60' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 truncate">
                      {t(widget.nameKey)}
                      {!isVisible && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                          {t('widget_hidden_badge')}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {t(widget.descKey)}
                    </p>
                  </div>
                </div>

                {/* Custom Toggle Switch (Pure CSS Hardware Accelerated) */}
                <div className="flex items-center gap-2 pl-3 shrink-0">
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-indigo-400 hidden sm:block" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-500 hidden sm:block" />
                  )}

                  <div
                    className={`relative inline-flex h-6 w-11 shrink-0 p-0.5 rounded-full transition-colors duration-200 ease-out cursor-pointer ${
                      isVisible ? 'bg-indigo-600 shadow-sm shadow-indigo-600/30' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transform transition-transform duration-200 ease-out ${
                        isVisible ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={onResetDefault}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('reset_default')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            {t('save_and_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
