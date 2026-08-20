import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Target, ChevronLeft, ChevronRight, Edit3, Minus, Plus } from 'lucide-react';
import { ChantSession } from '../../types';
import { cn } from '../../lib/utils';
import { format, startOfDay, isSameDay, startOfWeek, addDays, addWeeks, isFuture, isToday } from 'date-fns';
import { useI18n } from '../../hooks/useI18n';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface ChantGoalsCardProps {
  sessions: ChantSession[];
}

const PRESET_GOALS = [7, 21, 54, 108];

export function ChantGoalsCard({ sessions }: ChantGoalsCardProps) {
  const { t } = useI18n();

  // Daily goal persisted in localStorage (default: 108)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chant_daily_goal');
      const parsed = saved ? parseInt(saved, 10) : 108;
      return parsed > 0 ? parsed : 108;
    } catch {
      return 108;
    }
  });

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState<number>(dailyGoal);

  // Sync goalInput when modal opens
  useEffect(() => {
    if (showGoalModal) {
      setGoalInput(dailyGoal);
    }
  }, [showGoalModal, dailyGoal]);

  const saveDailyGoal = (newGoal: number) => {
    const validGoal = Math.max(1, newGoal);
    setDailyGoal(validGoal);
    try {
      localStorage.setItem('chant_daily_goal', String(validGoal));
    } catch (e) {
      console.error('Failed to save daily goal', e);
    }
    setShowGoalModal(false);
  };

  // Calculate 7 days of the currently viewed week (Monday to Sunday)
  const weekStart = useMemo(() => {
    const baseDate = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
    return startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Aggregate chant counts for each day in the week
  const weekDayStats = useMemo(() => {
    return weekDays.map((date) => {
      const dayStart = startOfDay(date);
      const daySessions = sessions.filter((s) => isSameDay(startOfDay(new Date(s.timestamp)), dayStart));
      const totalCount = daySessions.reduce((sum, s) => sum + s.count, 0);
      const completedGoals = Math.floor(totalCount / dailyGoal);
      const remainder = totalCount % dailyGoal;
      
      let progressRatio = 0;
      if (totalCount > 0) {
        if (completedGoals > 0 && remainder === 0) {
          progressRatio = 1.0;
        } else if (completedGoals > 0) {
          progressRatio = remainder / dailyGoal;
        } else {
          progressRatio = totalCount / dailyGoal;
        }
      }

      return {
        date,
        totalCount,
        completedGoals,
        remainder,
        progressRatio: Math.min(progressRatio, 1),
        isCurrentDay: isToday(date),
        isFutureDay: isFuture(date) && !isToday(date),
        isSelected: isSameDay(date, selectedDate),
      };
    });
  }, [weekDays, sessions, dailyGoal, selectedDate]);

  // Selected day statistics
  const selectedStats = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const daySessions = sessions.filter((s) => isSameDay(startOfDay(new Date(s.timestamp)), dayStart));
    const totalCount = daySessions.reduce((sum, s) => sum + s.count, 0);
    const completedGoals = Math.floor(totalCount / dailyGoal);
    const remainder = totalCount % dailyGoal;

    let progressRatio = 0;
    if (totalCount > 0) {
      if (completedGoals > 0 && remainder === 0) {
        progressRatio = 1.0;
      } else if (completedGoals > 0) {
        progressRatio = remainder / dailyGoal;
      } else {
        progressRatio = totalCount / dailyGoal;
      }
    }

    return {
      date: selectedDate,
      totalCount,
      completedGoals,
      remainder,
      progressRatio: Math.min(progressRatio, 1),
      isCurrentDay: isToday(selectedDate),
    };
  }, [selectedDate, sessions, dailyGoal]);

  // SVG parameters for Big Circle
  const bigSize = 124;
  const bigStroke = 10;
  const bigRadius = (bigSize - bigStroke) / 2;
  const bigCircumference = 2 * Math.PI * bigRadius;
  const bigDashOffset = bigCircumference * (1 - selectedStats.progressRatio);

  return (
    <div
      className="rounded-[1.5rem] p-5 relative overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-card, var(--bg-main))',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header with Title & Goal Selector — matches Distribution & Consistency cards */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('chant.goals') || 'Goals'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Daily Goal Target Pill / Edit button (SVG only) */}
          <button
            type="button"
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 border"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              borderColor: 'var(--accent-muted)',
              color: 'var(--accent)',
            }}
            title={t('chant.setDailyGoal') || 'Set Daily Goal'}
          >
            <Target size={12} className="opacity-80" />
            <span>{dailyGoal.toLocaleString()}</span>
            <Edit3 size={11} className="opacity-70" />
          </button>

          {/* Week Navigation */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/20 p-0.5 ml-1">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
              title="Previous Week"
            >
              <ChevronLeft size={14} />
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDate(startOfDay(new Date()));
                }}
                className="px-1.5 text-[9px] font-black uppercase text-[var(--accent)] tracking-wider"
                title="Current Week"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              disabled={weekOffset >= 0}
              className={cn(
                "p-1 rounded transition-colors",
                weekOffset >= 0
                  ? "text-[var(--text-muted)] opacity-30 cursor-not-allowed"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              )}
              title="Next Week"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Section: Samsung Health style Big Circle & Selected Day Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* Big Circular Ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg width={bigSize} height={bigSize} className="transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={bigSize / 2}
              cy={bigSize / 2}
              r={bigRadius}
              fill="none"
              stroke="var(--accent-subtle)"
              strokeWidth={bigStroke}
              className="opacity-40"
            />
            {/* Progress Stroke */}
            <circle
              cx={bigSize / 2}
              cy={bigSize / 2}
              r={bigRadius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={bigStroke}
              strokeDasharray={bigCircumference}
              strokeDashoffset={bigDashOffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>

          {/* Center Info in the Big Circle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-2">
            <motion.div
              key={`${selectedStats.completedGoals}-${selectedStats.totalCount}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight leading-none"
                style={{ color: 'var(--accent)' }}
              >
                {selectedStats.completedGoals}
              </span>
              <span
                className="text-[9px] font-extrabold uppercase tracking-wider mt-1 text-[var(--text-muted)] leading-tight"
              >
                {selectedStats.completedGoals === 1 ? 'Goal Met' : 'Goals Met'}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Right side: Detailed Stats for Selected Day */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-sm font-black text-[var(--text-primary)]">
              {selectedStats.isCurrentDay
                ? `${t('calendar.today') || 'Today'}, ${format(selectedStats.date, 'MMM d')}`
                : format(selectedStats.date, 'EEEE, MMM d')}
            </span>
          </div>

          {/* Progress Counters */}
          <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              {selectedStats.totalCount.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-[var(--text-muted)]">
              / {dailyGoal.toLocaleString()} chants
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

      {/* Bottom Section: 7 Days of the Week Circles (Samsung Health Style) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-1">
        {weekDayStats.map((day, idx) => {
          const miniSize = 34;
          const miniStroke = 3.5;
          const miniRadius = (miniSize - miniStroke) / 2;
          const miniCircumference = 2 * Math.PI * miniRadius;
          const miniDashOffset = miniCircumference * (1 - day.progressRatio);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDate(startOfDay(day.date))}
              className={cn(
                "flex flex-col items-center py-2 px-0.5 sm:px-1 rounded-2xl transition-all active:scale-95 group focus:outline-none",
                day.isSelected
                  ? "bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30 shadow-xs"
                  : "hover:bg-[var(--bg-muted)]/30"
              )}
            >
              {/* Mini Circle */}
              <div className="relative flex items-center justify-center">
                <svg width={miniSize} height={miniSize} className="transform -rotate-90">
                  {/* Mini Track */}
                  <circle
                    cx={miniSize / 2}
                    cy={miniSize / 2}
                    r={miniRadius}
                    fill="none"
                    stroke="var(--accent-subtle)"
                    strokeWidth={miniStroke}
                    className="opacity-50"
                  />
                  {/* Mini Progress */}
                  {day.totalCount > 0 && (
                    <circle
                      cx={miniSize / 2}
                      cy={miniSize / 2}
                      r={miniRadius}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={miniStroke}
                      strokeDasharray={miniCircumference}
                      strokeDashoffset={miniDashOffset}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 0.5s ease-in-out',
                      }}
                    />
                  )}
                </svg>

                {/* Center of Mini Circle: Shows number of times goal was met */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {day.completedGoals > 0 ? (
                    <span
                      className="text-[11px] font-black leading-none"
                      style={{ color: 'var(--accent)' }}
                    >
                      {day.completedGoals}
                    </span>
                  ) : day.totalCount > 0 ? (
                    <span className="text-[9px] font-bold text-[var(--text-muted)] leading-none">
                      0
                    </span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)] opacity-70" />
                  )}
                </div>
              </div>

              {/* Day Name (M, T, W... or Mon, Tue...) */}
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1.5 leading-none">
                {format(day.date, 'EEE')[0]}
              </span>

              {/* Date (e.g. 16 or 16/6) */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-1 leading-none transition-colors",
                  day.isCurrentDay
                    ? "bg-[var(--accent)] text-white"
                    : day.isSelected
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {format(day.date, 'd')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Goal Setting Modal */}
      <Modal
        show={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={t('chant.setDailyGoal') || 'Set Daily Goal'}
        maxWidth="sm"
      >
        <div className="space-y-6 pt-1">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Set your target number of chants per day. Completing this target finishes your daily ring and counts goal multipliers.
          </p>

          {/* Preset Buttons */}
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Preset Options
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GOALS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoalInput(preset)}
                  className={cn(
                    "py-3 px-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all border font-sans cursor-pointer active:scale-95",
                    goalInput === preset
                      ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)] shadow-sm scale-[1.02]"
                      : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-muted)]"
                  )}
                  style={{
                    backgroundColor: goalInput === preset ? 'var(--accent-subtle)' : 'var(--bg-card-alt)',
                  }}
                >
                  <span className="font-serif text-lg sm:text-xl font-bold tracking-tight">
                    {preset}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    chants
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Custom Daily Target
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center flex-1 relative h-12">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={goalInput}
                  onChange={(e) => setGoalInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-full px-4 pr-24 rounded-2xl border outline-none font-sans font-bold text-base transition-all focus:ring-2 focus:ring-[var(--accent)]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{
                    backgroundColor: 'var(--bg-card-alt)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="absolute right-4 text-xs font-bold text-[var(--text-muted)] pointer-events-none select-none">
                  chants / day
                </span>
              </div>

              {/* Quick Steppers */}
              <div className="flex items-center gap-1.5 h-12">
                <button
                  type="button"
                  onClick={() => setGoalInput((prev) => Math.max(1, prev - 10))}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-95 hover:border-[var(--accent)] cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-card-alt)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="-10 chants"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setGoalInput((prev) => prev + 10)}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-95 hover:border-[var(--accent)] cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-card-alt)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="+10 chants"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons using App's standard Button component */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowGoalModal(false)}
              className="flex-1"
            >
              {t('calendar.cancel') || 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => saveDailyGoal(goalInput)}
              className="flex-1"
            >
              {t('study.save') || 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
