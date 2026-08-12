import { useState, useEffect, useRef } from 'react';
import { alarmService, ActiveMeditation } from '../services/alarm/AlarmService';
import { bellSoundService } from '../services/BellSoundService';
import { vibrationService } from '../services/VibrationService';
import { Capacitor } from '@capacitor/core';

/** Minimum elapsed session time (in minutes) required to save an interrupted session. */
const MIN_SESSION_MINUTES = 5;

export interface MeditationTimerSettings {
  delaySeconds: number;
  bellType: string;
  soundEnabled: boolean;
  vibrationEnabled?: boolean;
  alertMode?: string;
  keepScreenOn?: boolean;
}

/** Context passed from toggleTimer/init to the isRunning useEffect via ref. */
interface StartContext {
  isRestore: boolean;
  firstIntervalDelayMs?: number;
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

  // Ref mirrors wakeLock state to avoid stale closures in long-lived callbacks.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Ref to avoid stale closure in countdown interval
  const remainingMsRef = useRef(remainingMs);
  useEffect(() => { remainingMsRef.current = remainingMs; }, [remainingMs]);

  // Ref to track countdown value inside the setInterval without going through state updater.
  const countdownValueRef = useRef(0);

  const lastTickRef = useRef<number>(0);

  // Always-current settings ref so long-lived callbacks see latest values (#2)
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Communication channel from toggleTimer/init to the isRunning useEffect (#1, #4)
  const startContextRef = useRef<StartContext>({ isRestore: false });

  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLock(lock);
      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLock(null);
      });
    } catch (err) {
      console.error('Wake Lock failed:', err);
    }
  };

  const toggleWakeLock = async (forceState?: boolean) => {
    if (!('wakeLock' in navigator)) return;
    try {
      const shouldEnable = forceState !== undefined ? forceState : !wakeLockRef.current;
      if (!shouldEnable) {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
        }
      } else {
        await acquireWakeLock();
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
          const remaining = active.durationMs - elapsed;
          setRemainingMs(remaining);
          remainingMsRef.current = remaining;

          // Calculate interval alignment for the foreground worker on restore (#1)
          const activeIntervalMs = active.intervalMs || 0;
          let firstIntervalForWorker: number | undefined;
          if (activeIntervalMs > 0) {
            const firstDelay = active.firstIntervalDelayMs ?? activeIntervalMs;
            if (elapsed < firstDelay) {
              firstIntervalForWorker = firstDelay - elapsed;
            } else {
              const sinceFirst = elapsed - firstDelay;
              firstIntervalForWorker = activeIntervalMs - (sinceFirst % activeIntervalMs);
            }
          }
          startContextRef.current = { isRestore: true, firstIntervalDelayMs: firstIntervalForWorker };

          setIsRunning(true);
        } else {
          // Stale session from a previous run — recheckMeditation already completed it if needed
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
      const ctx = startContextRef.current;
      startContextRef.current = { isRestore: false }; // Reset after reading

      // Schedule native alarms — skip on restore since recheckMeditation already did it (#4)
      if (!ctx.isRestore) {
        const delayMs = countdown > 0 ? countdown * 1000 : 0;
        const totalSessionMs = remainingMsRef.current + delayMs;
        alarmService.startMeditation(
          totalSessionMs, intervalMs,
          settingsRef.current.soundEnabled,
          settingsRef.current.vibrationEnabled ?? true,
          settingsRef.current.bellType,
          ctx.firstIntervalDelayMs,
          delayMs
        );
      }

      if (countdown > 0) {
        countdownValueRef.current = countdown;
        lastTickRef.current = Date.now();
        countdownInterval = window.setInterval(() => {
          const now = Date.now();
          const delta = now - lastTickRef.current;
          lastTickRef.current = now;

          const next = Math.max(0, countdownValueRef.current - delta / 1000);
          countdownValueRef.current = next;
          setCountdown(next);

          if (next <= 0) {
            if (countdownInterval) clearInterval(countdownInterval);
            if (!Capacitor.isNativePlatform()) {
              if (settingsRef.current.vibrationEnabled ?? true) {
                vibrationService.vibrate('long');
              }
              bellSoundService.playBell(settingsRef.current.soundEnabled, settingsRef.current.bellType);
            }
            startActualTimer(totalDurationMs); // #8: Use totalDurationMs directly, not ref
          }
        }, 100);
      } else {
        // Start immediately (no delay)
        startActualTimer(remainingMsRef.current, ctx.firstIntervalDelayMs);
      }
    } else {
      alarmService.stopForegroundTimer();
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      alarmService.stopForegroundTimer();
    };
  }, [isRunning]); // intentionally omit countdown — the branch is captured at start time

  const startActualTimer = (ms: number, firstIntervalDelayMs?: number) => {
    alarmService.startForegroundTimer(
      ms,
      rem => setRemainingMs(rem),
      () => {
        handleComplete();
        // Use ref instead of the closed-over state value to get the current sentinel,
        // even if the user toggled wake lock off after the session started.
        if (wakeLockRef.current) wakeLockRef.current.release();
      },
      intervalMs,
      () => {
        if (!Capacitor.isNativePlatform()) {
          if (settingsRef.current.vibrationEnabled ?? true) {
            vibrationService.vibrate('short');
          }
          bellSoundService.playBell(settingsRef.current.soundEnabled, settingsRef.current.bellType);
        }
      },
      firstIntervalDelayMs
    );
  };

  const handleComplete = async () => {
    setIsRunning(false);
    setIsFinished(true);
    if (!Capacitor.isNativePlatform()) {
      if (settingsRef.current.vibrationEnabled ?? true) {
        vibrationService.vibrate('long');
      }
      // Cancel native notifications immediately on web fallback to prevent double bell
      await alarmService.cancelMeditationNotifications();
      bellSoundService.playBell(settingsRef.current.soundEnabled, settingsRef.current.bellType);
    }
    await alarmService.completeActiveMeditation(totalDurationMs);
  };

  // Reset only React state — no alarm side-effects
  const resetTimerState = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
    setRemainingMs(totalDurationMs);
    setCountdown(0);
    if (wakeLockRef.current) wakeLockRef.current.release();
  };

  const handleStop = async () => {
    // Stop foreground worker immediately before state change (#7)
    alarmService.stopForegroundTimer();
    setIsRunning(false);
    setIsPaused(false);
    if (wakeLockRef.current) wakeLockRef.current.release();

    const elapsedMs = totalDurationMs - remainingMsRef.current;
    const elapsedMin = Math.floor(elapsedMs / 60000);

    if (elapsedMin >= MIN_SESSION_MINUTES) {
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
    // Unlock and resume Web AudioContext on direct user interaction
    bellSoundService.initAudio();

    if (!isRunning && !isPaused && (remainingMs === totalDurationMs || isFinished)) {
      // Prompt for exact alarm permission on Android if missing
      await alarmService.checkAndPromptExactAlarm();
      if (settings.keepScreenOn) {
        await acquireWakeLock();
      }

      // Fresh start or restart after finish
      setIsFinished(false);
      setRemainingMs(totalDurationMs);
      remainingMsRef.current = totalDurationMs;
      if (settings.delaySeconds > 0) {
        setCountdown(settings.delaySeconds);
      } else {
        if (!Capacitor.isNativePlatform()) {
          if (settings.vibrationEnabled ?? true) {
            vibrationService.vibrate('long');
          }
          bellSoundService.playBell(settings.soundEnabled, settings.bellType);
        }
      }
      startContextRef.current = { isRestore: false };
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
      await alarmService.checkAndPromptExactAlarm();
      if (settings.keepScreenOn) {
        await acquireWakeLock();
      }

      // Calculate interval alignment for resume (#1)
      const elapsedMs = totalDurationMs - remainingMsRef.current;
      const intervalElapsed = intervalMs > 0 ? elapsedMs % intervalMs : 0;
      const firstDelay = intervalMs > 0 ? intervalMs - intervalElapsed : undefined;
      startContextRef.current = { isRestore: false, firstIntervalDelayMs: firstDelay };

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
