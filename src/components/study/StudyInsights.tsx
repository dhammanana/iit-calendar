import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Calendar as CalIcon, Flame, BarChart2 } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { format, startOfDay, subDays, isSameDay } from 'date-fns';

export interface StudySession {
  id: string;
  date: string;
  durationMs: number;
}

interface Props {
  show: boolean;
  onClose: () => void;
  sessions: StudySession[];
  inline?: boolean;
}

export function StudyInsights({ show, onClose, sessions, inline }: Props) {
  const { t } = useI18n();

  const today = startOfDay(new Date());

  // Stats
  const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
  const totalMin = Math.floor(totalMs / 60000);
  const focusHours = Math.floor(totalMin / 60);
  const focusMins = totalMin % 60;
  const timeFocusedStr = focusHours > 0 
    ? (focusMins > 0 ? `${focusHours}h ${focusMins}m` : `${focusHours}h`) 
    : `${focusMins}m`;
  const uniqueDays = new Set(sessions.map(s => startOfDay(new Date(s.date)).getTime())).size;

  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    const hasSession = sessions.some(s => isSameDay(startOfDay(new Date(s.date)), d));
    if (hasSession) { currentStreak++; }
    else if (i > 0) { break; }
  }

  // Last 7 days chart
  const chartDays = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(today, 6 - i);
    let ms = 0;
    sessions.forEach(s => {
      if (isSameDay(startOfDay(new Date(s.date)), d)) ms += s.durationMs;
    });
    return { label: format(d, 'E')[0], hours: ms / 3600000, isToday: i === 6 };
  });
  const maxHours = Math.max(...chartDays.map(d => d.hours), 1);

  const content = (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: Clock, value: timeFocusedStr, label: t('study.timeFocused') || t('study.hoursFocused') || 'Time Focused' },
          { icon: CalIcon, value: String(uniqueDays), label: t('study.daysAccessed') || 'Days Active' },
          { icon: Flame, value: String(currentStreak), label: t('study.dayStreak') || 'Day Streak' },
        ].map(({ icon: Icon, value, label }) => (
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

      {/* Focus chart */}
      <div
        className="rounded-[1.5rem] p-5"
        style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('study.focusHours') || 'Focus Hours — Last 7 Days'}
          </span>
        </div>

        <div className="flex items-end justify-between h-28 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {chartDays.map((day, i) => {
            const h = day.hours > 0 ? (day.hours / maxHours) * 100 : 0;
            return (
              <div key={i} className="flex flex-col items-center gap-2" style={{ width: `${100 / 7}%` }}>
                <div className="w-full flex justify-center h-20 items-end group relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.6, delay: i * 0.07 }}
                    className="w-5 sm:w-6 rounded-full"
                    style={{
                      backgroundColor: day.hours > 0
                        ? (day.isToday ? 'var(--accent)' : 'var(--accent-muted)')
                        : 'transparent',
                      minHeight: day.hours > 0 ? '4px' : '0',
                    }}
                  />
                  {day.hours > 0 && (
                    <div
                      className="absolute -top-7 text-[10px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                      {day.hours.toFixed(1)}h
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: day.isToday ? 'var(--accent)' : 'var(--text-faint)' }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Average */}
        <div className="flex justify-between items-center mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          <span>{t('study.weeklyAverage') || 'Daily average'}</span>
          <span style={{ color: 'var(--accent)' }}>
            {(chartDays.reduce((a, c) => a + c.hours, 0) / 7).toFixed(1)}h
          </span>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative"
            style={{ backgroundColor: 'var(--bg-card, white)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {t('study.insights') || 'Insights'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
