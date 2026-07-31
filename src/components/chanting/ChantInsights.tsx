import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Award, Zap, TrendingUp, Calendar, Flame, Clock, BarChart2 } from 'lucide-react';
import { UserChant, ChantSession, UserChantStats } from '../../types';
import { cn } from '../../lib/utils';
import { format, startOfDay, subDays, isSameDay } from 'date-fns';
import { useI18n } from '../../hooks/useI18n';

import { getChantTitle } from '../../services/ChantService';

interface ChantInsightsProps {
  chants: UserChant[];
  sessions: ChantSession[];
  stats: UserChantStats;
}

export function ChantInsights({ chants, sessions, stats }: ChantInsightsProps) {
  const { t } = useI18n();
  const totalChants = chants.reduce((sum, c) => sum + c.totalCount, 0);
  const totalTimeMin = sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  const totalTimeHours = Math.floor(totalTimeMin / 60);
  const totalTimeRemainderMin = totalTimeMin % 60;
  
  // Aggregate data for Pie Chart
  const pieData = chants
    .filter(c => c.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)
    .map(c => ({
      name: getChantTitle(c, t),
      value: c.totalCount,
      percent: Math.round((c.totalCount / (totalChants || 1)) * 100)
    }));

  const COLORS = ['#7f5700', '#d48820', '#e8ac41', '#f5bc5f', '#f9d191'];

  // Consistency Grid (Last 28 days)
  const today = startOfDay(new Date());
  const gridDays = Array.from({ length: 28 }).map((_, i) => {
    const date = subDays(today, 27 - i);
    const daySessions = sessions.filter(s => isSameDay(new Date(s.timestamp), date));
    const total = daySessions.reduce((sum, s) => sum + s.count, 0);
    return { date, total };
  });

  return (
    <div className="space-y-6">
      {/* Stat cards (3 quick stats) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: Flame, value: String(stats.streakDays), label: t('chant.dayStreak') || 'Day Streak' },
          { icon: TrendingUp, value: totalChants.toLocaleString(), label: t('chant.totalChants') || 'Total Chants' },
          { icon: Clock, value: totalTimeHours > 0 ? `${totalTimeHours}h ${totalTimeRemainderMin}m` : `${totalTimeRemainderMin}m`, label: t('chant.totalTime') || 'Total Time' },
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

      {/* Distribution Chart */}
      <div
        className="rounded-[1.5rem] p-5"
        style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('chant.chantDistribution') || 'Chant Distribution'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Award className="text-[var(--accent)] opacity-40" size={32} />
            </div>
          </div>
          <div className="flex-1 space-y-4 w-full">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consistency Grid */}
      <div
        className="rounded-[1.5rem] p-5"
        style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Calendar size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('chant.practiceConsistency') || 'Practice Consistency'}
          </span>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {gridDays.map((day, i) => {
            const opacity = day.total === 0 ? 'bg-[var(--bg-muted)]/50' : 
                            day.total < 10 ? 'bg-[var(--accent)]/20' :
                            day.total < 50 ? 'bg-[var(--accent)]/50' :
                            day.total < 100 ? 'bg-[var(--accent)]/80' : 'bg-[var(--accent)]';
            return (
              <motion.div
                key={i}
                title={`${format(day.date, 'MMM d')}: ${day.total} chants`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={cn("aspect-square rounded-[0.5rem] transition-all", opacity)}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-4 text-[0.6rem] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
          <span>{t('chant.less')}</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-sm bg-[var(--bg-muted)]/50" />
            <div className="w-2 h-2 rounded-sm bg-[var(--accent)]/20" />
            <div className="w-2 h-2 rounded-sm bg-[var(--accent)]/50" />
            <div className="w-2 h-2 rounded-sm bg-[var(--accent)]/80" />
            <div className="w-2 h-2 rounded-sm bg-[var(--accent)]" />
          </div>
          <span>{t('chant.more')}</span>
        </div>
      </div>

      {/* Milestones */}
      <div
        className="rounded-[1.5rem] p-5"
        style={{ backgroundColor: 'var(--bg-card, var(--bg-main))', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Award size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('chant.milestones') || 'Milestones'}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-6 italic">"Your spiritual journey is blossoming beautifully."</p>

        {/* Badges/Rankings */}
        <div className="flex justify-center gap-6">
          <Badge type={t('chant.novice')} active={totalChants < 1000} t={t} />
          <Badge type={t('chant.devotee')} active={totalChants >= 1000 && totalChants < 5000} t={t} />
          <Badge type={t('chant.master')} active={totalChants >= 5000} t={t} />
        </div>
      </div>
    </div>
  );
}

function Badge({ type, active, t }: { type: string, active: boolean, t: any }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-3 transition-opacity",
      active ? "opacity-100" : "opacity-30"
    )}>
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center border-2",
        active ? "border-[var(--accent)] bg-[var(--bg-card-alt)] shadow-lg shadow-[var(--accent)]/10" : "border-[var(--border-subtle)] bg-[var(--bg-muted)]/30"
      )}>
        <Award size={24} className={active ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} />
      </div>
      <span className={cn(
        "text-[0.65rem] font-black uppercase tracking-widest",
        active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
      )}>{type}</span>
    </div>
  );
}
