import React, { useState, useEffect, memo } from 'react';
import { sessionApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Play, Pause, Trash2, Plus, BookOpen, Clock, Loader2, CheckCircle2, Award, X, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ManualSessionForm({ onSuccess }) {
  const { user, refreshProgress } = useAuth();
  const { t } = useLanguage();
  const [goals, setGoals] = useState([]);
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [error, setError] = useState('');
  const [syncingGoalId, setSyncingGoalId] = useState(null);

  // Helper to format duration to string (e.g., 1h 30m 15s)
  const formatDurationText = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h} ${t('hour')}`);
    if (m > 0) parts.push(`${m} ${t('minute')}`);
    if (s > 0 || parts.length === 0) parts.push(`${s} ${t('second')}`);
    return parts.join(' ');
  };

  // Helper to format remaining time to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) {
      parts.push(h.toString().padStart(2, '0'));
    }
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
  };

  // 1. Load goals from localStorage on mount/user change
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`study_goals_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Check if any goals were running and if they should have finished while user was away
          const updated = parsed.map(goal => {
            if (goal.status === 'running' && goal.targetCompletionTime) {
              const now = Date.now();
              const rem = Math.max(0, Math.ceil((goal.targetCompletionTime - now) / 1000));
              if (rem === 0) {
                // Goal finished while user was away
                return { ...goal, remainingSeconds: 0, status: 'completed_pending_sync' };
              } else {
                return { ...goal, remainingSeconds: rem };
              }
            }
            return goal;
          });
          setGoals(updated);
        } catch (e) {
          console.error('Failed to parse stored goals:', e);
        }
      }
    }
  }, [user?.id]);

  // 2. Save goals to localStorage when they change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`study_goals_${user.id}`, JSON.stringify(goals));
    }
  }, [goals, user?.id]);

  // 3. Sync goals that finished while away
  useEffect(() => {
    const syncPendingGoals = async () => {
      const pending = goals.filter(g => g.status === 'completed_pending_sync');
      if (pending.length === 0) return;

      let updatedGoals = [...goals];
      for (const goal of pending) {
        try {
          setSyncingGoalId(goal.id);
          // Calculate start time as targetCompletionTime minus durationSeconds
          const startedAt = goal.targetCompletionTime 
            ? new Date(goal.targetCompletionTime - goal.durationSeconds * 1000).toISOString()
            : new Date(Date.now() - goal.durationSeconds * 1000).toISOString();
            
          const session = await sessionApi.createManual(goal.subject, goal.durationSeconds, startedAt);
          
          updatedGoals = updatedGoals.map(g => 
            g.id === goal.id ? { ...g, status: 'completed', remainingSeconds: 0, targetCompletionTime: null } : g
          );
          
          if (onSuccess) {
            onSuccess(session);
          }
        } catch (err) {
          console.error('Failed to sync completed goal:', err);
          // Mark as completed anyway to avoid infinite retries
          updatedGoals = updatedGoals.map(g => 
            g.id === goal.id ? { ...g, status: 'completed', remainingSeconds: 0, targetCompletionTime: null } : g
          );
        }
      }
      setGoals(updatedGoals);
      setSyncingGoalId(null);
      await refreshProgress();
    };

    syncPendingGoals();
  }, [goals, onSuccess]);

  // 4. Timer interval tick for active running goals
  useEffect(() => {
    const activeGoal = goals.find(g => g.status === 'running');
    if (!activeGoal) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((activeGoal.targetCompletionTime - now) / 1000));

      if (rem === 0) {
        clearInterval(interval);
        
        // Optimistically set to completed in UI to stop countdown
        setGoals(prev => prev.map(g => 
          g.id === activeGoal.id ? { ...g, status: 'completed', remainingSeconds: 0, targetCompletionTime: null } : g
        ));

        // Submit study session to backend
        try {
          setSyncingGoalId(activeGoal.id);
          const startedAt = new Date(activeGoal.targetCompletionTime - activeGoal.durationSeconds * 1000).toISOString();
          const session = await sessionApi.createManual(activeGoal.subject, activeGoal.durationSeconds, startedAt);
          
          if (onSuccess) {
            onSuccess(session);
          }
          await refreshProgress();
        } catch (err) {
          console.error('Lỗi khi ghi nhận buổi học:', err);
          alert(t('goal_log_error') + ': ' + err.message);
        } finally {
          setSyncingGoalId(null);
        }
      } else {
        // Just update countdown time remaining
        setGoals(prev => prev.map(g => 
          g.id === activeGoal.id ? { ...g, remainingSeconds: rem } : g
        ));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [goals, onSuccess]);

  // 5. Actions handlers
  const handleAddGoal = (e) => {
    e.preventDefault();
    setError('');

    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    const durationSeconds = (h * 3600) + (m * 60) + s;

    if (durationSeconds <= 0) {
      setError(t('goal_duration_error'));
      return;
    }

    const newGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      subject: subject.trim() || t('timer_placeholder'),
      durationSeconds,
      remainingSeconds: durationSeconds,
      status: 'idle',
      targetCompletionTime: null,
      createdAt: new Date().toISOString()
    };

    setGoals(prev => [newGoal, ...prev]);
    setSubject('');
    setHours('');
    setMinutes('');
    setSeconds('');
  };

  const handleStartGoal = (goalId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          status: 'running',
          targetCompletionTime: Date.now() + g.remainingSeconds * 1000,
          startedAt: g.startedAt || new Date().toISOString()
        };
      } else if (g.status === 'running') {
        // Pause other active goal
        const rem = Math.max(0, Math.ceil((g.targetCompletionTime - Date.now()) / 1000));
        return {
          ...g,
          status: 'paused',
          remainingSeconds: rem,
          targetCompletionTime: null
        };
      }
      return g;
    }));
  };

  const handlePauseGoal = (goalId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId && g.status === 'running') {
        const rem = Math.max(0, Math.ceil((g.targetCompletionTime - Date.now()) / 1000));
        return {
          ...g,
          status: 'paused',
          remainingSeconds: rem,
          targetCompletionTime: null
        };
      }
      return g;
    }));
  };

  const handleDeleteGoal = (goalId) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const getProgressPercentage = (goal) => {
    const elapsed = goal.durationSeconds - goal.remainingSeconds;
    return (elapsed / goal.durationSeconds) * 100;
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. Add Goal Form Card */}
      <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Timer className="w-5 h-5 text-indigo-400" />
          {t('goal_countdown_title')}
        </h3>

        {error && (
          <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-200 rounded-xl p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleAddGoal} className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('subject')}
            </label>
            <div className="relative">
              <BookOpen className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={t('goal_subject_placeholder')}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Time Picker Form */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('goal_duration_label')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder={t('hour')}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-3 py-3 text-center text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-500 uppercase">{t('hour').charAt(0).toUpperCase()}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder={t('minute')}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-3 py-3 text-center text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-500 uppercase">{t('minute').charAt(0).toUpperCase()}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder={t('second')}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-3 py-3 text-center text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                />
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-500 uppercase">{t('second').charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all border border-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>{t('goal_btn_add')}</span>
          </button>
        </form>
      </div>

      {/* 2. Goals List Card Group */}
      <div className="w-full glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-purple-400" />
          {t('goal_list_title')}
        </h3>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {goals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2"
              >
                <Timer className="w-8 h-8 opacity-20" />
                {t('goal_no_goals')}
              </motion.div>
            ) : (
              goals.map((goal) => {
                const isRunning = goal.status === 'running';
                const isCompleted = goal.status === 'completed';
                const isSyncing = syncingGoalId === goal.id;
                
                return (
                  <motion.div
                    key={goal.id}
                    layoutId={goal.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className={`relative p-4 rounded-2xl border transition-all ${
                      isRunning 
                        ? 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-900/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${
                            isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'
                          }`}>
                            {goal.subject}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                              {t('goal_status_completed')}
                            </span>
                          )}
                          {isRunning && (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-500/20 animate-pulse">
                              {t('goal_status_running')}
                            </span>
                          )}
                          {goal.status === 'paused' && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                              {t('goal_status_paused')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>{t('goal_set_label')} {formatDurationText(goal.durationSeconds)}</span>
                        </div>
                      </div>

                      {/* Right: Timer Clock & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Countdown display */}
                        <div className={`text-base font-extrabold tracking-tight tabular-nums ${
                          isRunning ? 'text-indigo-400' : isCompleted ? 'text-emerald-400' : 'text-slate-300'
                        }`}>
                          {formatTime(goal.remainingSeconds)}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          {isSyncing ? (
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-2" />
                          ) : !isCompleted ? (
                            <>
                              {isRunning ? (
                                <button
                                  onClick={() => handlePauseGoal(goal.id)}
                                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:scale-105 text-amber-400 transition-all cursor-pointer"
                                  title={t('goal_status_paused')}
                                >
                                  <Pause className="w-4 h-4 fill-amber-400" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartGoal(goal.id)}
                                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:scale-105 text-emerald-400 transition-all cursor-pointer"
                                  title={t('goal_btn_start')}
                                >
                                  <Play className="w-4 h-4 fill-emerald-400" />
                                </button>
                              )}
                            </>
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-2" />
                          )}

                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:scale-105 text-rose-400 transition-all cursor-pointer"
                            title={t('goal_btn_delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar under the info */}
                    {!isCompleted && (
                      <div className="w-full h-1 bg-slate-900 rounded-full mt-3 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${getProgressPercentage(goal)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>


    </div>
  );
}

export default memo(ManualSessionForm);
