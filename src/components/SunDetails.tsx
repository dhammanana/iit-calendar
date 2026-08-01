import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  Clock, 
  ChevronUp,
  ChevronDown, 
  Sunrise, 
  Sun, 
  Sunset,
  X
} from 'lucide-react';
import { SunTimesCalculator } from '../lib/calendar/SunTimesCalculator';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { cn } from '../lib/utils';
import { alarmService } from '../services/alarm/AlarmService';
import { Toggle } from './Toggle';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface SunTimeItemProps {
  icon: React.ReactNode;
  label: string;
  time: string;
  color: string;
  hasBorder?: boolean;
  active: boolean;
}

function SunTimeItem({ icon, label, time, color, hasBorder, active }: SunTimeItemProps) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1.5 flex-1 transition-all duration-500",
      hasBorder && "border-x border-slate-200/50 dark:border-slate-700/50",
      active ? "scale-100" : "scale-110"
    )}>
      <div className={cn("transition-transform duration-500", active && "scale-125 translate-y-[-4px]", color)}>{icon}</div>
      <span className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight"
        style={{color: 'var(--accent)'}}>{time}
      </span>
    </div>
  );
}

function Marker({ label, time, align }: { label: string, time: string, align: 'start' | 'center' | 'end' }) {
  return (
    <div className={cn(
      "flex flex-col space-y-1",
      align === 'center' && "items-center",
      align === 'end' && "items-end text-right"
    )}>
      <span className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">{time}</span>
    </div>
  );
}

function LegendItem({ 
  color, 
  label, 
  active, 
  onClick 
}: { 
  color: string; 
  label: string; 
  active?: boolean; 
  onClick?: () => void; 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none",
        active 
          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] shadow-xs scale-105" 
          : "border-[var(--border-subtle)] bg-[var(--bg-card-alt)]/60 text-[var(--text-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text-primary)]"
      )}
    >
      <div className={cn("w-2.5 h-2.5 rounded-full shadow-xs shrink-0", color)} />
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col justify-between h-full space-y-1">
      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{value}</span>
    </div>
  );
}

import { Bell, BellOff, Volume2 } from 'lucide-react';

export function SunDetails({ 
  expanded, 
  setExpanded, 
  settings, 
  onUpdateSettings,
  date, 
  calculator,
  activeDawn 
}: { 
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  date: Date;
  calculator: SunTimesCalculator;
  activeDawn: Date;
}) {
  const { t } = useI18n();
  const times = calculator.getStandardTimes(date);
  const currentTime = new Date();
  const [selectedPhase, setSelectedPhase] = React.useState<number | null>(null);

  const playPreviewBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("AudioContext preview failed", e);
    }
  };

  const toggleNoonBell = async () => {
    const nextVal = !settings.solarNoonBell;
    if (nextVal) {
      playPreviewBeep();
    }
    onUpdateSettings({ ...settings, solarNoonBell: nextVal });
  };

  const toggleDawnBell = async () => {
    const nextVal = !settings.dawnBell;
    if (nextVal) {
      playPreviewBeep();
    }
    onUpdateSettings({ ...settings, dawnBell: nextVal });
  };

  const handleTestAlarms = async () => {
    let debugLog: string[] = [];
    try {
      if (Capacitor.isNativePlatform()) {
        const perms = await LocalNotifications.checkPermissions();
        debugLog.push(`Perms: ${JSON.stringify(perms)}`);
        
        if (Capacitor.getPlatform() === 'android') {
           const exactStatus = await LocalNotifications.checkExactNotificationSetting();
           debugLog.push(`Exact Alarm: ${JSON.stringify(exactStatus)}`);
           
           const channels = await LocalNotifications.listChannels();
           debugLog.push(`Channels count: ${channels.channels?.length || 0}`);
           const noonChannels = channels.channels?.filter(c => c.id.includes('noon')) || [];
           debugLog.push(`Noon channels (limit 3 shown):`);
           noonChannels.slice(0, 3).forEach(c => {
             debugLog.push(` - ${c.id}: snd=${c.sound}, imp=${c.importance}`);
           });
        }
      } else {
        debugLog.push("Platform: Web");
      }

      try {
        const testAudio = new Audio(`/sounds/${settings.noonVoiceAlert ? 'noon_5.wav' : 'bell.wav'}`);
        testAudio.play().catch(e => console.warn("HTML Audio preview failed", e));
      } catch (e) {}

      const now = new Date();
      const testItems = [10, 25, 40].map((sec, i) => {
        // Use different voice prompts if voice alert is enabled
        const m = [5, 3, 0][i]; 
        const soundFile = settings.noonVoiceAlert ? `noon_${m}.wav` : 'bell.wav';
        const channelId = settings.noonVoiceAlert ? `solar_noon_v7_${m}` : 'solar_noon_v7';

        debugLog.push(`[Test ${i+1}] ${sec}s | chan: ${channelId} | snd: ${soundFile}`);

        return {
          id: 9000 + i,
          title: "Test Alarm",
          body: `Notification test ${i+1} (${sec}s) - ${settings.noonVoiceAlert ? `Voice ${m}m` : 'Bell'}`,
          at: new Date(now.getTime() + sec * 1000),
          sound: soundFile,
          channelId: channelId,
          allowWhileIdle: true,
          exact: true
        };
      });
      
      alert(`Debug Log:\n${debugLog.join('\n')}\n\nScheduling 3 test alarms... Close app to test!`);
      await alarmService.scheduleTest(testItems);
    } catch (e: any) {
      debugLog.push(`Error: ${e.message || e}`);
      alert(`Debug Log Error:\n${debugLog.join('\n')}`);
    }
  };

  const safeFormat = (d: Date | undefined | null, fmt: string) => {
    if (!d || isNaN(d.getTime())) return '--:--';
    return format(d, fmt);
  };

  const startOfDay = new Date(date).setHours(0,0,0,0);

  const getPercent = (d: Date | number | undefined) => {
    if (!d) return 0;
    const jsDate = typeof d === 'number' ? new Date(d) : d;
    if (isNaN(jsDate.getTime())) return 0;
    const msFromStart = jsDate.getTime() - startOfDay;
    if (msFromStart >= 24 * 3600000) return 100;
    if (msFromStart <= 0) return 0;
    const val = jsDate.getHours() * 3600000 + jsDate.getMinutes() * 60000 + jsDate.getSeconds() * 1000;
    return (val / (24 * 3600000)) * 100;
  };

  const formatPhaseTime = (d: Date | number) => {
    const jsDate = typeof d === 'number' ? new Date(d) : d;
    if (jsDate.getTime() >= startOfDay + 24 * 3600000) return '24:00';
    return format(jsDate, 'HH:mm');
  };

  const getSunPosition = () => {
    const now = new Date();
    const target = new Date(date);
    target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const nowMs = target.getTime();

    const sr = times.sunrise ? times.sunrise.getTime() : 0;
    const ss = times.sunset ? times.sunset.getTime() : 0;
    const isNight = sr > 0 && ss > 0 ? (nowMs < sr || nowMs > ss) : false;

    const val = target.getHours() * 3600000 + target.getMinutes() * 60000 + target.getSeconds() * 1000;
    const dayPercent = (val / (24 * 3600000)) * 100;
    const t = Math.max(0, Math.min(1, dayPercent / 100));

    const xVal = t * 100;
    // Parabolic arc: y(t) = 38 - 95 * t * (1 - t)
    const yVal = 38 - 95 * t * (1 - t);

    return {
      xPercent: Math.max(1, Math.min(99, xVal)),
      yPercent: (yVal / 40) * 100,
      isNight
    };
  };

  const sunPos = getSunPosition();

  const getTime = (d: Date | undefined) => d ? d.getTime() : startOfDay;

  const formatDuration = (startMs: number, endMs: number) => {
    const diffMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const phases = [
    { category: 'night', label: t('sun.night'), color: 'bg-slate-950 dark:bg-black', dotColor: 'bg-slate-950 border border-slate-700', start: startOfDay, end: getTime(times.nightEnd) },
    { category: 'twilight', label: 'Astro Twilight', color: 'bg-indigo-950 dark:bg-indigo-950', dotColor: 'bg-indigo-950', start: getTime(times.nightEnd), end: getTime(times.nauticalDawn) },
    { category: 'twilight', label: 'Nautical Twilight', color: 'bg-indigo-600 dark:bg-indigo-700', dotColor: 'bg-indigo-600', start: getTime(times.nauticalDawn), end: getTime(times.dawn) },
    { category: 'twilight', label: 'Civil Twilight', color: 'bg-orange-500 dark:bg-orange-500', dotColor: 'bg-orange-500', start: getTime(times.dawn), end: getTime(times.sunrise) },
    { category: 'daylight', label: t('sun.daylight'), color: 'bg-amber-400 dark:bg-amber-400', dotColor: 'bg-amber-400', start: getTime(times.sunrise), end: getTime(times.sunset) },
    { category: 'twilight', label: 'Civil Twilight', color: 'bg-orange-500 dark:bg-orange-500', dotColor: 'bg-orange-500', start: getTime(times.sunset), end: getTime(times.dusk) },
    { category: 'twilight', label: 'Nautical Twilight', color: 'bg-indigo-600 dark:bg-indigo-700', dotColor: 'bg-indigo-600', start: getTime(times.dusk), end: getTime(times.nauticalDusk) },
    { category: 'twilight', label: 'Astro Twilight', color: 'bg-indigo-950 dark:bg-indigo-950', dotColor: 'bg-indigo-950', start: getTime(times.nauticalDusk), end: getTime(times.night) },
    { category: 'night', label: t('sun.night'), color: 'bg-slate-950 dark:bg-black', dotColor: 'bg-slate-950 border border-slate-700', start: getTime(times.night), end: startOfDay + 24 * 60 * 60 * 1000 },
  ];

  return (
    <div className="glass-card rounded-[2rem] p-4 overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{t('sun.solarEvents')}</span>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className={cn("p-1.5 rounded-full transition-transform duration-300", expanded && "rotate-180")}
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0 relative">
        <SunTimeItem 
          icon={<div className="relative"><Sunrise size="1.4em"/><ChevronUp size="0.75em" className="absolute -top-1 -right-1 text-gold"/></div>} 
          label={t('sun.dawn')} 
          time={safeFormat(activeDawn, 'hh:mm a')} 
          color="text-gold" 
          active={expanded}
        />
        <SunTimeItem 
          icon={<Sun size="1.4em"/>} 
          label={t('sun.sunrise')} 
          time={safeFormat(times.sunrise, 'hh:mm a')} 
          color="text-saffron" 
          hasBorder 
          active={expanded}
        />
        <SunTimeItem 
          icon={<Sunset size="1.4em"/>} 
          label={t('sun.noon')} 
          time={safeFormat(times.solarNoon, 'hh:mm a')} 
          color="text-lotus" 
          active={expanded}
        />
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-8 pt-6 border-t border-slate-200/50 dark:border-stone-800/60 overflow-hidden space-y-8"
        >
          {/* Solar Arc Graphic */}
          <div className="w-full max-w-xl mx-auto px-2 pt-2">
            <div className="relative w-full h-20 sm:h-24 overflow-visible">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sunArcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8ac41" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#e8ac41" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="nightArcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Arc Gradient Fill (Day / Night) */}
                <path 
                  d="M 0 38 Q 50 -10 100 38 L 100 38 L 0 38 Z" 
                  fill={sunPos.isNight ? "url(#nightArcGrad)" : "url(#sunArcGrad)"} 
                />

                {/* Arc Dashed Line */}
                <path 
                  d="M 0 38 Q 50 -10 100 38" 
                  fill="none" 
                  stroke={sunPos.isNight ? "#475569" : "#e8ac41"} 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Baseline (Horizon) */}
                <line 
                  x1="0" y1="38" x2="100" y2="38" 
                  stroke="var(--border, #cbd5e1)" 
                  strokeWidth="1.5" 
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Sun Position Dot (Hides completely at night) */}
              {!sunPos.isNight && (
                <motion.div
                  initial={false}
                  animate={{
                    left: `${sunPos.xPercent}%`,
                    top: `${sunPos.yPercent}%`,
                  }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-5 h-5 rounded-full bg-amber-500/25 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-[#7f5700] dark:bg-amber-400 border-2 border-white dark:border-slate-800 shadow-[0_0_6px_rgba(127,87,0,0.5)]" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Baseline Labels (RISE, MERIDIAN, SET) directly below horizon line */}
            <div className="flex justify-between items-start pt-1 px-1">
              <Marker label={t('sun.rise')} time={safeFormat(times.sunrise, 'HH:mm')} align="start" />
              <Marker label={t('sun.meridian')} time={safeFormat(times.solarNoon, 'HH:mm')} align="center" />
              <Marker label={t('sun.set')} time={safeFormat(times.sunset, 'HH:mm')} align="end" />
            </div>
          </div>

          {/* Horizontal Bar Graph */}
          <div className="pt-6 space-y-3">
            <div className="flex justify-between items-center px-1 mb-1">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                {t('sun.dayNightCycle')}
              </h5>
              <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
                {t('sun.timeline')}
              </span>
            </div>

            <div className="h-9 sm:h-10 w-full rounded-2xl overflow-hidden flex bg-slate-950 dark:bg-stone-950 border border-amber-500/20 dark:border-amber-400/20 shadow-inner p-0.5 cursor-pointer relative">
              {phases.map((p, i) => {
                const width = Math.max(0, getPercent(p.end) - getPercent(p.start));
                if (width <= 0) return null;
                const isSelected = selectedPhase === i;
                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedPhase(isSelected ? null : i)}
                    className={cn(
                      "h-full relative group transition-all duration-200 first:rounded-l-xl last:rounded-r-xl border-r border-white/10 last:border-0", 
                      p.color,
                      isSelected 
                        ? "opacity-100 ring-2 ring-amber-400 dark:ring-amber-400 z-10 scale-[1.02] shadow-[0_0_12px_rgba(232,172,65,0.4)]" 
                        : selectedPhase !== null
                          ? "opacity-40 hover:opacity-85"
                          : "opacity-90 hover:opacity-100"
                    )} 
                    style={{ width: `${width}%` }}
                    title={`${p.label}: ${formatPhaseTime(p.start)} - ${formatPhaseTime(p.end)}`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  </div>
                );
              })}
            </div>

            <div className="relative w-full pt-1 px-1">
              <div className="flex justify-between w-full text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          {/* Selected Phase Info Panel (between visual and legend) */}
          <div className="min-h-[38px] flex items-center justify-center pt-1">
            <AnimatePresence mode="wait">
              {selectedPhase !== null ? (
                <motion.div
                  key={selectedPhase}
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />
                  <span>{phases[selectedPhase].label}:</span>
                  <span className="font-bold tracking-tight text-[var(--accent)]">{formatPhaseTime(phases[selectedPhase].start)} – {formatPhaseTime(phases[selectedPhase].end)}</span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    ({formatDuration(phases[selectedPhase].start, phases[selectedPhase].end)})
                  </span>
                  <button
                    onClick={() => setSelectedPhase(null)}
                    className="ml-1 p-0.5 rounded-full hover:bg-[var(--accent)]/15 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[11px] font-medium text-[var(--text-faint)] italic tracking-wide"
                >
                  Tap a segment or legend item to inspect timing
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center pt-1">
            <LegendItem 
              color="bg-slate-950 border border-slate-700" 
              label={t('sun.night')} 
              active={selectedPhase !== null && phases[selectedPhase]?.category === 'night'}
              onClick={() => {
                const nightIndices = phases.reduce((acc: number[], p, idx) => p.category === 'night' ? [...acc, idx] : acc, []);
                if (selectedPhase === null || !nightIndices.includes(selectedPhase)) {
                  setSelectedPhase(nightIndices[0] ?? null);
                } else {
                  const nextPos = (nightIndices.indexOf(selectedPhase) + 1) % (nightIndices.length + 1);
                  setSelectedPhase(nextPos < nightIndices.length ? nightIndices[nextPos] : null);
                }
              }}
            />
            <LegendItem 
              color="bg-indigo-600 dark:bg-indigo-600" 
              label={t('sun.twilight')} 
              active={selectedPhase !== null && phases[selectedPhase]?.category === 'twilight'}
              onClick={() => {
                const twilightIndices = phases.reduce((acc: number[], p, idx) => p.category === 'twilight' ? [...acc, idx] : acc, []);
                if (selectedPhase === null || !twilightIndices.includes(selectedPhase)) {
                  setSelectedPhase(twilightIndices[0] ?? null);
                } else {
                  const nextPos = (twilightIndices.indexOf(selectedPhase) + 1) % (twilightIndices.length + 1);
                  setSelectedPhase(nextPos < twilightIndices.length ? twilightIndices[nextPos] : null);
                }
              }}
            />
            <LegendItem 
              color="bg-amber-400 dark:bg-amber-400" 
              label={t('sun.daylight')} 
              active={selectedPhase !== null && phases[selectedPhase]?.category === 'daylight'}
              onClick={() => {
                const daylightIdx = phases.findIndex(p => p.category === 'daylight');
                if (daylightIdx !== -1) {
                  setSelectedPhase(selectedPhase === daylightIdx ? null : daylightIdx);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-8 p-6 rounded-[2rem]" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
            <DetailRow label={t('sun.traditionDawn')} value={safeFormat(activeDawn, 'hh:mm:ss a')} />
            <DetailRow label={t('sun.solarNoon')} value={safeFormat(times.solarNoon, 'hh:mm:ss a')} />
            {/* Solar Noon Alert Row */}
            <div className="col-span-2 sm:col-span-1 mt-2 flex items-center justify-between p-4 rounded-2xl bg-saffron/5 border border-saffron/20">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl transition-colors", settings.solarNoonBell ? "bg-saffron text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500")}>
                  {settings.solarNoonBell ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Solar Noon Alert</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {settings.solarNoonBell ? (
                      `${settings.noonMultiAlert ? '5-1m' : '5m'} ${settings.noonVoiceAlert ? 'Voice' : 'Bell'}${settings.noonSafeOffset ? ` +${settings.noonSafeOffset}m safe` : ''}`
                    ) : 'Inactive'}
                  </span>
                </div>
              </div>
              <Toggle value={settings.solarNoonBell} onToggle={toggleNoonBell} />
            </div>

            {/* Dawn Alert Row */}
            <div className="col-span-2 sm:col-span-1 mt-2 flex items-center justify-between p-4 rounded-2xl bg-saffron/5 border border-saffron/20">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl transition-colors", settings.dawnBell ? "bg-saffron text-white" : "bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400")}>
                  {settings.dawnBell ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Dawn Alert</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {settings.dawnBell ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <Toggle value={settings.dawnBell} onToggle={toggleDawnBell} />
            </div>
            <DetailRow label={t('sun.civilTwilight')} value={`${safeFormat(times.dawn, 'HH:mm')} - ${safeFormat(times.sunrise, 'HH:mm')}`} />
            <DetailRow label={t('sun.astroTwilight')} value={`${safeFormat(times.nightEnd, 'HH:mm')} - ${safeFormat(times.nauticalDawn, 'HH:mm')}`} />
            <DetailRow label={t('sun.dayLength')} value={times.sunset && times.sunrise ? `${Math.floor((times.sunset.getTime() - times.sunrise.getTime()) / 3600000)}h ${Math.floor(((times.sunset.getTime() - times.sunrise.getTime()) % 3600000) / 60000)}m` : '--:--'} />
            <DetailRow label={t('sun.nadirPoint')} value={safeFormat(times.nadir, 'hh:mm a')} />
          </div>

          {/* Test Button for Debugging */}
          <div className="flex justify-center pb-4">
            <button 
              onClick={handleTestAlarms}
              className="px-6 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-saffron transition-colors"
            >
              Test Alarms (10s, 25s, 40s)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
