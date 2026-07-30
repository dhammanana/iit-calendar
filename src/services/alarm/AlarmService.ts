import { AlarmId } from './AlarmIds';
import { alarmPlugin, AlarmItem } from './AlarmPlugin';
import { Settings } from '../../types';
import { SunTimesCalculator } from '../../lib/calendar/SunTimesCalculator';
import { subMinutes } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { meditationDbService } from '../MeditationDbService';

export interface ActiveMeditation {
  startTime: number;
  durationMs: number;
  intervalMs: number;
  soundEnabled?: boolean;
  bellType?: string;
}

function getMeditationSoundAndChannel(soundEnabled = true, bellType = 'bowl') {
  if (!soundEnabled) {
    return { sound: '', channelId: 'meditation_silent_v7' };
  }
  const type = (bellType || 'bowl').toLowerCase();
  const validTypes = ['bowl', 'gong', 'chime', 'tibetan', 'woodblock', 'bell'];
  const safeType = validTypes.includes(type) ? type : 'bowl';
  return {
    sound: `bell_${safeType}.wav`,
    channelId: `meditation_${safeType}_v7`
  };
}

export interface ActiveStudy {
  startTime: number;
  durationMs: number;
  label: string;
}

class AlarmService {
  private static instance: AlarmService;
  private worker: Worker | null = null;

  private constructor() {}

  public static getInstance(): AlarmService {
    if (!AlarmService.instance) {
      AlarmService.instance = new AlarmService();
    }
    return AlarmService.instance;
  }

  public async requestPermission(): Promise<void> {
    await alarmPlugin.requestPermission();
    await alarmPlugin.createChannels();
  }

  public async refreshDawnAndNoon(settings: Settings): Promise<void> {
    // Cancel existing ranges
    const dawnIds = Array.from({ length: 31 }, (_, i) => AlarmId.DAWN_START + i);
    // Cancel up to 10 alerts per day for 31 days to be safe
    const noonIds = Array.from({ length: 31 * 10 }, (_, i) => AlarmId.SOLAR_NOON_START + i);
    await alarmPlugin.cancel([...dawnIds, ...noonIds]);

    const items: AlarmItem[] = [];
    const sunCalc = new SunTimesCalculator(settings.lat, settings.lng);
    const isIos = Capacitor.getPlatform() === 'ios';
    const daysToSchedule = isIos ? 14 : 30;
    const now = new Date();

    const safeOffset = settings.noonSafeOffset || 0;

    for (let i = 0; i < daysToSchedule; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const times = sunCalc.getStandardTimes(date);

      // Solar Noon
      if (settings.solarNoonBell) {
        const noon = times.solarNoon;
        if (noon) {
          const minutesToAlert = settings.noonMultiAlert ? [5, 4, 3, 2, 1, 0] : [5];
          
          minutesToAlert.forEach((m, idx) => {
            // bellTime = noon - m minutes - safeOffset minutes
            const totalOffset = m + safeOffset;
            const bellTime = subMinutes(noon, totalOffset);
            
            if (bellTime > now) {
              const soundFile = settings.noonVoiceAlert ? `noon_${m}.wav` : 'bell.wav';
              const channelId = settings.noonVoiceAlert ? `solar_noon_v7_${m}` : 'solar_noon_v7';
              const body = safeOffset > 0 
                ? `Solar noon is in ${m} minutes (+${safeOffset}m safe).`
                : `Solar noon is in ${m} minutes.`;

              items.push({
                id: AlarmId.SOLAR_NOON_START + (i * 10) + idx,
                title: "Solar Noon Approach",
                body: body,
                at: bellTime,
                sound: soundFile,
                channelId: channelId,
                allowWhileIdle: true,
                exact: true
              });
            }
          });
        }
      }

      // Dawn
      if (settings.dawnBell) {
        const dawn = sunCalc.getDawn(date, settings);
        if (dawn && dawn > now) {
          items.push({
            id: AlarmId.DAWN_START + i,
            title: "Dawn",
            body: "Dawn has arrived.",
            at: dawn,
            sound: 'bell.wav',
            channelId: 'dawn_v7',
            allowWhileIdle: true,
            exact: true
          });
        }
      }
    }

    if (items.length > 0) {
      await alarmPlugin.schedule(items);
    }
  }

  public async scheduleTest(items: AlarmItem[]): Promise<void> {
    await alarmPlugin.schedule(items);
  }

  public async startMeditation(
    durationMs: number,
    intervalMs: number,
    soundEnabled: boolean = true,
    bellType: string = 'bowl'
  ): Promise<void> {
    // Cancel existing
    const intervalIds = Array.from({ length: 100 }, (_, i) => AlarmId.MEDITATION_INTERVAL + i);
    await alarmPlugin.cancel([AlarmId.MEDITATION_END, ...intervalIds]);

    const active: ActiveMeditation = {
      startTime: Date.now(),
      durationMs,
      intervalMs,
      soundEnabled,
      bellType
    };
    localStorage.setItem('active_meditation', JSON.stringify(active));

    const { sound, channelId } = getMeditationSoundAndChannel(soundEnabled, bellType);

    const items: AlarmItem[] = [];
    const endTime = new Date(active.startTime + durationMs);

    // End Alarm
    items.push({
      id: AlarmId.MEDITATION_END,
      title: "Meditation Complete",
      body: "Your session has ended. May you be peaceful.",
      at: endTime,
      sound,
      channelId,
      allowWhileIdle: true,
      exact: true
    });

    // Intervals
    if (intervalMs > 0) {
      let nextInterval = active.startTime + intervalMs;
      let count = 0;
      while (nextInterval < endTime.getTime() && count < 100) {
        items.push({
          id: AlarmId.MEDITATION_INTERVAL + count,
          title: "Meditation Interval",
          body: "Interval mark reached.",
          at: new Date(nextInterval),
          sound,
          channelId,
          allowWhileIdle: true,
          exact: true
        });
        nextInterval += intervalMs;
        count++;
      }
    }

    await alarmPlugin.schedule(items);
  }

  public async stopMeditation(): Promise<void> {
    localStorage.removeItem('active_meditation');
    const intervalIds = Array.from({ length: 100 }, (_, i) => AlarmId.MEDITATION_INTERVAL + i);
    await alarmPlugin.cancel([AlarmId.MEDITATION_END, ...intervalIds]);
  }

  public async completeActiveMeditation(actualElapsedMs?: number): Promise<void> {
    const saved = localStorage.getItem('active_meditation');
    if (saved) {
      try {
        const active: ActiveMeditation = JSON.parse(saved);
        const elapsedMs = actualElapsedMs ?? (Date.now() - active.startTime);
        const durationMin = Math.floor(elapsedMs / 60000);
        if (durationMin >= 1) {
          const startTimeMs = typeof active.startTime === 'number' ? active.startTime : new Date(active.startTime).getTime();
          await meditationDbService.addSession(durationMin, new Date(startTimeMs).toISOString());
        }
      } catch (err) {
        console.error('Failed to complete meditation session:', err);
      }
    }
    await this.stopMeditation();
  }

  public async recheckMeditation(): Promise<void> {
    const saved = localStorage.getItem('active_meditation');
    if (!saved) return;

    const active: ActiveMeditation = JSON.parse(saved);
    const now = Date.now();
    const elapsed = now - active.startTime;

    if (elapsed >= active.durationMs) {
      await this.completeActiveMeditation(active.durationMs);
    } else {
      // Reschedule remaining
      const remaining = active.durationMs - elapsed;
      const items: AlarmItem[] = [];
      const endTime = new Date(now + remaining);

      const soundEnabled = active.soundEnabled ?? true;
      const bellType = active.bellType ?? 'bowl';
      const { sound, channelId } = getMeditationSoundAndChannel(soundEnabled, bellType);

      items.push({
        id: AlarmId.MEDITATION_END,
        title: "Meditation Complete",
        body: "Your session has ended. May you be peaceful.",
        at: endTime,
        sound,
        channelId,
        allowWhileIdle: true,
        exact: true
      });

      if (active.intervalMs > 0) {
        let nextInterval = active.startTime + active.intervalMs;
        let count = 0;
        while (nextInterval < endTime.getTime() && count < 100) {
          if (nextInterval > now) {
            items.push({
              id: AlarmId.MEDITATION_INTERVAL + count,
              title: "Meditation Interval",
              body: "Interval mark reached.",
              at: new Date(nextInterval),
              sound,
              channelId,
              allowWhileIdle: true,
              exact: true
            });
          }
          nextInterval += active.intervalMs;
          count++;
        }
      }
      
      const intervalIds = Array.from({ length: 100 }, (_, i) => AlarmId.MEDITATION_INTERVAL + i);
      await alarmPlugin.cancel([AlarmId.MEDITATION_END, ...intervalIds]);
      await alarmPlugin.schedule(items);
    }
  }

  public async startStudyTimer(durationMs: number, label: string): Promise<void> {
    const active: ActiveStudy = {
      startTime: Date.now(),
      durationMs,
      label
    };
    localStorage.setItem('active_study', JSON.stringify(active));

    await alarmPlugin.cancel([AlarmId.STUDY_END]);
    await alarmPlugin.schedule([{
      id: AlarmId.STUDY_END,
      title: "Study Timer Complete",
      body: `${label} finished.`,
      at: new Date(active.startTime + durationMs),
      sound: 'bell.wav',
      channelId: 'study_v7',
      allowWhileIdle: true,
      exact: true
    }]);
  }

  public async stopStudyTimer(): Promise<void> {
    localStorage.removeItem('active_study');
    await alarmPlugin.cancel([AlarmId.STUDY_END]);
  }

  public async rescheduleStudyTimer(newDurationMs: number, label: string): Promise<void> {
    await this.stopStudyTimer();
    await this.startStudyTimer(newDurationMs, label);
  }

  public async recheckStudy(): Promise<void> {
    const saved = localStorage.getItem('active_study');
    if (!saved) return;

    const active: ActiveStudy = JSON.parse(saved);
    const now = Date.now();
    const elapsed = now - active.startTime;

    if (elapsed >= active.durationMs) {
      localStorage.removeItem('active_study');
    } else {
      const remaining = active.durationMs - elapsed;
      await alarmPlugin.cancel([AlarmId.STUDY_END]);
      await alarmPlugin.schedule([{
        id: AlarmId.STUDY_END,
        title: "Study Timer Complete",
        body: `${active.label} finished.`,
        at: new Date(now + remaining),
        sound: 'bell.wav',
        channelId: 'study_v7',
        allowWhileIdle: true,
        exact: true
      }]);
    }
  }

  public startForegroundTimer(
    durationMs: number,
    onTick: (remainingMs: number) => void,
    onComplete: () => void,
    intervalMs?: number,
    onInterval?: () => void
  ): void {
    if (this.worker) this.worker.terminate();

    this.worker = new Worker(new URL('./TimerWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const { type, remaining } = e.data;
      if (type === 'tick') onTick(remaining);
      if (type === 'interval' && onInterval) onInterval();
      if (type === 'done') {
        onComplete();
        this.stopForegroundTimer();
      }
    };

    this.worker.postMessage({ type: 'start', durationMs, intervalMs });
  }

  public stopForegroundTimer(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const alarmService = AlarmService.getInstance();
