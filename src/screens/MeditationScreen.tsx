import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, RotateCcw, Volume2, Activity, Award, Clock, Settings2, X, Minus, Plus, Pause, Sun, ChevronLeft, ChevronRight, Settings as SettingsIcon, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays, startOfDay, subDays, isSameDay, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { alarmService, ActiveMeditation } from '../services/alarm/AlarmService';
import { meditationService } from '../services/MeditationService';
import { useI18n } from '../hooks/useI18n';
import { useUI } from '../UIContext';
import { SegmentedControl } from '../components/SegmentedControl';
import { LabeledSelect } from '../components/LabeledSelect';

interface MeditationSession {
  id: string;
  date: string;
  durationMin: number;
}

interface MeditationStats {
  sessions: MeditationSession[];
}

export function MeditationScreen() {
  const { t } = useI18n();
  const { setShowSettings: setShowGlobalSettings } = useUI();
  const loadStats = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen_meditation_stats');
      return saved ? JSON.parse(saved) : { sessions: [] };
    }
    return { sessions: [] };
  };

  const [stats, setStats] = useState<MeditationStats>(loadStats);
  const [isPaused, setIsPaused] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [view, setView] = useState<'timer' | 'insights' | 'config'>('timer');

  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('day');
  const [chartOffset, setChartOffset] = useState(0);

  const toggleWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
      } else {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => setWakeLock(null));
      }
    } catch (err) {
      console.error('Wake Lock failed:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [wakeLock]);

  const [settings, setSettings] = useState({
    durationHours: 0,
    durationMinutes: 15,
    intervalMinutes: 0,
    intervalSeconds: 0,
    soundEnabled: true,
    delaySeconds: 5,
    bellType: 'bowl',
  });

  const totalDurationMin = (settings.durationHours || 0) * 60 + (settings.durationMinutes || 0);
  const totalDurationMs = totalDurationMin * 60 * 1000;
  const intervalMs = ((settings.intervalMinutes || 0) * 60 + (settings.intervalSeconds || 0)) * 1000;

  const [remainingMs, setRemainingMs] = useState(totalDurationMs);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const lastTickRef = useRef<number>(Date.now());

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const init = async () => {
      await alarmService.requestPermission();

      // Reconcile sessions that finished in background
      await alarmService.recheckMeditation();

      // Check for existing session
      const savedActive = localStorage.getItem('active_meditation');

      if (savedActive) {
        const active: ActiveMeditation = JSON.parse(savedActive);
        const elapsed = Date.now() - active.startTime;
        if (elapsed < active.durationMs) {
          setRemainingMs(active.durationMs - elapsed);
          setIsRunning(true);
        } else {
          const savedStats = localStorage.getItem('zen_meditation_stats');
          if (savedStats) setStats(JSON.parse(savedStats));
          setRemainingMs(totalDurationMs);
          setIsRunning(false);
        }
      }
    };

    init();
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBell = (type: string = settings.bellType) => {
    if (!settings.soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    let fundamental = 523.25; // C5
    let partials = [1, 1.503, 1.997, 2.502, 3.011];
    let duration = 4;

    if (type === 'gong') {
      fundamental = 130.81; // C3
      partials = [1, 2.05, 3.1, 4.2];
      duration = 6;
    } else if (type === 'chime') {
      fundamental = 1046.5; // C6
      partials = [1, 1.2, 1.5];
      duration = 2;
    } else if (type === 'tibetan') {
      fundamental = 261.63; // C4
      partials = [1, 1.8, 2.7, 5.4];
      duration = 5;
    } else if (type === 'woodblock') {
      fundamental = 800;
      partials = [1, 1.5];
      duration = 0.2;
    } else if (type === 'bell') {
      fundamental = 880; // A5
      partials = [1, 2, 3];
      duration = 3;
    }

    partials.forEach((p, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(fundamental * p, now);
      gain.gain.setValueAtTime(0.15 / partials.length, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration + i * 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 1);
    });
  };

  // Setup Initial Time when settings change
  useEffect(() => {
    if (!isRunning && !isPaused && !isFinished && countdown === 0) {
      setRemainingMs(totalDurationMs);
    }
  }, [totalDurationMs, isRunning, isPaused, isFinished, countdown]);

  // Main Timer Logic (Includes delay countdown)
  useEffect(() => {
    let countdownInterval: number | null = null;

    if (isRunning) {
      if (countdown > 0) {
        lastTickRef.current = Date.now();
        countdownInterval = window.setInterval(() => {
          const now = Date.now();
          const delta = now - lastTickRef.current;
          lastTickRef.current = now;

          setCountdown(prev => {
            const next = prev - (delta / 1000);
            if (next <= 0) {
              if (countdownInterval) clearInterval(countdownInterval);
              playBell(); // Start session bell
              alarmService.startMeditation(remainingMs, intervalMs);
              startActualTimer(remainingMs);
              return 0;
            }
            return next;
          });
        }, 100);
      } else {
        // Start or resume actual timer
        alarmService.startMeditation(remainingMs, intervalMs);
        startActualTimer(remainingMs);
      }
    } else {
      alarmService.stopForegroundTimer();
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      alarmService.stopForegroundTimer();
    };
  }, [isRunning]);

  const startActualTimer = (ms: number) => {
    alarmService.startForegroundTimer(
      ms,
      (rem) => setRemainingMs(rem),
      () => {
        handleComplete();
        if (wakeLock) wakeLock.release();
      },
      intervalMs,
      () => playBell()
    );
  };

  const handleComplete = async () => {
    setIsRunning(false);
    setIsFinished(true);
    playBell(); // End bell

    await alarmService.stopMeditation();

    // Save session
    const newSession: MeditationSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      durationMin: totalDurationMin,
    };

    const newStats = { ...stats, sessions: [...stats.sessions, newSession] };
    setStats(newStats);
    localStorage.setItem('zen_meditation_stats', JSON.stringify(newStats));


  };

  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    if (wakeLock) wakeLock.release();
    await alarmService.stopMeditation();

    const elapsedMs = totalDurationMs - remainingMs;
    const elapsedMin = Math.floor(elapsedMs / 60000);

    if (elapsedMin >= 5) {
      const newSession: MeditationSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        durationMin: elapsedMin,
      };

      const newStats = { ...stats, sessions: [...stats.sessions, newSession] };
      setStats(newStats);
      localStorage.setItem('zen_meditation_stats', JSON.stringify(newStats));


    }

    resetTimer();
  };

  const toggleTimer = async () => {
    if (!isRunning && !isPaused && remainingMs === totalDurationMs) {
      // Starting fresh
      if (settings.delaySeconds > 0) {
        setCountdown(settings.delaySeconds);
      } else {
        playBell();
        alarmService.startMeditation(remainingMs, intervalMs);
      }
      setIsRunning(true);
      setIsPaused(false);
    } else if (isRunning) {
      // Pause
      setIsRunning(false);
      setIsPaused(true);
      alarmService.stopForegroundTimer();
      await alarmService.stopMeditation();
    } else if (isPaused) {
      // Resume
      setIsRunning(true);
      setIsPaused(false);
      alarmService.startMeditation(remainingMs, intervalMs);
    } else if (isFinished) {
      resetTimer();
      setIsRunning(true);
      if (settings.delaySeconds > 0) setCountdown(settings.delaySeconds);
      else {
        playBell();
        alarmService.startMeditation(totalDurationMs, intervalMs);
      }
    }
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
    setRemainingMs(totalDurationMs);
    setCountdown(0);
    if (wakeLock) wakeLock.release();

    await alarmService.stopMeditation();
  };

  const today = startOfDay(new Date());

  // Calculate chart data dynamically based on view and offset
  let chartData: { label: string; minutes: number; isCurrent: boolean; _start?: Date; _end?: Date; _date?: Date }[] = [];

  if (chartView === 'day') {
    const endDay = subDays(today, chartOffset * 7);
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(endDay, 6 - i);
      return {
        label: format(d, 'E')[0],
        minutes: 0,
        isCurrent: chartOffset === 0 && isSameDay(d, today),
        _date: d,
      };
    });

    stats.sessions.forEach(s => {
      const sDate = startOfDay(new Date(s.date));
      const dayData = chartData.find(d => isSameDay(d._date!, sDate));
      if (dayData) {
        dayData.minutes += s.durationMin;
      }
    });
  } else if (chartView === 'week') {
    const endWeekDate = subWeeks(today, chartOffset * 7);
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = subWeeks(endWeekDate, 6 - i);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(d, { weekStartsOn: 1 });
      return {
        label: format(start, 'dd/MM'),
        minutes: 0,
        isCurrent: chartOffset === 0 && i === 6,
        _start: start,
        _end: end,
      };
    });

    stats.sessions.forEach(s => {
      const sDate = startOfDay(new Date(s.date));
      const weekData = chartData.find(d => sDate >= d._start! && sDate <= d._end!);
      if (weekData) {
        weekData.minutes += s.durationMin;
      }
    });
  } else if (chartView === 'month') {
    const endMonthDate = subMonths(today, chartOffset * 6);
    chartData = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(endMonthDate, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      return {
        label: format(start, 'MMM'),
        minutes: 0,
        isCurrent: chartOffset === 0 && i === 5,
        _start: start,
        _end: end,
      };
    });

    stats.sessions.forEach(s => {
      const sDate = startOfDay(new Date(s.date));
      const monthData = chartData.find(d => sDate >= d._start! && sDate <= d._end!);
      if (monthData) {
        monthData.minutes += s.durationMin;
      }
    });
  }

  const maxMinutesInChart = Math.max(...chartData.map(d => d.minutes), 20);

  // Keep original weeklyMinutes calculation for the stats cards (always last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));
  const weeklyMinutes = stats.sessions.reduce((acc, s) => {
    const sDate = startOfDay(new Date(s.date));
    if (last7Days.some(d => isSameDay(d, sDate))) return acc + s.durationMin;
    return acc;
  }, 0);

  const totalMinutes = stats.sessions.reduce((acc, curr) => acc + curr.durationMin, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    const hasSession = stats.sessions.some(s => isSameDay(startOfDay(new Date(s.date)), d));
    if (hasSession) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  const milestone = 500;
  const progressPercent = Math.min((weeklyMinutes / milestone) * 100, 100);

  const hours = Math.floor(remainingMs / 3600000);
  const mins = Math.floor((remainingMs % 3600000) / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  const timeString = hours > 0
    ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = isFinished ? 0 : totalDurationMs === 0 ? 0 : circumference - ((remainingMs / totalDurationMs) * circumference);

  const isDistractionFree = isRunning || countdown > 0 || isPaused;

  return (
    <div className="flex flex-col relative bg-[var(--bg-main)]">

      {/* Dynamic/Notch-compatible Vector Illustration Header (Stillness: ripple/lotus theme) */}
      <div
        className="w-full safe-header bg-gradient-to-tr from-teal-500/20 via-emerald-500/20 to-cyan-500/10 sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Styled CSS/SVG Zen Concentric Rings Art */}
        <svg className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3" viewBox="0 0 100 100">
          <defs>
            {/* Soft shadow filter for the circular pill container */}
            <filter id="pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#042017" floodOpacity="0.07" />
            </filter>

            {/* Gradient for the circular pill container: soft desaturated mint green */}
            <linearGradient id="pill-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d2ede2" />
            </linearGradient>
          </defs>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes zen-wave-pulse {
              0%   { r: 0px; opacity: 0.6; }
              100% { r: 46px; opacity: 0; }
            }
            .zen-ripple {
              animation: zen-wave-pulse 8s cubic-bezier(0.25, 0, 0.2, 1) infinite;
              transform-origin: 50px 50px;
            }
          ` }} />

          {/* Ripple waves pulsing outwards from the pill edge (r=18) - 5 waves total */}
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/15" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/15" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/15" style={{ animationDelay: '3.2s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/15" style={{ animationDelay: '4.8s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/15" style={{ animationDelay: '6.4s' }} />

          {/* Pill Container (Circle) with Soft Shadow and Jade Gradient Fill */}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="url(#pill-bg)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="0.4"
            filter="url(#pill-shadow)"
          />

          {/* Meditation vector icon inside the pill matching jade/emerald theme */}
          <g transform="translate(38, 62) scale(0.0046875, -0.0046875)" fill="currentColor" className="text-emerald-800 dark:text-emerald-300">
            <path d="M2420 4786 c-147 -32 -246 -84 -354 -187 -147 -140 -216 -290 -224 -491 -6 -147 13 -235 76 -361 37 -76 61 -108 136 -182 74 -74 107 -99 176 -133 124 -60 194 -77 330 -76 136 0 208 17 330 77 69 33 102 58 175 132 149 148 215 305 215 509 0 214 -73 381 -229 529 -86 80 -176 133 -286 167 -90 28 -254 35 -345 16z m263 -161 c197 -41 369 -207 422 -405 8 -30 15 -96 15 -147 0 -123 -31 -223 -100 -321 -224 -320 -696 -320 -920 0 -198 282 -97 678 212 827 126 60 238 75 371 46z"/>
            <path d="M2340 3235 c-620 -104 -1079 -598 -1142 -1227 -13 -130 -8 -160 32 -189 61 -44 314 -89 506 -89 286 0 531 78 741 236 l84 64 62 -49 c130 -101 275 -171 447 -218 78 -21 125 -26 262 -30 182 -6 271 3 433 43 165 41 175 56 157 232 -63 630 -527 1127 -1147 1227 -108 18 -331 18 -435 0z m420 -160 c434 -71 800 -383 945 -807 24 -69 49 -185 60 -275 l6 -52 -38 -10 c-121 -33 -231 -43 -388 -38 -179 6 -265 24 -398 81 -110 48 -176 90 -274 174 -110 93 -117 93 -220 5 -137 -118 -261 -185 -428 -230 -90 -24 -118 -26 -285 -27 -143 -1 -206 3 -276 17 -50 11 -96 22 -102 26 -15 9 0 135 28 245 116 456 503 813 962 890 113 19 293 19 408 1z"/>
            <path d="M1265 1625 c-253 -56 -437 -230 -500 -475 -23 -88 -23 -244 0 -335 59 -235 230 -408 465 -471 41 -11 102 -18 165 -18 89 0 112 4 210 38 131 44 356 153 550 266 164 96 188 117 188 161 0 37 -40 79 -76 79 -12 0 -83 -36 -157 -80 -168 -101 -449 -240 -555 -277 -372 -127 -730 201 -640 585 22 93 60 159 134 233 106 107 232 156 366 146 177 -14 524 -186 985 -489 594 -389 966 -592 1195 -650 196 -50 432 19 586 172 128 128 191 282 191 470 0 298 -168 535 -447 627 -67 22 -98 26 -195 27 -106 0 -123 -2 -215 -34 -123 -42 -404 -181 -587 -291 -146 -87 -168 -111 -148 -163 10 -29 47 -56 74 -56 11 0 69 30 130 67 172 104 483 258 590 292 108 35 169 38 264 16 173 -41 303 -161 354 -329 42 -136 24 -300 -48 -422 -35 -60 -135 -151 -198 -180 -77 -35 -190 -57 -255 -50 -167 19 -519 194 -923 459 -622 407 -1016 624 -1238 682 -70 18 -183 18 -265 0z"/>
          </g>
        </svg>
      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center">
          <h1 className="font-serif text-3xl font-bold leading-none mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {t('common.stillness') || 'Stillness'}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider leading-none" style={{ color: 'var(--text-muted)' }}>
            Practice mindfulness
          </p>
        </div>

        {/* ── Original Meditation Content wrapper ── */}
        <div className="max-w-2xl w-full mx-auto space-y-6 animate-in fade-in duration-700">

          {/* Mode Switcher */}
          <div className="h-14 flex items-center justify-center">
            {!isDistractionFree && (
              <SegmentedControl
                options={[
                  { id: 'timer', icon: Clock, label: t('study.timer') || 'Timer' },
                  { id: 'insights', icon: BarChart2, label: t('chant.insights') || 'Insights' },
                  { id: 'config', icon: Settings2, label: t('meditation.configure') || 'Configure' },
                ]}
                value={view}
                onChange={(val) => setView(val as any)}
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            {(isDistractionFree || view === 'timer') && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center pb-4 relative"
              >
                <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                    <circle cx="128" cy="128" r="120" stroke="var(--sm-surface)" strokeWidth="4" fill="none" className="opacity-40" />
                    <circle
                      cx="128" cy="128" r="120"
                      stroke="var(--accent)"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-linear"
                    />
                  </svg>

                  <div className="text-center z-10 flex flex-col items-center justify-center">
                    {countdown > 0 ? (
                      <>
                        <span className="text-xs font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          {t('meditation.startingIn')}
                        </span>
                        <div className="font-serif text-5xl font-medium tracking-tight leading-none" style={{ color: 'var(--accent)' }}>
                          {Math.ceil(countdown)}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          {isFinished ? t('meditation.complete') : (isPaused ? 'Paused' : t('meditation.remaining'))}
                        </span>
                        <div className="font-serif text-5xl font-medium tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                          {timeString}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 w-full max-w-[280px] justify-between">
                  {!isDistractionFree ? (
                    <>
                      <button
                        onClick={resetTimer}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 border"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <RotateCcw size={18} />
                      </button>

                      <button
                        onClick={toggleTimer}
                        className="flex-1 h-14 rounded-full flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-xs transition-transform active:scale-95 border text-white shadow-lg"
                        style={{
                          backgroundColor: 'var(--accent)',
                          borderColor: 'var(--accent-shadow)',
                          boxShadow: '0 0 20px var(--accent-shadow)'
                        }}
                      >
                        <Play size={16} fill="currentColor" /> {t('meditation.startMeditation')}
                      </button>

                      <button
                        onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 border relative",
                          !settings.soundEnabled && "border-red-500/30 dark:border-red-400/20 text-red-500 dark:text-red-400"
                        )}
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: settings.soundEnabled ? 'var(--border)' : undefined,
                          color: settings.soundEnabled ? 'var(--text-secondary)' : undefined
                        }}
                      >
                        <Volume2 size={18} />
                        {!settings.soundEnabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-[2px] rotate-45 bg-red-500/80 rounded-full" />
                          </div>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleStop}
                        className="flex-1 h-14 rounded-full flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-xs transition-all active:scale-95 border"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <Square size={16} fill="currentColor" /> Stop
                      </button>

                      <button
                        onClick={toggleTimer}
                        className="flex-1 h-14 rounded-full flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-xs transition-all active:scale-95 text-white shadow-lg"
                        style={{
                          backgroundColor: 'var(--accent)',
                          boxShadow: '0 10px 15px -3px var(--accent-shadow), 0 4px 6px -4px var(--accent-shadow)'
                        }}
                      >
                        {isRunning ? (
                          <><Pause size={16} fill="currentColor" /> Pause</>
                        ) : (
                          <><Play size={16} fill="currentColor" /> Resume</>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {isDistractionFree && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    {/* Keep Screen On button */}
                    <button
                      onClick={toggleWakeLock}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                        wakeLock
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-muted)]"
                      )}
                      style={{
                        backgroundColor: wakeLock ? 'var(--accent-subtle)' : 'var(--surface)',
                        borderColor: wakeLock ? 'var(--accent-muted)' : 'var(--border)'
                      }}
                    >
                      <Sun size={12} className={cn(wakeLock && "animate-pulse")} style={{ color: wakeLock ? 'var(--accent)' : undefined }} />
                      {wakeLock ? 'Screen Always On' : 'Keep Screen On'}
                    </button>

                    {/* Mute/Sound toggle button */}
                    <button
                      onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border relative",
                        settings.soundEnabled
                          ? "text-[var(--text-muted)] border-[var(--border)]"
                          : "text-red-500 dark:text-red-400 border-red-500/30 dark:border-red-400/20"
                      )}
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: settings.soundEnabled ? 'var(--border)' : undefined
                      }}
                    >
                      <Volume2 size={12} />
                      {settings.soundEnabled ? 'Sound On' : 'Muted'}
                      {!settings.soundEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-[1.5px] rotate-45 bg-red-500/80 rounded-full" />
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {(!isDistractionFree && view === 'insights') && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 gap-4 mt-8"
              >
                {/* Your Journey — 3 stat cards (matching Study Insights style) */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Award, value: currentStreak, label: t('meditation.currentStreak') || 'Day Streak' },
                    { icon: Clock, value: Math.floor(weeklyMinutes / 60) > 0 ? `${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m` : `${weeklyMinutes}m`, label: t('meditation.weeklyTime') || 'This Week' },
                    { icon: Activity, value: stats.sessions.filter(s => differenceInDays(today, new Date(s.date)) < 7).length, label: t('meditation.sessions') || 'Sessions' },
                  ].map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1"
                      style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-muted)' }}
                    >
                      <Icon size={20} style={{ color: 'var(--accent)' }} />
                      <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{value}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div
                  className="rounded-[1.5rem] p-5"
                  style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart2 size={16} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {t('meditation.meditationHistory') || 'Meditation History'}
                    </span>
                  </div>

                  {/* Chart Controls */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-stone-100 dark:bg-stone-900 rounded-full p-1" style={{ backgroundColor: 'var(--sm-surface)' }}>
                      {(['day', 'week', 'month'] as const).map(view => (
                        <button
                          key={view}
                          onClick={() => { setChartView(view); setChartOffset(0); }}
                          className={cn(
                            "px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all",
                            chartView === view
                              ? "shadow-sm"
                              : "opacity-60 hover:opacity-100"
                          )}
                          style={chartView === view ? { backgroundColor: 'var(--sm-card-bg)', color: 'var(--accent)' } : { color: 'var(--sm-text-secondary)' }}
                        >
                          {view === 'day' ? 'Day' : view === 'week' ? 'Week' : 'Month'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setChartOffset(prev => prev + 1)}
                        className="p-1.5 rounded-full transition-colors opacity-60 hover:opacity-100"
                        style={{ backgroundColor: 'var(--sm-surface)', color: 'var(--sm-text-primary)' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setChartOffset(prev => Math.max(0, prev - 1))}
                        disabled={chartOffset === 0}
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          chartOffset === 0 ? "opacity-30 cursor-not-allowed" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: 'var(--sm-surface)', color: 'var(--sm-text-primary)' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between h-32 pt-4 pb-2 border-b" style={{ borderColor: 'var(--sm-border)' }}>
                    {chartData.map((item, i) => {
                      const h = item.minutes > 0 ? (item.minutes / maxMinutesInChart) * 100 : 0;
                      return (
                        <div key={`chart-col-${chartView}-${chartOffset}-${i}`} className="flex flex-col items-center gap-3" style={{ width: `${100 / chartData.length}%` }}>
                          <div className="w-full flex justify-center h-20 items-end">
                            <motion.div
                              key={`bar-${chartView}-${chartOffset}-${i}`}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="w-2 sm:w-3 rounded-full"
                              style={{
                                backgroundColor: item.minutes > 0
                                  ? (item.isCurrent ? 'var(--accent)' : 'var(--sm-text-disabled)')
                                  : 'transparent',
                                minHeight: item.minutes > 0 ? '4px' : '0'
                              }}
                            />
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap" style={{ color: item.isCurrent ? 'var(--accent)' : 'var(--sm-text-muted)' }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center mt-4 text-xs font-medium" style={{ color: 'var(--sm-text-secondary)' }}>
                    <span>
                      {chartView === 'day' ? t('meditation.dailyAverage') : chartView === 'week' ? 'Weekly Average' : 'Monthly Average'}
                    </span>
                    <span style={{ color: 'var(--accent)' }}>
                      {(chartData.reduce((acc, curr) => acc + curr.minutes, 0) / chartData.length).toFixed(1)} {t('meditation.mins')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {(!isDistractionFree && view === 'config') && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 gap-4 mt-8"
              >
                <div
                  className="rounded-[2rem] p-6 relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--sm-card-bg)',
                    border: '1px solid var(--sm-border)'
                  }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl" style={{ color: 'var(--sm-text-primary)' }}>
                      {t('meditation.sessionSettings')}
                    </h3>
                    <Settings2 size={20} style={{ color: 'var(--sm-text-muted)' }} />
                  </div>

                  <div className="space-y-6">
                    {/* Duration Section */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--sm-text-muted)' }}>
                        {t('meditation.durationLabel')}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <LabeledSelect
                            value={settings.durationHours}
                            onChange={(val) => setSettings({ ...settings, durationHours: parseInt(val) })}
                            options={Array.from({ length: 24 }).map((_, i) => ({
                              value: i,
                              label: i.toString().padStart(2, '0')
                            }))}
                            badgeLabel="Hours"
                          />
                        </div>
                        <span className="text-2xl font-serif" style={{ color: 'var(--sm-border)' }}>:</span>
                        <div className="flex-1">
                          <LabeledSelect
                            value={settings.durationMinutes}
                            onChange={(val) => setSettings({ ...settings, durationMinutes: parseInt(val) })}
                            options={[0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => ({
                              value: m,
                              label: m.toString().padStart(2, '0')
                            }))}
                            badgeLabel="Minutes"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interval Section */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--sm-text-muted)' }}>
                        {t('meditation.intervalBell')}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <LabeledSelect
                            value={settings.intervalMinutes}
                            onChange={(val) => setSettings({ ...settings, intervalMinutes: parseInt(val) })}
                            options={Array.from({ length: 60 }).map((_, i) => ({
                              value: i,
                              label: i.toString().padStart(2, '0')
                            }))}
                            badgeLabel="Minutes"
                          />
                        </div>
                        <span className="text-2xl font-serif" style={{ color: 'var(--sm-border)' }}>:</span>
                        <div className="flex-1">
                          <LabeledSelect
                            value={settings.intervalSeconds}
                            onChange={(val) => setSettings({ ...settings, intervalSeconds: parseInt(val) })}
                            options={[0, 15, 30, 45].map(s => ({
                              value: s,
                              label: s.toString().padStart(2, '0')
                            }))}
                            badgeLabel="Seconds"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preparation Check Section */}
                    <LabeledSelect
                      label={t('meditation.preparationCheck')}
                      value={settings.delaySeconds}
                      onChange={(val) => setSettings({ ...settings, delaySeconds: parseInt(val) })}
                      options={[
                        { value: 0, label: t('meditation.noDelay') },
                        { value: 5, label: `5 ${t('meditation.seconds')}` },
                        { value: 10, label: `10 ${t('meditation.seconds')}` },
                        { value: 30, label: `30 ${t('meditation.seconds')}` },
                        { value: 60, label: `1 ${t('meditation.minutes')}` },
                      ]}
                      selectClassName="text-base font-serif px-5 py-4 text-left"
                    />

                    {/* Bell Type Section */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--sm-text-muted)' }}>
                        {t('meditation.bellType')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['bowl', 'gong', 'chime', 'tibetan', 'woodblock', 'bell'].map(bell => {
                          const isActive = settings.bellType === bell;
                          return (
                            <button
                              key={`bell-option-${bell}`}
                              onClick={() => {
                                setSettings({ ...settings, bellType: bell });
                                playBell(bell);
                              }}
                              className="py-3.5 text-[10px] font-black rounded-xl capitalize border transition-all active:scale-95 cursor-pointer"
                              style={{
                                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-card)',
                                borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                                color: isActive ? '#ffffff' : 'var(--text-muted)',
                                boxShadow: isActive ? '0 4px 12px var(--accent-shadow)' : 'none'
                              }}
                            >
                              {bell}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
