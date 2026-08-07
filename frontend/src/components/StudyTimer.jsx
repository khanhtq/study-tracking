import React, { useState, useEffect, useRef, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sessionApi, getServerClientOffset } from '../api';
import { Play, Square, BookOpen, Clock, Loader2, Coffee, Sparkles, CheckCircle2, Crown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumUpgradeModal from './PremiumUpgradeModal';

const STUDY_METHODS = [
  { id: 'FREE_MODE', icon: '⏱️', labelKey: 'method_free', descKey: 'method_free_desc', focusSeconds: 0, breakSeconds: 0 },
  { id: 'POMODORO_25_5', icon: '🍅', labelKey: 'method_pomodoro_25_5', descKey: 'method_pomodoro_25_5_desc', focusSeconds: 1500, breakSeconds: 300 },
  { id: 'POMODORO_50_10', icon: '🍅', labelKey: 'method_pomodoro_50_10', descKey: 'method_pomodoro_50_10_desc', focusSeconds: 3000, breakSeconds: 600 },
  { id: 'RULE_52_17', icon: '⚡', labelKey: 'method_rule_52_17', descKey: 'method_rule_52_17_desc', focusSeconds: 3120, breakSeconds: 1020, isScientific: true },
  { id: 'DEEP_WORK_90_20', icon: '🧠', labelKey: 'method_deep_work_90_20', descKey: 'method_deep_work_90_20_desc', focusSeconds: 5400, breakSeconds: 1200, isScientific: true },
  { id: 'ACTIVE_RECALL_30_10', icon: '📝', labelKey: 'method_active_recall_30_10', descKey: 'method_active_recall_30_10_desc', focusSeconds: 1800, breakSeconds: 600, isScientific: true },
];

const playBreakChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.25, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  } catch (e) {
    console.warn('Could not play break chime sound:', e);
  }
};

function StudyTimer({ onStopResult }) {
  const { user, activeSession, setActiveSession, refreshProgress } = useAuth();
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('FREE_MODE');
  const [seconds, setSeconds] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // Break state
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(0);
  const [completedMethodForBreak, setCompletedMethodForBreak] = useState(null);

  const timerRef = useRef(null);
  const breakTimerRef = useRef(null);
  const breakEndTimestampRef = useRef(null);
  const autoStopHandledRef = useRef(false);
  const [localOffset, setLocalOffset] = useState(0);

  const currentMethodObj = STUDY_METHODS.find(m => m.id === selectedMethod) || STUDY_METHODS[0];

  // Synchronize method if activeSession restored from backend
  useEffect(() => {
    if (activeSession) {
      if (activeSession.studyMethod) {
        setSelectedMethod(activeSession.studyMethod);
      }
      setSubject(activeSession.subject || '');
      setIsBreakActive(false);
      autoStopHandledRef.current = false;

      const getOffset = () => {
        return localOffset !== 0 ? localOffset : getServerClientOffset();
      };

      const calculateElapsed = () => {
        const start = new Date(activeSession.startedAt).getTime();
        const now = Date.now() - getOffset();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setSeconds(diff);
      };

      calculateElapsed();

      timerRef.current = setInterval(() => {
        const start = new Date(activeSession.startedAt).getTime();
        const now = Date.now() - getOffset();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setSeconds(diff);
      }, 1000);
    } else {
      setSeconds(0);
      setLocalOffset(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession, localOffset]);

  // Check auto-stop & transition to break when target focus time is reached
  useEffect(() => {
    if (!activeSession || autoStopHandledRef.current) return;

    const activeMethodObj = STUDY_METHODS.find(m => m.id === activeSession.studyMethod) || currentMethodObj;
    const targetFocusSeconds = activeSession.targetDurationSeconds || activeMethodObj.focusSeconds;

    if (targetFocusSeconds > 0 && seconds >= targetFocusSeconds) {
      autoStopHandledRef.current = true;
      playBreakChime();

      // Trigger automatic stop and start break mode
      handleStop(true, activeMethodObj);
    }
  }, [seconds, activeSession]);

  // Timestamp-based Break Countdown Timer (Immune to browser background throttling)
  useEffect(() => {
    if (!isBreakActive || !breakEndTimestampRef.current) return;

    const updateBreakTimer = () => {
      const remaining = Math.max(0, Math.ceil((breakEndTimestampRef.current - Date.now()) / 1000));
      setBreakRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsBreakActive(false);
        breakEndTimestampRef.current = null;
        if (breakTimerRef.current) {
          clearInterval(breakTimerRef.current);
        }
      }
    };

    updateBreakTimer();
    breakTimerRef.current = setInterval(updateBreakTimer, 1000);

    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
      }
    };
  }, [isBreakActive]);

  // VisibilityChange listener to instantly sync timers when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (activeSession) {
          const offset = localOffset !== 0 ? localOffset : getServerClientOffset();
          const start = new Date(activeSession.startedAt).getTime();
          const now = Date.now() - offset;
          const diff = Math.max(0, Math.floor((now - start) / 1000));
          setSeconds(diff);
        }

        if (isBreakActive && breakEndTimestampRef.current) {
          const remaining = Math.max(0, Math.ceil((breakEndTimestampRef.current - Date.now()) / 1000));
          setBreakRemainingSeconds(remaining);
          if (remaining <= 0) {
            setIsBreakActive(false);
            breakEndTimestampRef.current = null;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession, localOffset, isBreakActive]);

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    setIsStarting(true);
    setIsBreakActive(false);
    try {
      const clientStartTime = Date.now();
      const targetFocusSecs = currentMethodObj.focusSeconds > 0 ? currentMethodObj.focusSeconds : null;
      const session = await sessionApi.start(subject, currentMethodObj.id, targetFocusSecs);

      const serverStartTime = new Date(session.startedAt).getTime();
      const offset = clientStartTime - serverStartTime;
      setLocalOffset(offset);

      setActiveSession(session);
    } catch (err) {
      console.error(err);
      alert(err.message || t('timer_start_error'));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async (isAutoBreakTransition = false, methodForBreak = currentMethodObj) => {
    if (!activeSession) return;
    setIsStopping(true);
    try {
      const result = await sessionApi.stop(activeSession.id);
      setActiveSession(null);
      await refreshProgress();
      if (onStopResult) {
        onStopResult(result);
      }

      if (isAutoBreakTransition && methodForBreak && methodForBreak.breakSeconds > 0) {
        setCompletedMethodForBreak(methodForBreak);
        breakEndTimestampRef.current = Date.now() + methodForBreak.breakSeconds * 1000;
        setBreakRemainingSeconds(methodForBreak.breakSeconds);
        setIsBreakActive(true);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t('timer_stop_error'));
    } finally {
      setIsStopping(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Determine displayed timer values
  const activeMethodObj = activeSession
    ? (STUDY_METHODS.find(m => m.id === activeSession.studyMethod) || currentMethodObj)
    : currentMethodObj;

  const isCountdown = activeMethodObj.focusSeconds > 0;
  const targetFocusSeconds = activeMethodObj.focusSeconds;
  const displaySeconds = isCountdown
    ? Math.max(0, targetFocusSeconds - seconds)
    : seconds;

  // Calculate SVG Circle progress
  const progressPercent = isCountdown && targetFocusSeconds > 0
    ? Math.min(100, Math.max(0, (seconds / targetFocusSeconds) * 100))
    : 0;

  const circleRadius = 110;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col items-center">
      <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          {t('timer_title')}
        </h3>
        {activeSession && (
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse">
            <span>{activeMethodObj.icon}</span>
            <span>{t(activeMethodObj.labelKey)}</span>
          </span>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Animated ticking display & SVG Progress Ring */}
        <div className="relative w-64 h-64 rounded-full border-4 border-slate-800/80 bg-slate-950 flex flex-col items-center justify-center mb-6 shadow-inner">
          
          {/* SVG Circular Progress Bar for countdown presets */}
          {isCountdown && activeSession && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r={circleRadius}
                className="stroke-slate-800/50"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="120"
                cy="120"
                r={circleRadius}
                className="stroke-indigo-500"
                strokeWidth="8"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'linear' }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
          )}

          {/* Break Mode Visual Ring */}
          {isBreakActive && (
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-4 border-emerald-500/50 pointer-events-none"
            />
          )}

          {/* Glowing pulse rings when active (free mode) */}
          {activeSession && !isCountdown && (
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border border-purple-500/50 pointer-events-none"
            />
          )}

          {/* Time text & Mode status */}
          {isBreakActive ? (
            <div className="flex flex-col items-center z-10">
              <Coffee className="w-8 h-8 text-emerald-400 mb-1 animate-bounce" />
              <span className="font-mono-timer text-4xl font-black text-emerald-300 tracking-tight tabular-nums">
                {formatTime(breakRemainingSeconds)}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-1">
                {t('break_time_title')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center z-10">
              <span className="font-mono-timer text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-indigo-200 tracking-tight tabular-nums">
                {formatTime(displaySeconds)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-2">
                {activeSession ? t('timer_counting') : t('timer_ready')}
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Panels */}
        <AnimatePresence mode="wait">
          {/* BREAK MODE PANEL */}
          {isBreakActive ? (
            <motion.div
              key="break-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full text-center space-y-4"
            >
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4 text-emerald-200 text-sm flex flex-col items-center">
                <p className="font-bold flex items-center gap-2 text-emerald-300 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t('session_completed')}! 🎉
                </p>
                <p className="text-xs text-emerald-400/80">{t('break_time_desc')}</p>
              </div>

              <button
                onClick={() => setIsBreakActive(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 text-white fill-white" />
                <span>Bắt đầu phiên học mới</span>
              </button>
            </motion.div>
          ) : !activeSession ? (
            /* BEFORE START FORM & METHOD SELECTOR */
            <motion.form
              key="start-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleStart}
              className="w-full space-y-4"
            >
              {/* Method Selector Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
                  {t('select_method_title')}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {STUDY_METHODS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    const isLocked = method.isScientific && !user?.isPremium;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            setIsPremiumModalOpen(true);
                          } else {
                            setSelectedMethod(method.id);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                            : isLocked
                            ? 'bg-slate-900/30 border-amber-500/20 text-slate-400 hover:border-amber-500/40'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{method.icon}</span>
                          {method.isScientific ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                              VIP
                            </span>
                          ) : method.focusSeconds > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              +15%
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <div className="font-bold text-xs leading-tight text-slate-100 flex items-center gap-1">
                            <span>{t(method.labelKey)}</span>
                            {isLocked && <Lock className="w-3 h-3 text-amber-400 inline" />}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t(method.descKey)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject Input */}
              <div className="relative">
                <BookOpen className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('timer_input_placeholder')}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Start Button */}
              <button
                type="submit"
                disabled={isStarting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 text-white fill-white" />
                    <span>{t('timer_btn_start')}</span>
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            /* ACTIVE SESSION STOP FORM */
            <motion.div
              key="stop-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full text-center space-y-4"
            >
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 inline-block w-full">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">{t('timer_active_desc')}</span>
                <span className="text-lg font-bold text-indigo-300 block mb-1">
                  {activeSession.subject || t('timer_placeholder')}
                </span>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border border-slate-700">
                    <span>{activeMethodObj.icon}</span>
                    <span>{t(activeMethodObj.labelKey)}</span>
                  </span>
                  {activeMethodObj.focusSeconds > 0 && (
                    <span className="text-[11px] text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full font-bold">
                      {t('bonus_xp_tag')}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleStop(false)}
                disabled={isStopping}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isStopping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4 text-white fill-white" />
                    <span>{t('btn_stop')}</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PremiumUpgradeModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        featureName="Chế độ Đếm giờ Khoa học"
      />
    </div>
  );
}

export default memo(StudyTimer);
