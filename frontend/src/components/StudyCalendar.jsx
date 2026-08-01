import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Flame, Trophy } from 'lucide-react';

function StudyCalendar({ sessions }) {
  const { language, t } = useLanguage();
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [selectedYear, setSelectedYear] = useState('lastYear');
  
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollToRight = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    };

    // Scroll immediately
    scrollToRight();

    // Scroll after a small timeout to guarantee layout calculations are complete
    const timeoutId = setTimeout(scrollToRight, 50);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, sessions]);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  // Dynamically compute available years based on sessions history
  const getAvailableYears = () => {
    const years = new Set();
    
    sessions.forEach(session => {
      if (session.startedAt) {
        const year = new Date(session.startedAt).getFullYear();
        years.add(year);
      }
    });

    // Fallback: If no sessions exist yet, show the current year
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }

    return Array.from(years).sort((a, b) => b - a);
  };

  const availableYears = getAvailableYears();

  // Calculate gridStartDate and gridEndDate based on selectedYear
  let gridStartDate, gridEndDate;

  if (selectedYear === 'lastYear') {
    const todayDayOfWeek = today.getDay();
    gridEndDate = new Date(today);
    gridEndDate.setDate(today.getDate() + (6 - todayDayOfWeek));
    gridStartDate = new Date(gridEndDate);
    gridStartDate.setDate(gridEndDate.getDate() - 370);
  } else {
    const year = parseInt(selectedYear, 10);
    // Start Sunday of the week of Jan 1st of that year
    const yearStart = new Date(year, 0, 1);
    const startDayOfWeek = yearStart.getDay();
    gridStartDate = new Date(yearStart);
    gridStartDate.setDate(yearStart.getDate() - startDayOfWeek);

    // End Saturday of the week of Dec 31st of that year
    const yearEnd = new Date(year, 11, 31);
    const endDayOfWeek = yearEnd.getDay();
    gridEndDate = new Date(yearEnd);
    gridEndDate.setDate(yearEnd.getDate() + (6 - endDayOfWeek));
  }

  // Group session durations & XP by date (YYYY-MM-DD)
  const sessionsByDate = {};
  sessions.forEach(session => {
    if (!session.endedAt) return; // Skip active session
    const date = new Date(session.startedAt);
    const dateString = date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    
    if (!sessionsByDate[dateString]) {
      sessionsByDate[dateString] = {
        durationSeconds: 0,
        xpEarned: 0,
      };
    }
    sessionsByDate[dateString].durationSeconds += session.durationSeconds;
    sessionsByDate[dateString].xpEarned += (session.xpEarned || 0);
  });

  // Generate days in the range
  const days = [];
  let current = new Date(gridStartDate);
  while (current <= gridEndDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Chunk days into weeks
  const weeks = [];
  const numWeeks = Math.ceil(days.length / 7);
  for (let i = 0; i < numWeeks; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  // Statistics calculation
  let totalActiveDays = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalDurationSeconds = 0;

  // We only count stats up to the end date of the grid or today, whichever is earlier
  const statsLimitDate = gridEndDate < today ? gridEndDate : today;

  const activeDaysSet = new Set();
  let dateCursor = new Date(gridStartDate);

  while (dateCursor <= statsLimitDate) {
    const dateStr = dateCursor.toLocaleDateString('en-CA');
    const dayData = sessionsByDate[dateStr];
    const hasStudy = dayData && dayData.durationSeconds > 0;
    
    if (hasStudy) {
      activeDaysSet.add(dateStr);
      totalDurationSeconds += dayData.durationSeconds;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  totalActiveDays = activeDaysSet.size;

  // Calculate current streak
  const rangeContainsToday = today >= gridStartDate && today <= gridEndDate;
  if (rangeContainsToday) {
    if (activeDaysSet.has(todayStr)) {
      let checkDate = new Date(today);
      while (activeDaysSet.has(checkDate.toLocaleDateString('en-CA'))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (activeDaysSet.has(yesterdayStr)) {
      let checkDate = new Date(yesterday);
      while (activeDaysSet.has(checkDate.toLocaleDateString('en-CA'))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      currentStreak = 0;
    }
  } else {
    currentStreak = 0;
  }

  const formatTotalDuration = (totalSecs) => {
    const hours = Math.round(totalSecs / 3600);
    return `${hours} ${t('hours')}`;
  };

  const getMonthLabels = () => {
    const labels = [];
    let lastRenderedIndex = -1;

    const candidates = [];
    weeks.forEach((week, index) => {
      const month = week[0].getMonth();
      const prevWeek = weeks[index - 1];
      const isMonthChange = !prevWeek || month !== prevWeek[0].getMonth();
      if (isMonthChange) {
        candidates.push({ index, date: week[0] });
      }
    });

    let startIndex = 0;
    if (candidates.length > 1 && candidates[1].index - candidates[0].index < 3) {
      startIndex = 1;
    }

    const localeMap = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
    const locale = localeMap[language] || 'vi-VN';

    for (let i = startIndex; i < candidates.length; i++) {
      const cand = candidates[i];
      if (lastRenderedIndex === -1 || cand.index - lastRenderedIndex >= 3) {
        labels.push({
          index: cand.index,
          text: cand.date.toLocaleString(locale, { month: 'short' }),
        });
        lastRenderedIndex = cand.index;
      }
    }

    return labels;
  };

  const monthLabels = getMonthLabels();

  // Get Level 0 - 4 based on study duration:
  // Level 0: 0s (No study activity)
  // Level 1: >0s to <1 hour (0 to <3600s) -> Lightest color for any study activity
  // Level 2: 1 hour to <2 hours (3600s to <7200s) -> Next color step after 1 hour
  // Level 3: 2 hours to <3 hours (7200s to <10800s) -> Next color step after 2 hours
  // Level 4: 3 hours or more (>=10800s) -> Darkest / highest intensity color
  const getLevel = (durationSeconds) => {
    if (!durationSeconds || durationSeconds <= 0) return 0;
    const hours = durationSeconds / 3600;
    if (hours < 1) return 1;
    if (hours < 2) return 2;
    if (hours < 3) return 3;
    return 4;
  };

  const getCellClass = (level, isFuture) => {
    if (isFuture) {
      return 'w-[11px] h-[11px] rounded-[2px] bg-transparent border border-transparent cursor-default pointer-events-none';
    }
    
    const common = 'w-[11px] h-[11px] rounded-[2px] transition-colors duration-150 cursor-pointer';
    
    switch (level) {
      case 0:
        return `${common} bg-[#ebedf0] border border-[#e1e4e8] dark:bg-[#161b22] dark:border-[#1b212a] hover:bg-[#d0d3d6] dark:hover:bg-[#222831]`;
      case 1:
        return `${common} bg-[#9be9a8] border border-[#8cd998] dark:bg-[#0e4429] dark:border-[#0c3d25] hover:bg-[#8ade98] dark:hover:bg-[#125434]`;
      case 2:
        return `${common} bg-[#40c463] border border-[#3ab35a] dark:bg-[#006d32] dark:border-[#00622d] hover:bg-[#37b859] dark:hover:bg-[#00813c]`;
      case 3:
        return `${common} bg-[#30a14e] border border-[#2b9146] dark:bg-[#26a641] dark:border-[#22953a] hover:bg-[#2a9146] dark:hover:bg-[#2cbd4b]`;
      case 4:
        return `${common} bg-[#216e39] border border-[#1d6333] dark:bg-[#39d353] dark:border-[#33be4b] hover:bg-[#1c5d30] dark:hover:bg-[#51e069]`;
      default:
        return `${common} bg-[#ebedf0] border border-[#e1e4e8] dark:bg-[#161b22] dark:border-[#1b212a]`;
    }
  };

  const handleMouseEnter = (e, day, data) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const localeMap = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
    const locale = localeMap[language] || 'vi-VN';
    const dateStr = day.toLocaleDateString(locale, options);
    
    let content;
    if (!data || data.durationSeconds === 0) {
      content = (
        <div className="space-y-1">
          <div className="font-bold text-slate-300">{dateStr}</div>
          <div className="text-slate-500">{t('no_study_time')}</div>
        </div>
      );
    } else {
      const mins = Math.round(data.durationSeconds / 60);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      const durationStr = hours > 0 ? `${hours}h ${remainingMins}m` : `${mins} ${t('minutes')}`;
      
      const level = getLevel(data.durationSeconds);
      const levelTierMap = {
        1: '< 1h',
        2: '1h - 2h',
        3: '2h - 3h',
        4: '≥ 3h',
      };

      content = (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1">
            <span className="font-bold text-slate-200">{dateStr}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {levelTierMap[level]}
            </span>
          </div>
          <div className="text-indigo-300 font-semibold text-xs pt-0.5">{t('duration')}: {durationStr}</div>
          <div className="text-emerald-400 font-bold text-xs">+{data.xpEarned} XP</div>
        </div>
      );
    }

    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      content,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const weekdayLabels = t('weekdays') || ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          {t('calendar_title')}
        </h3>
        
        {/* Year Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800/40 p-1 border border-slate-700/30 rounded-xl">
          <button
            onClick={() => setSelectedYear('lastYear')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedYear === 'lastYear'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('one_year_past')}
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year.toString())}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedYear === year.toString()
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Grid container with responsive horizontal scrolling */}
      <div ref={scrollRef} className="w-full overflow-x-auto pb-4 pt-2 scrollbar-thin select-none">
        <div className="min-w-[700px] flex">
          {/* Day of Week Labels */}
          <div className="flex flex-col gap-[3px] text-[9px] text-slate-400 mr-2 mt-[20px] shrink-0 font-medium">
            {weekdayLabels.map((dayLabel, idx) => (
              <div key={idx} className="h-[11px] flex items-center">{dayLabel}</div>
            ))}
          </div>

          {/* Calendar Area */}
          <div className="flex-1">
            {/* Month Labels */}
            <div className="grid grid-flow-col auto-cols-max gap-[3px] text-[9px] text-slate-400 mb-1 h-4 relative">
              {weeks.map((_, index) => {
                const label = monthLabels.find(l => l.index === index);
                
                return (
                  <div key={index} className="w-[11px] relative">
                    {label && (
                      <span className="absolute left-0 bottom-0 whitespace-nowrap font-medium">
                        {label.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid Cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    const dateStr = day.toLocaleDateString('en-CA');
                    const isFuture = dateStr > todayStr;
                    const dayData = sessionsByDate[dateStr];
                    const level = getLevel(dayData?.durationSeconds || 0);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={getCellClass(level, isFuture)}
                        onMouseEnter={(e) => !isFuture && handleMouseEnter(e, day, dayData)}
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Help Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-b border-slate-800/40 pb-4">
        <span>{t('hover_tip')}</span>
        <div className="flex items-center gap-1">
          <span>{t('legend_less')}</span>
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[#ebedf0] border border-[#e1e4e8] dark:bg-[#161b22] dark:border-[#1b212a]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[#9be9a8] border border-[#8cd998] dark:bg-[#0e4429] dark:border-[#0c3d25]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[#40c463] border border-[#3ab35a] dark:bg-[#006d32] dark:border-[#00622d]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[#30a14e] border border-[#2b9146] dark:bg-[#26a641] dark:border-[#22953a]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[#216e39] border border-[#1d6333] dark:bg-[#39d353] dark:border-[#33be4b]" />
          <span>{t('legend_more')}</span>
        </div>
      </div>

      {/* Streak Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        {/* Total Days */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">{t('total_active_days')}</span>
            <span className="text-sm font-bold text-slate-200">{totalActiveDays} {t('days')}</span>
          </div>
        </div>

        {/* Second Stat Card */}
        {selectedYear === 'lastYear' || selectedYear === new Date().getFullYear().toString() ? (
          /* Current Streak */
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400/10 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">{t('current_streak')}</span>
              <span className="text-sm font-bold text-slate-200">{currentStreak} {t('days')}</span>
            </div>
          </div>
        ) : (
          /* Total Duration */
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400/10" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">{t('total_duration')}</span>
              <span className="text-sm font-bold text-slate-200">{formatTotalDuration(totalDurationSeconds)}</span>
            </div>
          </div>
        )}

        {/* Third Stat Card (Longest Streak) */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
              {selectedYear === 'lastYear' || selectedYear === new Date().getFullYear().toString() ? t('longest_streak') : t('longest_streak_year')}
            </span>
            <span className="text-sm font-bold text-slate-200">{longestStreak} {t('days')}</span>
          </div>
        </div>
      </div>

      {/* Viewport fixed Tooltip portal rendering */}
      {tooltip.visible && createPortal(
        <div
          className="fixed z-[9999] bg-slate-950/95 border border-slate-800/90 text-slate-200 text-xs rounded-2xl p-3 shadow-2xl pointer-events-none backdrop-blur-md transition-all duration-75 max-w-[220px]"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 12}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(StudyCalendar);
