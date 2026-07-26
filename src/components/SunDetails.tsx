import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { 
  Clock, 
  ChevronUp,
  ChevronDown, 
  Sunrise, 
  Sun, 
  Sunset
} from 'lucide-react';
import { SunTimesCalculator } from '../lib/calendar/SunTimesCalculator';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { cn } from '../lib/utils';
import { alarmService } from '../services/alarm/AlarmService';
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

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{label}</span>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</span>
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

  const getPercent = (d: Date | number | undefined) => {
    if (!d) return 0;
    const jsDate = typeof d === 'number' ? new Date(d) : d;
    if (isNaN(jsDate.getTime())) return 0;
    const val = jsDate.getHours() * 3600000 + jsDate.getMinutes() * 60000 + jsDate.getSeconds() * 1000;
    return (val / (24 * 3600000)) * 100;
  };

  const getSunPosition = () => {
    const now = new Date();
    const target = new Date(date);
    target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const val = target.getHours() * 3600000 + target.getMinutes() * 60000 + target.getSeconds() * 1000;
    const dayPercent = (val / (24 * 3600000)) * 100;
    const t = Math.max(0, Math.min(1, dayPercent / 100));

    const xVal = t * 100;
    // Parabolic arc: y(t) = 38 - 95 * t * (1 - t)
    const yVal = 38 - 95 * t * (1 - t);

    return {
      xPercent: Math.max(1, Math.min(99, xVal)),
      yPercent: (yVal / 40) * 100,
    };
  };

  const sunPos = getSunPosition();

  const startOfDay = new Date(date).setHours(0,0,0,0);

  const getTime = (d: Date | undefined) => d ? d.getTime() : startOfDay;

  const phases = [
    { label: t('sun.night'), color: 'bg-black', start: startOfDay, end: getTime(times.nightEnd) },
    { label: 'Astro', color: 'bg-slate-900', start: getTime(times.nightEnd), end: getTime(times.nauticalDawn) },
    { label: 'Nautical', color: 'bg-slate-800', start: getTime(times.nauticalDawn), end: getTime(times.dawn) },
    { label: 'Civil', color: 'bg-sky-900', start: getTime(times.dawn), end: getTime(times.sunrise) },
    { label: t('sun.daylight'), color: 'bg-sky-400', start: getTime(times.sunrise), end: getTime(times.sunset) },
    { label: 'Civil', color: 'bg-sky-900', start: getTime(times.sunset), end: getTime(times.dusk) },
    { label: 'Nautical', color: 'bg-slate-800', start: getTime(times.dusk), end: getTime(times.nauticalDusk) },
    { label: 'Astro', color: 'bg-slate-900', start: getTime(times.nauticalDusk), end: getTime(times.night) },
    { label: t('sun.night'), color: 'bg-black', start: getTime(times.night), end: startOfDay + 24 * 60 * 60 * 1000 },
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
          className="mt-8 pt-6 border-t border-slate-200/50 overflow-hidden space-y-8"
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
                </defs>

                {/* Day Arc Gradient Fill */}
                <path d="M 0 38 Q 50 -10 100 38 L 100 38 L 0 38 Z" fill="url(#sunArcGrad)" />

                {/* Day Arc Dashed Line */}
                <path 
                  d="M 0 38 Q 50 -10 100 38" 
                  fill="none" 
                  stroke="#e8ac41" 
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

              {/* Sun Position Dot */}
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
            </div>

            {/* Baseline Labels (RISE, MERIDIAN, SET) directly below horizon line */}
            <div className="flex justify-between items-start pt-1 px-1">
              <Marker label={t('sun.rise')} time={safeFormat(times.sunrise, 'HH:mm')} align="start" />
              <Marker label={t('sun.meridian')} time={safeFormat(times.solarNoon, 'HH:mm')} align="center" />
              <Marker label={t('sun.set')} time={safeFormat(times.sunset, 'HH:mm')} align="end" />
            </div>
          </div>

          {/* Horizontal Bar Graph */}
          <div className="pt-6 space-y-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex flex-col gap-0.5">
                <h5 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('sun.dayNightCycle')}</h5>
                {selectedPhase !== null && (
                  <motion.span 
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-bold text-saffron flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron" />
                    {phases[selectedPhase].label}: {format(phases[selectedPhase].start, 'HH:mm')} - {format(phases[selectedPhase].end, 'HH:mm')}
                  </motion.span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500">{t('sun.timeline')}</span>
            </div>
            <div className="h-8 w-full rounded-xl overflow-hidden flex bg-black shadow-inner border border-white/10 ring-4 ring-black/5 cursor-pointer">
              {phases.map((p, i) => {
                const width = Math.max(0, getPercent(p.end) - getPercent(p.start));
                if (width <= 0) return null;
                return (
                  <div 
                    key={i} onClick={() => setSelectedPhase(selectedPhase === i ? null : i)}
                    className={cn(
                      "h-full relative group border-r border-white/5 last:border-0 transition-all", 
                      p.color,
                      selectedPhase === i ? "opacity-100 ring-2 ring-inset ring-white/30" : "opacity-80 hover:opacity-100"
                    )} 
                    style={{ width: `${width}%` }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between w-full text-xs font-black text-slate-400 dark:text-slate-500 px-2 uppercase tracking-tighter">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <LegendItem color="bg-black" label={t('sun.night')} />
            <LegendItem color="bg-slate-800" label={t('sun.twilight')} />
            <LegendItem color="bg-sky-400" label={t('sun.daylight')} />
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
              <button 
                onClick={toggleNoonBell}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95",
                  settings.solarNoonBell 
                    ? "bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600" 
                    : "bg-saffron text-white hover:bg-saffron/90"
                )}
              >
                {settings.solarNoonBell ? 'Disable' : 'Enable'}
              </button>
            </div>

            {/* Dawn Alert Row */}
            <div className="col-span-2 sm:col-span-1 mt-2 flex items-center justify-between p-4 rounded-2xl bg-saffron/5 border border-saffron/20">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl transition-colors", settings.dawnBell ? "bg-saffron text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500")}>
                  {settings.dawnBell ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Dawn Alert</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {settings.dawnBell ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <button 
                onClick={toggleDawnBell}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95",
                  settings.dawnBell 
                    ? "bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600" 
                    : "bg-saffron text-white hover:bg-saffron/90"
                )}
              >
                {settings.dawnBell ? 'Disable' : 'Enable'}
              </button>
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
