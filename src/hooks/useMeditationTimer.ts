import { useState, useEffect, useRef } from 'react';
import { alarmService, ActiveMeditation } from '../services/alarm/AlarmService';
import { bellSoundService } from '../services/BellSoundService';

export interface MeditationTimerSettings {
  delaySeconds: number;
  bellType: string;
  soundEnabled: boolean;
}

export function useMeditationTimer(
  totalDurationMs: number,
  intervalMs: number,
  settings: MeditationTimerSettings
) {
  const [remainingMs, setRemainingMs] = useState(totalDurationMs);
  const [countdown, setCountdown] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Ref to avoid stale closure in countdown interval
  const remainingMsRef = useRef(remainingMs);
  useEffect(() => { remainingMsRef.current = remainingMs; }, [remainingMs]);

  const lastTickRef = useRef<number>(0);

  const toggleWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
      } else {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => setWakeLock(null));
      }
    } catch (err) {
      console.error('Wake Lock failed:', err);
    }
  };

  // Reconcile saved active session on load
  useEffect(() => {
    const init = async () => {
      await alarmService.requestPermission();
      await alarmService.recheckMeditation();

      const savedActive = localStorage.getItem('active_meditation');
      if (savedActive) {
        const active: ActiveMeditation = JSON.parse(savedActive);
        const elapsed = Date.now() - active.startTime;
        if (elapsed < active.durationMs) {
          setRemainingMs(active.durationMs - elapsed);
          setIsRunning(true);
        } else {
          setRemainingMs(totalDurationMs);
          setIsRunning(false);
        }
      }
    };

    init();
  }, []);

  // Reset remaining time to new duration when settings change (only when idle)
  useEffect(() => {
    if (!isRunning && !isPaused && !isFinished && countdown === 0) {
      setRemainingMs(totalDurationMs);
    }
  }, [totalDurationMs, isRunning, isPaused, isFinished, countdown]);

  // Countdown & Foreground Timer Effect — re-runs only when isRunning toggles
  useEffect(() => {
    let countdownInterval: number | null = null;

    if (isRunning) {
      if (countdown > 0) {
        // Delay countdown before starting
        lastTickRef.current = Date.now();
        countdownInterval = window.setInterval(() => {
          const now = Date.now();
          const delta = now - lastTickRef.current;
          lastTickRef.current = now;

          setCountdown(prev => {
            const next = prev - delta / 1000;
            if (next <= 0) {
              if (countdownInterval) clearInterval(countdownInterval);
              const ms = remainingMsRef.current;
              bellSoundService.playBell(settings.soundEnabled, settings.bellType);
              alarmService.startMeditation(ms, intervalMs);
              startActualTimer(ms);
              return 0;
            }
            return next;
          });
        }, 100);
      } else {
        // Start immediately (no delay)
        alarmService.startMeditation(remainingMsRef.current, intervalMs);
        startActualTimer(remainingMsRef.current);
      }
    } else {
      alarmService.stopForegroundTimer();
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      alarmService.stopForegroundTimer();
    };
  }, [isRunning]); // intentionally omit countdown — the branch is captured at start time

  const startActualTimer = (ms: number) => {
    alarmService.startForegroundTimer(
      ms,
      rem => setRemainingMs(rem),
      () => {
        handleComplete();
        if (wakeLock) wakeLock.release();
      },
      intervalMs,
      () => bellSoundService.playBell(settings.soundEnabled, settings.bellType)
    );
  };

  const handleComplete = async () => {
    setIsRunning(false);
    setIsFinished(true);
    bellSoundService.playBell(settings.soundEnabled, settings.bellType);
    await alarmService.completeActiveMeditation(totalDurationMs);
  };

  // Reset only React state — no alarm side-effects
  const resetTimerState = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
    setRemainingMs(totalDurationMs);
    setCountdown(0);
    if (wakeLock) wakeLock.release();
  };

  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    if (wakeLock) wakeLock.release();

    const elapsedMs = totalDurationMs - remainingMsRef.current;
    const elapsedMin = Math.floor(elapsedMs / 60000);

    if (elapsedMin >= 5) {
      await alarmService.completeActiveMeditation(elapsedMs);
    } else {
      await alarmService.stopMeditation();
    }

    resetTimerState();
  };

  const resetTimer = async () => {
    resetTimerState();
    await alarmService.stopMeditation();
  };

  const toggleTimer = async () => {
    if (!isRunning && !isPaused && (remainingMs === totalDurationMs || isFinished)) {
      // Fresh start or restart after finish
      setIsFinished(false);
      if (settings.delaySeconds > 0) {
        setCountdown(settings.delaySeconds);
      } else {
        bellSoundService.playBell(settings.soundEnabled, settings.bellType);
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
    }
  };

  return {
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
  };
}
