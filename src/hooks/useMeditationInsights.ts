import { useMemo } from 'react';
import { MeditationSession } from '../types';
import { format, startOfDay, subDays, isSameDay, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface ChartDataItem {
  label: string;
  minutes: number;
  isCurrent: boolean;
  _start?: Date;
  _end?: Date;
  _date?: Date;
}

export function useMeditationInsights(
  sessions: MeditationSession[],
  chartView: 'day' | 'week' | 'month',
  chartOffset: number
) {
  return useMemo(() => {
    const today = startOfDay(new Date());
    let chartData: ChartDataItem[] = [];

    if (chartView === 'day') {
      const endDay = subDays(today, chartOffset * 7);
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(endDay, 6 - i);
        return {
          label: format(d, 'EEE'),
          minutes: 0,
          isCurrent: chartOffset === 0 && i === 6,
          _date: d,
        };
      });

      sessions.forEach(s => {
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

      sessions.forEach(s => {
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

      sessions.forEach(s => {
        const sDate = startOfDay(new Date(s.date));
        const monthData = chartData.find(d => sDate >= d._start! && sDate <= d._end!);
        if (monthData) {
          monthData.minutes += s.durationMin;
        }
      });
    }

    const maxMinutesInChart = Math.max(...chartData.map(d => d.minutes), 20);

    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));
    const weeklyMinutes = sessions.reduce((acc, s) => {
      const sDate = startOfDay(new Date(s.date));
      if (last7Days.some(d => isSameDay(d, sDate))) return acc + s.durationMin;
      return acc;
    }, 0);

    const totalMinutes = sessions.reduce((acc, curr) => acc + curr.durationMin, 0);
    const totalHours = Math.floor(totalMinutes / 60);

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(today, i);
      const hasSession = sessions.some(s => isSameDay(startOfDay(new Date(s.date)), d));
      if (hasSession) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    const milestone = 500;
    const progressPercent = Math.min((weeklyMinutes / milestone) * 100, 100);

    return {
      chartData,
      maxMinutesInChart,
      weeklyMinutes,
      totalMinutes,
      totalHours,
      currentStreak,
      progressPercent,
    };
  }, [sessions, chartView, chartOffset]);
}
