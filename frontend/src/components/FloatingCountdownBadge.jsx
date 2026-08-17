import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Clock, ChevronUp } from 'lucide-react';

export default function FloatingCountdownBadge({ activeCountdown, onClick }) {
  const { t } = useLanguage();
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (!activeCountdown?.targetDate) return;

    const calculate = () => {
      const target = new Date(activeCountdown.targetDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      setDaysRemaining(days);
    };

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [activeCountdown?.targetDate]);

  if (!activeCountdown) return null;

  const titleText = activeCountdown.presetExamCode && t(`${activeCountdown.presetExamCode}_title`) !== `${activeCountdown.presetExamCode}_title`
    ? t(`${activeCountdown.presetExamCode}_title`)
    : activeCountdown.title;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onClick}
        className="group bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-indigo-500/40 hover:border-indigo-400 text-slate-100 shadow-2xl shadow-indigo-950/60 px-3 sm:px-4 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:scale-[1.03]"
        title={`${titleText} - ${t('countdown_manage_btn')}`}
      >
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
        
        <span className="hidden sm:inline text-xs font-bold text-slate-100 truncate max-w-[160px]">
          {titleText}
        </span>

        <div className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
          {daysRemaining} {t('countdown_days')}
        </div>

        <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform group-hover:-translate-y-0.5 shrink-0" />
      </button>
    </div>
  );


}
