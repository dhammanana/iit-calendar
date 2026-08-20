import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, RotateCcw, Volume2, Activity, Award, Clock, Settings2, Pause, Sun, SunDim, ChevronLeft, ChevronRight, BarChart2, Settings as SettingsIcon, Vibrate, Plus, Trash2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

import { meditationDbService } from '../services/MeditationDbService';
import { bellSoundService } from '../services/BellSoundService';
import { vibrationService } from '../services/VibrationService';
import { useI18n } from '../hooks/useI18n';
import { useUI } from '../UIContext';
import { SegmentedControl } from '../components/SegmentedControl';
import { LabeledSelect } from '../components/LabeledSelect';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useMeditationTimer } from '../hooks/useMeditationTimer';
import { useMeditationInsights } from '../hooks/useMeditationInsights';
import { MeditationSession } from '../types';
import { ScreenIconInner } from '../components/common/ScreenIcon';

/** localStorage key for persisting meditation settings. */
const SETTINGS_KEY = 'meditation_settings';

/** Sound + Vibrate icon: Exact Lucide Volume2 speaker body with non-overlapping, cleanly spaced vibration waves */
function VolumeVibrateIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Exact Lucide Volume2 speaker body */}
      <path d="M11 4.702a.5.5 0 0 0-.812-.39L5.745 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.745l4.443 3.688a.5.5 0 0 0 .812-.39z" />
      {/* Clean, non-overlapping vibration waves (3px gap between waves) */}
      <path d="M14.5 8.5l1.5 1.75-1.5 1.75 1.5 1.75-1.5 1.75" />
      <path d="M19 7l1.8 2.5-1.8 2.5 1.8 2.5-1.8 2.5" />
    </svg>
  );
}

export function MeditationScreen() {
  const { t } = useI18n();
  const { setShowSettings } = useUI();

  const [stats, setStats] = useState<{ sessions: MeditationSession[] }>({ sessions: [] });
  const [view, setView] = useState<'timer' | 'insights' | 'config'>('timer');
  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('day');
  const [chartOffset, setChartOffset] = useState(0);

  // Add Missing Record modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recordTime, setRecordTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [recordHours, setRecordHours] = useState(0);
  const [recordMinutes, setRecordMinutes] = useState(15);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationMin = recordHours * 60 + recordMinutes;
    if (durationMin <= 0 || isSavingRecord) return;

    setIsSavingRecord(true);
    try {
      const [year, month, day] = recordDate.split('-').map(Number);
      const [hour, min] = recordTime.split(':').map(Number);
      const dt = new Date(year, month - 1, day, hour, min, 0, 0);
      await meditationDbService.addSession(durationMin, dt.toISOString());
      const updated = await meditationDbService.getStats();
      setStats(updated);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add missing meditation record:', err);
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm(t('meditation.deleteRecordConfirm') || 'Are you sure you want to delete this session?')) {
      await meditationDbService.deleteSession(id);
      const updated = await meditationDbService.getStats();
      setStats(updated);
    }
  };

  const formatSessionDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      if (isToday) return t('common.today') || 'Today';
      if (isYesterday) return 'Yesterday';

      const isCurrentYear = d.getFullYear() === now.getFullYear();
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(isCurrentYear ? {} : { year: 'numeric' })
      });
    } catch {
      return isoStr;
    }
  };

  const formatSessionTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
  };

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let alertMode = parsed.alertMode;
        const soundEnabled = parsed.soundEnabled ?? true;
        const vibrationEnabled = parsed.vibrationEnabled ?? true;
        if (!alertMode) {
          if (!soundEnabled && vibrationEnabled) {
            alertMode = 'vibrate';
          } else if (soundEnabled && !vibrationEnabled) {
            alertMode = 'sound';
          } else {
            alertMode = 'both';
          }
        }
        return {
          ...parsed,
          alertMode,
          soundEnabled: alertMode !== 'vibrate',
          vibrationEnabled: alertMode !== 'sound',
        };
      }
    } catch { }
    return {
      durationHours: 0,
      durationMinutes: 15,
      intervalMinutes: 0,
      intervalSeconds: 0,
      alertMode: 'both',
      soundEnabled: true,
      vibrationEnabled: true,
      delaySeconds: 5,
      bellType: 'bowl',
      keepScreenOn: false,
    };
  });

  const totalDurationMin = (settings.durationHours || 0) * 60 + (settings.durationMinutes || 0);
  const totalDurationMs = totalDurationMin * 60 * 1000;
  const intervalMs = ((settings.intervalMinutes || 0) * 60 + (settings.intervalSeconds || 0)) * 1000;

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const refreshStats = async () => {
      const dbStats = await meditationDbService.getStats();
      setStats(dbStats);
    };

    refreshStats();
    const unsubscribe = meditationDbService.subscribe(refreshStats);
    return () => {
      unsubscribe();
    };
  }, []);

  const {
    remainingMs,
    countdown,
    isRunning,
    isPaused,
    isFinished,
    wakeLock,
    toggleTimer,
    handleStop,
    resetTimer,
    toggleWakeLock,
  } = useMeditationTimer(totalDurationMs, intervalMs, settings);

  const cycleAlertMode = () => {
    const current = settings.alertMode || 'both';
    let nextMode: 'both' | 'sound' | 'vibrate';
    if (current === 'both') nextMode = 'sound';
    else if (current === 'sound') nextMode = 'vibrate';
    else nextMode = 'both';

    const nextSound = nextMode !== 'vibrate';
    const nextVib = nextMode !== 'sound';

    setSettings(s => ({
      ...s,
      alertMode: nextMode,
      soundEnabled: nextSound,
      vibrationEnabled: nextVib
    }));

    if (nextVib) vibrationService.vibrate('short');
  };

  const {
    chartData,
    maxMinutesInChart,
    weeklyMinutes,
    weeklySessionCount,
    totalMinutes,
    totalHours,
    currentStreak,
    progressPercent,
  } = useMeditationInsights(stats.sessions, chartView, chartOffset);

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
        className="w-full safe-header bg-gradient-to-tr from-teal-500/20 via-emerald-500/20 to-cyan-500/10 dark:from-[#092119] dark:via-[#05140f] dark:to-[#020a07] sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Styled CSS/SVG Zen Concentric Rings Art */}
        <svg className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3" viewBox="0 0 100 100">
          <defs>
            {/* Soft shadow filter for the circular pill container */}
            <filter id="pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#042017" floodOpacity="0.07" />
            </filter>

            {/* Gradients for the circular pill container */}
            <linearGradient id="pill-bg-light" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d2ede2" />
            </linearGradient>
            <linearGradient id="pill-bg-dark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10261f" />
              <stop offset="100%" stopColor="#091712" />
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
            .zen-pill-circle {
              fill: url(#pill-bg-light);
              stroke: rgba(255, 255, 255, 0.8);
            }
            .dark .zen-pill-circle {
              fill: url(#pill-bg-dark);
              stroke: rgba(52, 211, 153, 0.4);
            }
          ` }} />

          {/* Ripple waves pulsing outwards from the pill edge (r=18) - 5 waves total */}
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/20" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/20" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/20" style={{ animationDelay: '3.2s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/20" style={{ animationDelay: '4.8s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="zen-ripple text-emerald-500/25 dark:text-emerald-400/20" style={{ animationDelay: '6.4s' }} />

          {/* Pill Container (Circle) with Soft Shadow and Jade Gradient Fill */}
          <circle
            cx="50"
            cy="50"
            r="18"
            className="zen-pill-circle"
            strokeWidth="0.4"
            filter="url(#pill-shadow)"
          />

          {/* Meditation vector icon inside the pill from source SVG */}
          <ScreenIconInner
            name="meditation"
            x="38"
            y="38"
            width="24"
            height="24"
            className="text-emerald-800 dark:text-emerald-300"
          />
        </svg>
      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center flex flex-col items-center relative w-full pr-12 pl-12">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] leading-none mb-1.5">
            {t('common.meditate') || t('common.stillness') || 'Meditate'}
          </h1>
          {!isDistractionFree && (
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              icon={SettingsIcon}
              aria-label="Settings"
              className="absolute top-0 right-2 shadow-sm"
            />
          )}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-none">
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
                  { id: 'config', icon: Settings2, label: t('meditation.configure') || 'Settings' },
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

                      <Button
                        onClick={toggleTimer}
                        variant="primary"
                        size="lg"
                        icon={Play}
                        className="flex-1 h-14"
                      >
                        {t('meditation.startMeditation')}
                      </Button>

                      <button
                        onClick={cycleAlertMode}
                        title={`Alert Mode: ${settings.alertMode === 'vibrate'
                            ? 'Vibrate Only'
                            : settings.alertMode === 'sound'
                              ? 'Sound Only'
                              : 'Vibrate + Sound'
                          }`}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center transition-transform active:scale-90 border relative shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {settings.alertMode === 'vibrate' ? (
                          <Vibrate size={18} className="text-amber-500 dark:text-amber-400" />
                        ) : settings.alertMode === 'sound' ? (
                          <Volume2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <VolumeVibrateIcon size={18} className="text-[var(--accent)]" />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleStop}
                        variant="secondary"
                        size="lg"
                        icon={Square}
                        className="flex-1 h-14"
                      >
                        Stop
                      </Button>

                      <Button
                        onClick={toggleTimer}
                        variant="primary"
                        size="lg"
                        icon={isRunning ? Pause : Play}
                        className="flex-1 h-14"
                      >
                        {isRunning ? 'Pause' : 'Resume'}
                      </Button>
                    </>
                  )}
                </div>

                {isDistractionFree && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    {/* Keep Screen On button */}
                    <button
                      onClick={() => {
                        const next = !settings.keepScreenOn;
                        setSettings(s => ({ ...s, keepScreenOn: next }));
                        toggleWakeLock(next);
                      }}
                      className="h-10 flex items-center justify-center gap-2 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border cursor-pointer shrink-0"
                      style={{
                        backgroundColor: (wakeLock || settings.keepScreenOn) ? 'var(--accent-subtle)' : 'var(--surface)',
                        borderColor: (wakeLock || settings.keepScreenOn) ? 'var(--accent-muted)' : 'var(--border)',
                        color: (wakeLock || settings.keepScreenOn) ? 'var(--accent)' : 'var(--text-muted)'
                      }}
                    >
                      {(wakeLock || settings.keepScreenOn) ? (
                        <Sun size={12} className="animate-pulse" style={{ color: 'var(--accent)' }} />
                      ) : (
                        <SunDim size={12} style={{ color: 'var(--text-muted)' }} />
                      )}
                      Keep Screen On
                    </button>

                    {/* Icon-Only Alert Mode toggle button */}
                    <button
                      onClick={cycleAlertMode}
                      title={`Alert Mode: ${settings.alertMode === 'vibrate'
                          ? 'Vibrate Only'
                          : settings.alertMode === 'sound'
                            ? 'Sound Only'
                            : 'Vibrate + Sound'
                        }`}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 border relative shadow-sm cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {settings.alertMode === 'vibrate' ? (
                        <Vibrate size={16} className="text-amber-500 dark:text-amber-400" />
                      ) : settings.alertMode === 'sound' ? (
                        <Volume2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <VolumeVibrateIcon size={16} className="text-[var(--accent)]" />
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
                className="grid grid-cols-1 gap-4"
              >
                {/* Your Journey — 3 stat cards (matching Study Insights style) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(() => {
                    const hours = Math.floor(weeklyMinutes / 60);
                    const mins = weeklyMinutes % 60;
                    const formattedValue = hours > 0
                      ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`)
                      : `${mins}m`;
                    return [
                      { icon: Award, value: String(currentStreak), label: t('meditation.currentStreak') || 'Day Streak' },
                      {
                        icon: Clock,
                        value: formattedValue,
                        label: t('meditation.weeklyTime') || 'Weekly Time'
                      },
                      { icon: Activity, value: String(weeklySessionCount), label: t('meditation.sessions') || 'Sessions' },
                    ];
                  })().map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between text-center gap-1 min-w-0"
                      style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-muted)' }}
                    >
                      <div className="flex flex-col items-center justify-center flex-1 gap-1">
                        <Icon size={20} style={{ color: 'var(--accent)' }} />
                        <div
                          className={`font-black whitespace-nowrap tracking-tight ${value.length > 5 ? 'text-lg sm:text-xl' : value.length > 3 ? 'text-xl sm:text-2xl' : 'text-2xl'}`}
                          style={{ color: 'var(--accent)' }}
                        >
                          {value}
                        </div>
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider leading-tight text-center w-full h-6 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>{label}</div>
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
                      {(['day', 'week', 'month'] as const).map(chartTab => (
                        <button
                          key={chartTab}
                          onClick={() => { setChartView(chartTab); setChartOffset(0); }}
                          className={cn(
                            "px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all",
                            chartView === chartTab
                              ? "shadow-sm"
                              : "opacity-60 hover:opacity-100"
                          )}
                          style={chartView === chartTab ? { backgroundColor: 'var(--sm-card-bg)', color: 'var(--accent)' } : { color: 'var(--sm-text-secondary)' }}
                        >
                          {chartTab === 'day' ? 'Day' : chartTab === 'week' ? 'Week' : 'Month'}
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

                {/* Recent Sessions list */}
                <div
                  className="rounded-[1.5rem] p-5 space-y-4"
                  style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {t('meditation.recentSessions') || 'Recent Sessions'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* First Row: Add Missing Record Button */}
                    <button
                      onClick={() => {
                        setRecordDate(new Date().toISOString().split('T')[0]);
                        setRecordTime(new Date().toTimeString().slice(0, 5));
                        setRecordHours(0);
                        setRecordMinutes(15);
                        setShowAddModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-xs font-bold transition-all active:scale-[0.99] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--accent-subtle)',
                        borderColor: 'var(--accent-muted)',
                        color: 'var(--accent)'
                      }}
                    >
                      <Plus size={15} />
                      <span>{t('meditation.addMissingRecord') || 'Add Missing Record'}</span>
                    </button>

                    {stats.sessions.length === 0 ? (
                      <div className="text-center py-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {t('meditation.noSessionsYet') || 'No meditation sessions recorded yet'}
                      </div>
                    ) : (
                      stats.sessions.slice(0, 10).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all hover:border-[var(--accent-muted)] group"
                          style={{
                            backgroundColor: 'var(--sm-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                              <Calendar size={15} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-xs tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                {formatSessionDate(session.date)}
                              </span>
                              <span className="text-[10px] font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                {formatSessionTime(session.date)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                              style={{
                                backgroundColor: 'var(--accent-subtle)',
                                borderColor: 'var(--accent-muted)',
                                color: 'var(--accent)',
                              }}
                            >
                              {formatDuration(session.durationMin)}
                            </span>

                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title={t('common.delete') || 'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
                className="grid grid-cols-1 gap-4"
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

                    {/* Alert Options Section */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--sm-text-muted)' }}>
                        {t('meditation.alertMode') || 'Alert Options'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'both', label: t('meditation.vibrateAndSound') || 'Vibrate + Sound', icon: VolumeVibrateIcon },
                          { id: 'sound', label: t('meditation.soundOnly') || 'Sound Only', icon: Volume2 },
                          { id: 'vibrate', label: t('meditation.vibrateOnly') || 'Vibrate Only', icon: Vibrate }
                        ].map(mode => {
                          const isActive = (settings.alertMode || 'both') === mode.id;
                          const Icon = mode.icon;
                          return (
                            <button
                              key={`alert-mode-${mode.id}`}
                              onClick={() => {
                                const nextSound = mode.id !== 'vibrate';
                                const nextVib = mode.id !== 'sound';
                                setSettings(s => ({
                                  ...s,
                                  alertMode: mode.id,
                                  soundEnabled: nextSound,
                                  vibrationEnabled: nextVib
                                }));
                                if (nextVib) vibrationService.vibrate('short');
                              }}
                              className="py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer text-center"
                              style={{
                                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-card)',
                                borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                                color: isActive ? '#ffffff' : 'var(--text-primary)',
                                boxShadow: isActive ? '0 4px 12px var(--accent-shadow)' : 'none'
                              }}
                            >
                              <Icon size={18} className={isActive ? 'text-white' : 'text-[var(--accent)]'} />
                              <span className="text-[10px] font-black uppercase tracking-tight leading-tight">
                                {mode.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bell Type Section */}
                    <div className={cn(settings.alertMode === 'vibrate' && "opacity-50 pointer-events-none")}>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--sm-text-muted)' }}>
                        {t('meditation.bellType')} {settings.alertMode === 'vibrate' && '(Muted in Vibrate Only)'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['bowl', 'gong', 'chime', 'tibetan', 'woodblock', 'bell'].map(bell => {
                          const isActive = settings.bellType === bell;
                          return (
                            <button
                              key={`bell-option-${bell}`}
                              onClick={() => {
                                setSettings({ ...settings, bellType: bell });
                                bellSoundService.playBell(true, bell);
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
      {/* Modal for Adding Missing Record */}
      <Modal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('meditation.addMissingRecord') || 'Add Missing Record'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveRecord} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('meditation.pastSessionDate') || 'Date'}
            </label>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none font-sans text-base transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input, var(--sm-surface))',
                borderColor: 'var(--border-base, var(--sm-border))',
                color: 'var(--text-primary, var(--sm-text-primary))',
              }}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('meditation.pastSessionTime') || 'Time'}
            </label>
            <input
              type="time"
              value={recordTime}
              onChange={(e) => setRecordTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none font-sans text-base transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input, var(--sm-surface))',
                borderColor: 'var(--border-base, var(--sm-border))',
                color: 'var(--text-primary, var(--sm-text-primary))',
              }}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('meditation.duration') || 'Duration'}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <LabeledSelect
                  value={recordHours}
                  onChange={(val) => setRecordHours(parseInt(val))}
                  options={Array.from({ length: 24 }).map((_, i) => ({
                    value: i,
                    label: i.toString().padStart(2, '0')
                  }))}
                  badgeLabel="Hours"
                />
              </div>
              <span className="text-xl font-serif" style={{ color: 'var(--sm-border)' }}>:</span>
              <div className="flex-1">
                <LabeledSelect
                  value={recordMinutes}
                  onChange={(val) => setRecordMinutes(parseInt(val))}
                  options={Array.from({ length: 60 }).map((_, i) => ({
                    value: i,
                    label: i.toString().padStart(2, '0')
                  }))}
                  badgeLabel="Minutes"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={recordHours * 60 + recordMinutes === 0 || isSavingRecord}
              className="flex-1"
            >
              {t('meditation.addRecord') || 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
