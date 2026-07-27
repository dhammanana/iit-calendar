import { useEffect } from 'react';
import { WidgetBridgePlugin } from 'capacitor-widget-bridge';
import { SunTimesCalculator } from '../lib/calendar/SunTimesCalculator';
import { format, startOfDay, subDays, isSameDay } from 'date-fns';
import { meditationDbService } from '../services/MeditationDbService';

const APP_GROUP = 'group.iit.calendar';

export function useWidgetSync() {
  useEffect(() => {
    syncWidgetData();
    // Sync periodically
    const interval = setInterval(syncWidgetData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const syncWidgetData = async () => {
    try {
      if (typeof window === 'undefined') return;

      // 1. Settings & Location
      const settingsRaw = localStorage.getItem('iit_settings');
      const settings = settingsRaw ? JSON.parse(settingsRaw) : { lat: 6.9271, lng: 79.8612 };
      
      // 2. Dawn and Noon calculation for today + next 3 days
      const sunCalc = new SunTimesCalculator(settings.lat, settings.lng);
      const timesArray = [];
      const today = new Date();
      
      for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const standardTimes = sunCalc.getStandardTimes(date);
        const dawn = sunCalc.getDawn(date, settings);
        
        timesArray.push({
          date: format(date, 'yyyy-MM-dd'),
          dawn: dawn ? format(dawn, 'hh:mm a') : '',
          noon: standardTimes.solarNoon ? format(standardTimes.solarNoon, 'hh:mm a') : ''
        });
      }

      await WidgetBridgePlugin.setItem({ key: 'sun_times', value: JSON.stringify(timesArray), group: APP_GROUP });

      // 3. Meditation Stats (from SQLite DB via MeditationDbService)
      let medSessions = await meditationDbService.getSessions();
      if (!medSessions || medSessions.length === 0) {
        const medStatsRaw = localStorage.getItem('zen_meditation_stats');
        medSessions = medStatsRaw ? (JSON.parse(medStatsRaw).sessions || []) : [];
      }
      const medStreak = calculateStreak(medSessions);
      const medMonth = calculateMonthMinutes(medSessions, 'durationMin');
      await WidgetBridgePlugin.setItem({ key: 'meditation_stats', value: JSON.stringify({ streak: medStreak, monthMinutes: medMonth }), group: APP_GROUP });

      // 4. Chanting Stats
      const chantStatsRaw = localStorage.getItem('app_chant_sessions');
      const chantStats = chantStatsRaw ? JSON.parse(chantStatsRaw) : [];
      const chantStreak = calculateStreak(chantStats);
      // Chanting doesn't inherently track minutes in the same way, we'll track session count for the month
      const chantMonth = calculateMonthCount(chantStats);
      await WidgetBridgePlugin.setItem({ key: 'chant_stats', value: JSON.stringify({ streak: chantStreak, monthSessions: chantMonth }), group: APP_GROUP });

      // 5. Studying Stats
      const studyStatsRaw = localStorage.getItem('study_sessions');
      const studyStats = studyStatsRaw ? JSON.parse(studyStatsRaw) : [];
      const studyStreak = calculateStreak(studyStats);
      const studyMonthMs = calculateMonthMinutes(studyStats, 'durationMs');
      const studyMonthMin = Math.floor(studyMonthMs / 60000);
      await WidgetBridgePlugin.setItem({ key: 'study_stats', value: JSON.stringify({ streak: studyStreak, monthMinutes: studyMonthMin }), group: APP_GROUP });

      // Tell Native Widgets to reload UI
      try {
        await WidgetBridgePlugin.setRegisteredWidgets({
          widgets: [
            'com.iitcalendar.applet.StatsWidgetProvider',
            'com.iitcalendar.applet.DailyTimesWidgetProvider'
          ]
        });
      } catch (e) {
        // Ignored on non-Android platforms
      }
      
      console.log('Widget Sync - Sending data:', {
        meditation: { streak: medStreak, monthMinutes: medMonth },
        chanting: { streak: chantStreak, monthSessions: chantMonth },
        study: { streak: studyStreak, monthMinutes: studyMonthMin },
        sunTimes: timesArray
      });

      await WidgetBridgePlugin.reloadAllTimelines();
    } catch (e) {
      console.error('Widget Sync Error:', e);
    }
  };

  const calculateStreak = (sessions: any[]) => {
    if (!sessions || !sessions.length) return 0;
    let currentStreak = 0;
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 365; i++) {
      const d = subDays(today, i);
      const hasSession = sessions.some(s => {
        if (!s.date && !s.timestamp) return false;
        const sDate = new Date(s.date || s.timestamp);
        return isSameDay(startOfDay(sDate), d);
      });
      
      if (hasSession) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    return currentStreak;
  };

  const calculateMonthMinutes = (sessions: any[], durationKey: string) => {
    if (!sessions || !sessions.length) return 0;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let total = 0;
    sessions.forEach(s => {
      if (!s.date && !s.timestamp) return;
      const d = new Date(s.date || s.timestamp);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         total += (s[durationKey] || 0);
      }
    });
    return total;
  };
  
  const calculateMonthCount = (sessions: any[]) => {
    if (!sessions || !sessions.length) return 0;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let total = 0;
    sessions.forEach(s => {
      if (!s.date && !s.timestamp) return;
      const d = new Date(s.date || s.timestamp);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         total++;
      }
    });
    return total;
  };
}
