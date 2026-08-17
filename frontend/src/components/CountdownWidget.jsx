import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Settings, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ChevronDown, 
  Users, 
  Pin, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';

export default function CountdownWidget({ 
  activeCountdown, 
  presets = [], 
  events = [], 
  onOpenManage, 
  onSelectEvent,
  onPinEvent 
}) {
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
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [activeCountdown?.targetDate]);

  if (!activeCountdown || !activeCountdown.targetDate) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[300px] text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Calendar className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          {t('countdown_select_event_prompt')}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          {t('countdown_subtitle')}
        </p>
        <button
          onClick={onOpenManage}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <Calendar className="w-4 h-4" />
          {t('countdown_select_event_btn')}
        </button>
      </div>
    );
  }

  // Build the list of all tracked events
  const trackedMap = new Map();
  events.forEach((e) => {
    const key = e.id || e.presetExamCode || e.title;
    if (key) trackedMap.set(key, e);
  });
  if (activeCountdown) {
    const activeKey = activeCountdown.id || activeCountdown.presetExamCode || activeCountdown.title;
    if (activeKey && !trackedMap.has(activeKey)) {
      trackedMap.set(activeKey, activeCountdown);
    }
  }
  const allEvents = Array.from(trackedMap.values());

  const matchedPreset = presets.find(p => p.examCode === activeCountdown?.presetExamCode || p.title === activeCountdown?.title);
  const rawTrackerCount = activeCountdown?.trackerCount ?? matchedPreset?.trackerCount ?? 0;
  const displayTrackerCount = Math.max(1, rawTrackerCount);

  // Check if current active event is pinned
  const isCurrentlyPinned = Boolean(
    activeCountdown.isPinned || 
    events.find(e => (e.id === activeCountdown.id || (e.presetExamCode && e.presetExamCode === activeCountdown.presetExamCode)) && e.isPinned)
  );

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

  const currentIndex = allEvents.findIndex(e => 
    e.id === activeCountdown.id || 
    (e.presetExamCode && e.presetExamCode === activeCountdown.presetExamCode) || 
    e.title === activeCountdown.title
  );

  const handlePrevEvent = () => {
    if (allEvents.length <= 1) return;
    const nextIdx = (currentIndex - 1 + allEvents.length) % allEvents.length;
    onSelectEvent(allEvents[nextIdx]);
  };

  const handleNextEvent = () => {
    if (allEvents.length <= 1) return;
    const nextIdx = (currentIndex + 1) % allEvents.length;
    onSelectEvent(allEvents[nextIdx]);
  };

  const handlePinCurrentEvent = () => {
    if (onPinEvent && activeCountdown) {
      onPinEvent(activeCountdown.id || activeCountdown.presetExamCode);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative group">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-30">
        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-left group/btn focus:outline-none max-w-full cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 block">
                  {t('countdown_widget_title')}
                </span>
                {allEvents.length > 1 && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-mono">
                    {currentIndex + 1}/{allEvents.length}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover/btn:text-indigo-300 transition-colors flex items-center gap-1.5 truncate">
                <span className="truncate">{getTranslatedTitle(activeCountdown)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 group-hover/btn:text-indigo-300 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </h3>
            </div>
          </button>

          {/* Quick Event Switcher Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 py-1 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 flex items-center justify-between">
                <span>{t('countdown_my_events')}</span>
                <span className="text-[10px] font-mono font-normal text-slate-500">
                  {allEvents.length} {t('countdown_filter_all').toLowerCase()}
                </span>
              </div>

              {allEvents.map((item) => {
                const isActive = (item.id === activeCountdown.id || (item.presetExamCode && item.presetExamCode === activeCountdown.presetExamCode) || item.title === activeCountdown.title);
                const isItemPinned = Boolean(item.isPinned);

                return (
                  <div
                    key={item.id || item.presetExamCode}
                    className={`w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-indigo-400 font-semibold bg-indigo-500/10 border-l-2 border-indigo-500'
                        : 'text-slate-200'
                    }`}
                    onClick={() => {
                      onSelectEvent(item);
                      setDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {isItemPinned ? (
                        <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" title={t('countdown_pinned_tooltip')} />
                      ) : (
                        <div className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{getTranslatedTitle(item)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isOfficialDate && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono shrink-0">
                          Official
                        </span>
                      )}
                      {!isItemPinned && onPinEvent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinEvent(item.id || item.presetExamCode);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-700/50 rounded transition-colors"
                          title={t('countdown_pin_to_widget')}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="p-2 border-t border-slate-800 bg-slate-950/40">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenManage();
                  }}
                  className="w-full py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('countdown_manage_btn')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Pin / Pinned Indicator Button */}
          {isCurrentlyPinned ? (
            <div 
              className="p-2 text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-1 cursor-default"
              title={t('countdown_pinned_tooltip')}
            >
              <Pin className="w-4 h-4 fill-amber-400" />
            </div>
          ) : (
            <button
              onClick={handlePinCurrentEvent}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title={t('countdown_pin_tooltip')}
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('countdown_pin_to_widget')}</span>
            </button>
          )}

          {/* Quick Carousel Prev/Next if user tracks multiple events */}
          {allEvents.length > 1 && (
            <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-xl p-0.5">
              <button
                onClick={handlePrevEvent}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                title="Sự kiện trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextEvent}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                title="Sự kiện tiếp theo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onOpenManage}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all cursor-pointer"
            title={t('countdown_manage_btn')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Status Line */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 relative z-10 flex-wrap">
        <span className="truncate">{formattedDate}</span>
        {activeCountdown.isOfficialDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            {t('countdown_official_badge')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold shrink-0">
            <RefreshCw className="w-3 h-3 animate-spin-slow text-amber-600 dark:text-amber-400" />
            {t('countdown_estimated_badge')}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold shrink-0">
          <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          {displayTrackerCount} {t('countdown_trackers_count_suffix')}
        </span>
      </div>

      {/* Main Countdown Digit Grid */}
      <div className="my-6 grid grid-cols-4 gap-2 text-center relative z-10">
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_days')}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_hours')}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {t('countdown_minutes')}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-inner">
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
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
