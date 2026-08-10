import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Settings, Calendar, CheckCircle2, RefreshCw, ChevronDown } from 'lucide-react';

export default function CountdownWidget({ activeCountdown, presets = [], events = [], onOpenManage, onSelectEvent }) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeCountdown?.targetDate) return;

    const calculate = () => {
      const target = new Date(activeCountdown.targetDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [activeCountdown?.targetDate]);

  if (!activeCountdown) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[300px] text-center">
        <Calendar className="w-10 h-10 text-indigo-400 mb-3 opacity-60" />
        <h3 className="text-lg font-semibold text-slate-200">{t('countdown_widget_title')}</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">{t('countdown_empty')}</p>
        <button
          onClick={onOpenManage}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          {t('countdown_add_new')}
        </button>
      </div>
    );
  }

  // Combined options for quick switcher
  const allEvents = [...events];
  presets.forEach(p => {
    if (!allEvents.some(e => e.presetExamCode === p.examCode || e.title === p.title)) {
      allEvents.push({
        id: `preset_${p.examCode}`,
        title: p.title,
        targetDate: p.targetDate,
        isOfficialDate: p.isOfficialDate,
        presetExamCode: p.examCode,
        color: p.color
      });
    }
  });

  const formattedDate = new Date(activeCountdown.targetDate).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getTranslatedTitle = (item) => {
    if (item?.presetExamCode) {
      const key = `${item.presetExamCode}_title`;
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return item?.title || '';
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative">
      {/* Background Subtle Gradient Glow (clipped safely inside inner overlay) */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-30">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 block">
                {t('countdown_widget_title')}
              </span>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                {getTranslatedTitle(activeCountdown)}
                <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-indigo-300 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </h3>
            </div>
          </button>

          {/* Quick Event Switcher Dropdown - Fix overflow clipping */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 py-1 max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
                {t('countdown_select_preset')}
              </div>
              {allEvents.map((item) => (
                <button
                  key={item.id || item.presetExamCode}
                  onClick={() => {
                    onSelectEvent(item);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                    (item.id === activeCountdown.id || item.presetExamCode === activeCountdown.presetExamCode)
                      ? 'text-indigo-400 font-semibold bg-indigo-500/10 border-l-2 border-indigo-500'
                      : 'text-slate-200'
                  }`}
                >
                  <span className="truncate pr-2">{getTranslatedTitle(item)}</span>
                  {item.isOfficialDate && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono shrink-0">
                      Official
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onOpenManage}
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all"
          title={t('countdown_manage_btn')}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Target Status Line */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 relative z-10">
        <span className="truncate">{formattedDate}</span>
        {activeCountdown.isOfficialDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            {t('countdown_official_badge')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            {t('countdown_estimated_badge')}
          </span>
        )}
      </div>

      {/* Main Countdown Digit Grid */}
      <div className="my-6 grid grid-cols-4 gap-2 text-center relative z-10">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_days')}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_hours')}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_minutes')}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_seconds')}
          </div>
        </div>
      </div>

      {/* Motivational Note footer */}
      <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between relative z-10">
        {timeLeft.days > 30 ? (
          <span>{t('countdown_quote_normal')}</span>
        ) : timeLeft.days > 7 ? (
          <span className="text-amber-300 font-medium">{t('countdown_quote_warning')}</span>
        ) : (
          <span className="text-rose-400 font-semibold">{t('countdown_quote_urgent')}</span>
        )}
      </div>
    </div>
  );

}
