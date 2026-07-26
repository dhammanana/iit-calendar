import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, PlusCircle, CheckCircle2, Circle, Edit2, BarChart2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUI } from '../UIContext';
import { useI18n } from '../hooks/useI18n';
import { StudySettings, StudySettingsData } from '../components/study/StudySettings';
import { StudyInsights, StudySession } from '../components/study/StudyInsights';
import { alarmService } from '../services/alarm/AlarmService';
import { SegmentedControl } from '../components/SegmentedControl';

type Mode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface Task {
  id: string;
  name: string;
  est: number;
  act: number;
  completed: boolean;
}

const DEFAULT_SETTINGS: StudySettingsData = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  longBreakInterval: 4,
  autoCheckTasks: false,
  checkToBottom: true,
};

export function StudyScreen() {
  const { t } = useI18n();
  const { setShowSettings: setShowGlobalSettings } = useUI();

  // Settings & Sessions
  const [settings, setSettings] = useState<StudySettingsData>(() => {
    const saved = localStorage.getItem('study_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('study_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [view, setView] = useState<'timer' | 'insights' | 'configs'>('timer');

  // Timer State
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('study_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    return localStorage.getItem('study_active_task') || null;
  });

  // Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ name: '', est: 1 });

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('study_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('study_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('study_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (activeTaskId) {
      localStorage.setItem('study_active_task', activeTaskId);
    } else {
      localStorage.removeItem('study_active_task');
    }
  }, [activeTaskId]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBell = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(settings[newMode]);
    setIsRunning(false);
    alarmService.stopStudyTimer();
    alarmService.stopForegroundTimer();
  };

  useEffect(() => {
    if (isRunning) {
      alarmService.startStudyTimer(timeLeft * 1000, mode);
      alarmService.startForegroundTimer(
        timeLeft * 1000,
        (rem) => setTimeLeft(Math.floor(rem / 1000)),
        () => handleTimerComplete()
      );
    } else {
      alarmService.stopStudyTimer();
      alarmService.stopForegroundTimer();
    }
    return () => {
      alarmService.stopStudyTimer();
      alarmService.stopForegroundTimer();
    };
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playBell();
    alarmService.stopStudyTimer();

    if (mode === 'pomodoro') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);

      // Log session
      const session: StudySession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        durationMs: settings.pomodoro * 1000
      };
      setSessions(prev => [...prev, session]);

      // Update task actual count if there is an active task
      if (activeTaskId) {
        setTasks(prev => {
          let updated = prev.map(t =>
            t.id === activeTaskId ? { ...t, act: t.act + 1 } : t
          );

          if (settings.autoCheckTasks) {
            updated = updated.map(t => {
              if (t.id === activeTaskId && t.act >= t.est) {
                return { ...t, completed: true };
              }
              return t;
            });
          }

          if (settings.checkToBottom) {
            const completed = updated.filter(t => t.completed);
            const active = updated.filter(t => !t.completed);
            return [...active, ...completed];
          }
          return updated;
        });
      }

      if (newCount % settings.longBreakInterval === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreak);
        if (settings.autoStartBreaks) setIsRunning(true);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreak);
        if (settings.autoStartBreaks) setIsRunning(true);
      }
    } else {
      setMode('pomodoro');
      setTimeLeft(settings.pomodoro);
      if (settings.autoStartPomodoros) setIsRunning(true);
    }
  };

  const toggleTimer = () => {
    if (!isRunning) {
      initAudio(); // Initialize audio context on user gesture
    }
    setIsRunning(!isRunning);
  };

  const handleSaveTask = () => {
    if (!taskForm.name.trim()) return;

    if (editingTaskId) {
      setTasks(prev => prev.map(t =>
        t.id === editingTaskId ? { ...t, name: taskForm.name, est: taskForm.est } : t
      ));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        name: taskForm.name,
        est: taskForm.est,
        act: 0,
        completed: false,
      };
      setTasks(prev => [...prev, newTask]);
      if (!activeTaskId) setActiveTaskId(newTask.id);
    }

    setTaskForm({ name: '', est: 1 });
    setShowTaskForm(false);
    setEditingTaskId(null);
  };

  const editTask = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskForm({ name: task.name, est: task.est });
    setShowTaskForm(true);
  };

  const toggleTaskCompletion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (activeTaskId === taskId) setActiveTaskId(null);
    if (editingTaskId === taskId) {
      setShowTaskForm(false);
      setEditingTaskId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Theming colors based on mode (simulating pomofocus UI but mapped to our theme tokens if needed)
  const getModeColorClass = () => {
    switch (mode) {
      case 'pomodoro': return 'text-slate-800 dark:text-slate-100';
      case 'shortBreak': return 'text-slate-800 dark:text-slate-100';
      case 'longBreak': return 'text-slate-800 dark:text-slate-100';
    }
  };

  const getModeBg = () => {
    // Keep it transparent so it adopts the global app theme background seamlessly
    return 'bg-transparent';
  };

  return (
    <div className="flex flex-col relative bg-[var(--bg-main)]">

      {/* Dynamic/Notch-compatible Vector Illustration Header (Study: ripple/hourglass theme) */}
      <div
        className="w-full safe-header bg-gradient-to-tr from-indigo-500/20 via-blue-500/25 to-red-500/10 sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Styled CSS/SVG Zen Concentric Rings Art */}
        <svg className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3" viewBox="0 0 100 100">
          <defs>
            {/* Soft shadow filter for the circular pill container */}
            <filter id="study-pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#1e1b4b" floodOpacity="0.07" />
            </filter>

            {/* Gradient for the circular pill container: soft desaturated warm indigo */}
            <linearGradient id="study-pill-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
          </defs>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes study-wave-pulse {
              0%   { r: 0px; opacity: 0.6; }
              100% { r: 46px; opacity: 0; }
            }
            .study-ripple {
              animation: study-wave-pulse 8s cubic-bezier(0.25, 0, 0.2, 1) infinite;
              transform-origin: 50px 50px;
            }
          ` }} />

          {/* Ripple waves pulsing outwards from the pill edge (r=18) - 5 waves total */}
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/15" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/15" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/15" style={{ animationDelay: '3.2s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/15" style={{ animationDelay: '4.8s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/15" style={{ animationDelay: '6.4s' }} />

          {/* Pill Container (Circle) with Soft Shadow and Indigo Gradient Fill */}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="url(#study-pill-bg)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="0.4"
            filter="url(#study-pill-shadow)"
          />

          {/* Hourglass image inside the pill */}
          <image
            href="/hourglass.png"
            x="38"
            y="38"
            width="24"
            height="24"
            style={{
              filter: 'brightness(0) saturate(100%) invert(18%) sepia(35%) saturate(5796%) hue-rotate(238deg) brightness(88%) contrast(92%)'
            }}
          />
        </svg>


      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center">
          <h1 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none mb-1.5">
            Focus
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">
            Pomodoro timer
          </p>
        </div>

        {/* Tab Strip — Timer / Insights / Configs */}
        <div className="h-14 flex items-center justify-center">
          <SegmentedControl
            options={[
              { id: 'timer', icon: Clock, label: t('study.timer') || 'Timer' },
              { id: 'insights', icon: BarChart2, label: t('study.insights') || 'Insights' },
              { id: 'configs', icon: Settings2, label: t('study.configs') || 'Configs' },
            ]}
            value={view}
            onChange={(val) => setView(val as any)}
          />
        </div>

        {/* ── Study Content by Tab ── */}
        <AnimatePresence mode="wait">
          {view === 'timer' && (
            <motion.div
              key="study-timer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className={cn("space-y-6 animate-in fade-in duration-700 p-2 min-h-[70vh] rounded-[2.5rem] transition-colors relative", getModeBg())}>

                {/* Timer Card */}
                <div className={cn("glass-card rounded-[2.5rem] p-6 sm:p-10 flex flex-col items-center transition-colors shadow-sm", getModeColorClass())}>

                  {/* Mode Selector */}
                  <div className="flex gap-1.5 mb-8 bg-[var(--bg-input)] p-1.5 rounded-full border border-[var(--border-subtle)] backdrop-blur-md w-full max-w-[340px] justify-between">
                    <button
                      onClick={() => switchMode('pomodoro')}
                      className={cn(
                        "flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-center transition-all",
                        mode === 'pomodoro'
                          ? 'bg-white dark:bg-slate-800 text-[var(--accent)] shadow-sm font-bold'
                          : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
                      )}
                    >
                      {t('study.pomodoro') || 'Pomodoro'}
                    </button>
                    <button
                      onClick={() => switchMode('shortBreak')}
                      className={cn(
                        "flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-center transition-all",
                        mode === 'shortBreak'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                          : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
                      )}
                    >
                      {t('study.shortBreak') || 'Short Break'}
                    </button>
                    <button
                      onClick={() => switchMode('longBreak')}
                      className={cn(
                        "flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-center transition-all",
                        mode === 'longBreak'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                          : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
                      )}
                    >
                      {t('study.longBreak') || 'Long Break'}
                    </button>
                  </div>

                  {/* Time Display */}
                  <div
                    className="font-sans font-medium text-7xl sm:text-8xl tracking-tight mb-8 tabular-nums select-none"
                    style={{
                      color: mode === 'pomodoro'
                        ? 'var(--accent)'
                        : mode === 'shortBreak'
                          ? '#10b981'
                          : '#6366f1'
                    }}
                  >
                    {formatTime(timeLeft)}
                  </div>

                  {/* Start/Stop Button */}
                  <button
                    onClick={toggleTimer}
                    className={cn(
                      "w-full max-w-[240px] py-4 rounded-full font-bold text-base uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-md text-white hover:shadow-lg",
                      mode === 'pomodoro' ? 'bg-[var(--accent)]' : '',
                      mode === 'shortBreak' ? 'bg-emerald-600 dark:bg-emerald-500' : '',
                      mode === 'longBreak' ? 'bg-indigo-600 dark:bg-indigo-500' : '',
                      isRunning && 'opacity-90'
                    )}
                  >
                    {isRunning ? (t('study.pause') || 'PAUSE') : (t('study.start') || 'START')}
                  </button>
                </div>

                {/* Task Section */}
                <div className="max-w-md mx-auto mt-8 w-full px-2 pb-4">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <h2 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-200">{t('study.tasks') || 'Tasks'}</h2>
                  </div>

                  {/* Task List */}
                  <div className="space-y-3 mb-6">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setActiveTaskId(task.id)}
                        className={cn(
                          "glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer border-l-4 transition-all",
                          activeTaskId === task.id ? 'border-l-saffron' : 'border-l-transparent',
                          task.completed ? 'opacity-60' : ''
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <button onClick={(e) => toggleTaskCompletion(task.id, e)} className="flex-shrink-0 text-saffron">
                            {task.completed ? <CheckCircle2 size={24} className="text-saffron" /> : <Circle size={24} className="text-slate-300 dark:text-slate-600" />}
                          </button>
                          <span className={cn("font-medium truncate", task.completed && "line-through text-slate-500")}>
                            {task.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                            {task.act} / {task.est}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); editTask(task); }}
                            className="p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Task Form / Button */}
                  {showTaskForm ? (
                    <div className="glass-card p-5 rounded-[2rem] shadow-lg animate-in slide-in-from-top-4">
                      <input
                        type="text"
                        placeholder={t('study.taskName') || "What are you working on?"}
                        value={taskForm.name}
                        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        autoFocus
                        className="w-full text-lg font-medium bg-transparent outline-none border-b-2 border-slate-200 dark:border-slate-700 focus:border-saffron pb-2 mb-4 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-colors"
                      />

                      <div className="mb-6">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('study.estPomodoros') || 'Est Pomodoros'}</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={taskForm.est}
                            onChange={(e) => setTaskForm({ ...taskForm, est: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-20 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-center font-bold text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 focus:border-saffron transition-colors"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setTaskForm(prev => ({ ...prev, est: prev.est + 1 }))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
                            <button onClick={() => setTaskForm(prev => ({ ...prev, est: Math.max(1, prev.est - 1) }))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700">-</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 bg-[var(--bg-card-alt)] border-t border-[var(--border-subtle)] -mx-5 -mb-5 px-5 py-4 rounded-b-[2rem]">
                        {editingTaskId ? (
                          <button onClick={() => deleteTask(editingTaskId)} className="text-sm font-bold text-red-500 uppercase tracking-widest">{t('study.delete') || 'Delete'}</button>
                        ) : <div />}
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }}
                            className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-slate-500"
                          >
                            {t('study.cancel') || 'Cancel'}
                          </button>
                          <button
                            onClick={handleSaveTask}
                            className="px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest bg-saffron text-white shadow-md shadow-saffron/20 active:scale-95 hover:bg-saffron/90"
                          >
                            {t('study.save') || 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setTaskForm({ name: '', est: 1 }); setShowTaskForm(true); }}
                      className="w-full py-3.5 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200 active:scale-[0.98]"
                    >
                      <PlusCircle size={16} /> {t('study.addTask') || 'Add Task'}
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {view === 'insights' && (
            <motion.div
              key="study-insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pb-10"
            >
              <StudyInsights
                show={true}
                onClose={() => setView('timer')}
                sessions={sessions}
                inline={true}
              />
            </motion.div>
          )}

          {view === 'configs' && (
            <motion.div
              key="study-configs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pb-10"
            >
              <StudySettings
                show={true}
                onClose={() => setView('timer')}
                settings={settings}
                onUpdate={(newSettings) => {
                  setSettings(newSettings);
                  if (!isRunning) {
                    setTimeLeft(newSettings[mode]);
                  } else {
                    const newDurationMs = newSettings[mode] * 1000;
                    alarmService.rescheduleStudyTimer(newDurationMs, mode);
                    setTimeLeft(newSettings[mode]);
                  }
                }}
                inline={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
