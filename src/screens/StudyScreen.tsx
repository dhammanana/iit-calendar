import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, PlusCircle, CheckCircle2, Circle, Edit2, BarChart2, Clock, Play, Pause, Timer, Coffee, Armchair, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUI } from '../UIContext';
import { useI18n } from '../hooks/useI18n';
import { StudySettings, StudySettingsData } from '../components/study/StudySettings';
import { StudyInsights, StudySession } from '../components/study/StudyInsights';
import { alarmService } from '../services/alarm/AlarmService';
import { studyDbService } from '../services/StudyDbService';
import { SegmentedControl } from '../components/SegmentedControl';
import { Button } from '../components/Button';

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

  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    studyDbService.getSessions().then(setSessions);
    const unsubscribe = studyDbService.subscribe(() => {
      studyDbService.getSessions().then(setSessions);
    });
    return () => unsubscribe();
  }, []);

  // UI State
  const [view, setView] = useState<'timer' | 'insights' | 'configs'>('timer');

  // Timer State
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskIdState] = useState<string | null>(null);

  const setActiveTaskId = async (id: string | null) => {
    setActiveTaskIdState(id);
    await studyDbService.setActiveTaskId(id);
  };

  const reloadTasks = async () => {
    const loadedTasks = await studyDbService.getTasks();
    const activeId = await studyDbService.getActiveTaskId();
    setTasks(loadedTasks);
    setActiveTaskIdState(activeId);
  };

  useEffect(() => {
    reloadTasks();
    const unsubscribe = studyDbService.subscribe(() => {
      reloadTasks();
    });
    return () => unsubscribe();
  }, []);

  // Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ name: '', est: 1 });

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('study_settings', JSON.stringify(settings));
  }, [settings]);

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
      studyDbService.addSession(settings.pomodoro * 1000).then(session => {
        setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)]);
      });

      // Update task actual count if there is an active task
      if (activeTaskId) {
        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (activeTask) {
          const newAct = activeTask.act + 1;
          const isCompleted = settings.autoCheckTasks ? (newAct >= activeTask.est) : activeTask.completed;
          studyDbService.updateTask(activeTaskId, { act: newAct, completed: isCompleted });
        }
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

  const handleSaveTask = async () => {
    if (!taskForm.name.trim()) return;

    if (editingTaskId) {
      await studyDbService.updateTask(editingTaskId, { name: taskForm.name, est: taskForm.est });
    } else {
      const newTask = await studyDbService.addTask(taskForm.name, taskForm.est);
      if (!activeTaskId) {
        await setActiveTaskId(newTask.id);
      }
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

  const toggleTaskCompletion = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await studyDbService.updateTask(taskId, { completed: !task.completed });
    }
  };

  const deleteTask = async (taskId: string) => {
    await studyDbService.deleteTask(taskId);
    if (activeTaskId === taskId) {
      await setActiveTaskId(null);
    }
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
        className="w-full safe-header bg-gradient-to-tr from-indigo-500/20 via-blue-500/25 to-red-500/10 dark:from-[#0d122b] dark:via-[#090e1f] dark:to-[#05070e] sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Styled CSS/SVG Zen Concentric Rings Art */}
        <svg className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3" viewBox="0 0 100 100">
          <defs>
            {/* Soft shadow filter for the circular pill container */}
            <filter id="study-pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#1e1b4b" floodOpacity="0.07" />
            </filter>

            {/* Gradients for the circular pill container */}
            <linearGradient id="study-pill-bg-light" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
            <linearGradient id="study-pill-bg-dark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1b38" />
              <stop offset="100%" stopColor="#111024" />
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
            .study-pill-circle {
              fill: url(#study-pill-bg-light);
              stroke: rgba(255, 255, 255, 0.8);
            }
            .dark .study-pill-circle {
              fill: url(#study-pill-bg-dark);
              stroke: rgba(129, 140, 248, 0.4);
            }
          ` }} />

          {/* Ripple waves pulsing outwards from the pill edge (r=18) - 5 waves total */}
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/20" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/20" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/20" style={{ animationDelay: '3.2s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/20" style={{ animationDelay: '4.8s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="study-ripple text-indigo-500/25 dark:text-indigo-400/20" style={{ animationDelay: '6.4s' }} />

          {/* Pill Container (Circle) with Soft Shadow and Indigo Gradient Fill */}
          <circle
            cx="50"
            cy="50"
            r="18"
            className="study-pill-circle"
            strokeWidth="0.4"
            filter="url(#study-pill-shadow)"
          />

          {/* Hourglass vector icon inside the pill matching indigo theme */}
          <g transform="translate(39.5, 60.5) scale(0.0041, -0.0041)" fill="currentColor" className="text-indigo-700 dark:text-indigo-300">
            <path d="M824 4929 c-17 -19 -19 -38 -19 -183 l0 -161 31 -55 c36 -64 102 -111 167 -119 l42 -6 8 -84 c50 -557 385 -1085 917 -1446 153 -103 201 -180 199 -319 -1 -130 -51 -211 -190 -305 -274 -186 -503 -419 -661 -673 -144 -233 -242 -518 -265 -779 l-8 -83 -45 -8 c-55 -9 -115 -50 -153 -104 -36 -51 -50 -142 -45 -286 3 -96 6 -110 26 -130 l23 -23 1709 0 1709 0 23 23 c22 22 23 29 23 185 l0 162 -31 55 c-36 64 -102 111 -167 119 l-41 6 -13 114 c-62 558 -394 1069 -927 1426 -136 91 -186 173 -186 305 0 133 49 213 191 309 273 186 505 421 659 669 145 235 233 488 263 753 l13 114 41 6 c65 8 131 55 167 119 l31 55 0 161 c0 145 -2 164 -19 183 l-19 21 -1717 0 -1717 0 -19 -21z m3336 -227 c0 -93 -1 -100 -26 -123 l-26 -24 -1548 0 -1548 0 -26 24 c-25 23 -26 30 -26 123 l0 98 1600 0 1600 0 0 -98z m-244 -379 c-46 -510 -356 -988 -864 -1334 -114 -77 -164 -131 -211 -229 -35 -74 -36 -77 -36 -200 0 -123 1 -126 36 -200 47 -98 97 -152 211 -229 511 -348 822 -829 864 -1339 l7 -82 -96 0 -96 0 -32 58 c-42 74 -175 207 -264 264 -137 89 -265 148 -490 225 -71 24 -153 58 -181 74 -53 30 -134 109 -134 130 0 7 -7 21 -17 31 -32 35 -123 14 -123 -29 0 -23 -79 -101 -134 -132 -28 -16 -118 -52 -201 -81 -172 -59 -365 -148 -469 -217 -102 -68 -211 -176 -258 -255 l-40 -68 -94 0 -94 0 0 41 c0 110 51 330 111 483 132 335 384 637 729 876 131 90 153 111 202 184 118 182 102 426 -40 587 -23 25 -76 70 -119 99 -163 112 -242 177 -368 304 -187 189 -317 383 -404 602 -59 149 -111 373 -111 478 l0 36 1361 0 1362 0 -7 -77z m-1302 -3072 c65 -50 149 -91 256 -126 295 -96 503 -207 623 -333 31 -33 57 -65 57 -71 0 -8 -291 -11 -990 -11 -699 0 -990 3 -990 11 0 6 26 38 58 71 119 126 327 237 622 333 106 35 201 82 260 129 25 20 47 36 49 36 2 0 27 -18 55 -39z m1523 -713 c21 -20 23 -30 23 -125 l0 -103 -1600 0 -1600 0 0 100 c0 94 2 103 25 125 l24 25 1552 0 1553 0 23 -22z"/>
            <path d="M1546 3888 c-26 -36 -19 -73 29 -153 134 -227 331 -429 589 -605 58 -40 131 -100 162 -134 63 -70 127 -190 150 -286 16 -68 48 -110 84 -110 36 0 68 42 84 110 23 96 87 216 150 286 31 34 104 94 162 134 258 176 447 369 587 602 50 82 57 119 31 156 l-15 22 -999 0 -999 0 -15 -22z m1817 -159 c-33 -56 -172 -217 -246 -283 -79 -71 -160 -133 -279 -215 -91 -62 -191 -165 -239 -244 -19 -31 -36 -56 -39 -56 -3 0 -20 25 -39 56 -48 79 -149 182 -239 244 -193 132 -321 244 -429 373 -43 52 -86 108 -96 125 l-18 31 821 0 821 0 -18 -31z"/>
            <path d="M2504 2449 c-15 -16 -19 -36 -19 -89 0 -83 18 -110 75 -110 57 0 75 27 75 110 0 83 -18 110 -75 110 -25 0 -43 -7 -56 -21z"/>
            <path d="M2504 2049 c-15 -16 -19 -36 -19 -89 0 -83 18 -110 75 -110 57 0 75 27 75 110 0 83 -18 110 -75 110 -25 0 -43 -7 -56 -21z"/>
          </g>
        </svg>


      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] leading-none mb-1.5">
            {t('common.study') || 'Study'}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-none">
            {t('study.subtitle') || 'Timed Focus & Rest'}
          </p>
        </div>

        {/* Tab Strip — Timer / Insights / Configs */}
        <div className="h-14 flex items-center justify-center">
          <SegmentedControl
            options={[
              { id: 'timer', icon: Clock, label: t('study.timer') || 'Timer' },
              { id: 'insights', icon: BarChart2, label: t('study.insights') || 'Insights' },
              { id: 'configs', icon: Settings2, label: t('study.configs') || 'Settings' },
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
                <div className={cn("glass-card rounded-[2.5rem] px-3 py-6 sm:p-10 flex flex-col items-center transition-colors shadow-sm", getModeColorClass())}>

                  {/* Mode Selector */}
                  <div className="flex gap-1 mb-8 bg-[var(--bg-input)] p-1.5 rounded-full border border-[var(--border-subtle)] backdrop-blur-md w-full max-w-[360px] justify-between">
                    <button
                      onClick={() => switchMode('pomodoro')}
                      className={cn(
                        "flex-1 py-2 px-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-tight flex items-center justify-center gap-1 transition-all min-w-0",
                        mode === 'pomodoro'
                          ? 'bg-white dark:bg-[#2c241c] text-[var(--accent)] shadow-sm font-bold'
                          : 'text-[var(--text-muted)] opacity-80 hover:opacity-100'
                      )}
                    >
                      <Timer className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t('study.pomodoro') || 'Work'}</span>
                    </button>
                    <button
                      onClick={() => switchMode('shortBreak')}
                      className={cn(
                        "flex-1 py-2 px-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-tight flex items-center justify-center gap-1 transition-all min-w-0",
                        mode === 'shortBreak'
                          ? 'bg-white dark:bg-[#2c241c] text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                          : 'text-[var(--text-muted)] opacity-80 hover:opacity-100'
                      )}
                    >
                      <Coffee className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t('study.shortBreak') || 'Break'}</span>
                    </button>
                    <button
                      onClick={() => switchMode('longBreak')}
                      className={cn(
                        "flex-1 py-2 px-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-tight flex items-center justify-center gap-1 transition-all min-w-0",
                        mode === 'longBreak'
                          ? 'bg-white dark:bg-[#2c241c] text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                          : 'text-[var(--text-muted)] opacity-80 hover:opacity-100'
                      )}
                    >
                      <Armchair className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t('study.longBreak') || 'Rest'}</span>
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
                  <Button
                    onClick={toggleTimer}
                    variant="primary"
                    size="lg"
                    icon={isRunning ? Pause : Play}
                    className={cn(
                      "w-full max-w-[240px] h-14 px-8",
                      mode === 'shortBreak' && "bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700",
                      mode === 'longBreak' && "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700"
                    )}
                  >
                    {isRunning ? (t('study.pause') || 'PAUSE') : (t('study.start') || 'START')}
                  </Button>
                </div>

                {/* Task Section */}
                <div className="max-w-md mx-auto mt-8 w-full px-2 pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">{t('study.tasks') || 'Tasks'}</h2>
                      {tasks.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                          {tasks.filter(t => t.completed).length}/{tasks.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2.5 mb-6">
                    {tasks.map(task => {
                      const isActive = activeTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          onClick={() => setActiveTaskId(task.id)}
                          className={cn(
                            "p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 border",
                            isActive
                              ? "bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm"
                              : "glass-card border-[var(--border-subtle)] hover:border-[var(--accent)]/40",
                            task.completed && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                            <button
                              onClick={(e) => toggleTaskCompletion(task.id, e)}
                              className="flex-shrink-0 text-[var(--accent)] transition-transform active:scale-95"
                            >
                              {task.completed ? (
                                <CheckCircle2 size={22} className="text-[var(--accent)]" />
                              ) : (
                                <Circle size={22} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" />
                              )}
                            </button>
                            <span className={cn(
                              "font-medium text-sm text-[var(--text-primary)] truncate",
                              task.completed && "line-through text-[var(--text-muted)] font-normal"
                            )}>
                              {task.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                              {task.act} / {task.est}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); editTask(task); }}
                              className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)] transition-all"
                              aria-label="Edit task"
                            >
                              <Edit2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Task Form / Button */}
                  {showTaskForm ? (
                    <div className="glass-card p-5 rounded-[2rem] shadow-xl border border-[var(--border-subtle)] animate-in fade-in slide-in-from-top-3 duration-200">
                      <input
                        type="text"
                        placeholder={t('study.taskName') || "What are you working on?"}
                        value={taskForm.name}
                        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        autoFocus
                        className="w-full text-base font-medium bg-transparent outline-none border-b border-[var(--border-subtle)] focus:border-[var(--accent)] pb-2 mb-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors"
                      />

                      <div className="mb-6">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                          {t('study.estPomodoros') || 'Est Sessions'}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={taskForm.est}
                            onChange={(e) => setTaskForm({ ...taskForm, est: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-20 bg-[var(--bg-card-alt)] px-3 py-2 rounded-xl text-center font-bold text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent)] transition-colors"
                          />
                          <div className="flex gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              isIconOnly
                              onClick={() => setTaskForm(prev => ({ ...prev, est: prev.est + 1 }))}
                              aria-label="Increase estimated sessions"
                            >
                              +
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              isIconOnly
                              onClick={() => setTaskForm(prev => ({ ...prev, est: Math.max(1, prev.est - 1) }))}
                              aria-label="Decrease estimated sessions"
                            >
                              -
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 bg-[var(--bg-card-alt)] border-t border-[var(--border-subtle)] -mx-5 -mb-5 px-5 py-3.5 rounded-b-[2rem]">
                        {editingTaskId ? (
                          <Button variant="danger" size="sm" onClick={() => deleteTask(editingTaskId)}>
                            {t('study.delete') || 'Delete'}
                          </Button>
                        ) : <div />}
                        <div className="flex gap-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }}
                          >
                            {t('study.cancel') || 'Cancel'}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveTask}
                          >
                            {t('study.save') || 'Save'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.005, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setTaskForm({ name: '', est: 1 }); setShowTaskForm(true); }}
                      className="w-full p-4 rounded-[1.2rem] border border-dashed border-[var(--accent)]/40 hover:border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)]/15 text-[var(--accent)] transition-all duration-300 flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider text-xs shadow-sm hover:shadow-md hover:shadow-[var(--accent)]/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] group"
                    >
                      <div className="p-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-main)] transition-colors duration-300">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                      <span>{t('study.addTask') || 'Add Task'}</span>
                    </motion.button>
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
