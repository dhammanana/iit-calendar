import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Minus, Plus, Hand, Play, Pause, RotateCcw, Clock, Settings2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useI18n } from '../../hooks/useI18n';

interface ChantCounterProps {
  currentCount: number;
  onCountChange: (value: number) => void;
  onCommit: (durationMin?: number) => void;
  targetCount: number;
  timerSettings: { hours: number; minutes: number };
  children?: React.ReactNode;
}

export function ChantCounter({ currentCount, onCountChange, onCommit, targetCount, timerSettings, children }: ChantCounterProps) {
  const { t } = useI18n();
  const controls = useAnimation();
  const [manualValue, setManualValue] = useState(currentCount.toString());

  // Timer states
  const totalDurationMs = (timerSettings.hours * 60 + timerSettings.minutes) * 60 * 1000;
  
  const [remainingMs, setRemainingMs] = useState(totalDurationMs);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const isStarted = isRunning || isFinished || elapsedMs > 0 || currentCount > 0;

  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStarted) {
      setIsStuck(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { 
        rootMargin: "-65px 0px 0px 0px",
        threshold: [0, 1] 
      }
    );

    const target = sentinelRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
      observer.disconnect();
    };
  }, [isStarted]);

  useEffect(() => {
    setManualValue(currentCount.toString());
  }, [currentCount]);

  useEffect(() => {
    if (!isRunning && !isFinished && elapsedMs === 0) {
      setRemainingMs(totalDurationMs);
    }
  }, [totalDurationMs, isRunning, isFinished, elapsedMs]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        setElapsedMs(elapsed);
        
        if (totalDurationMs > 0) {
          const rem = totalDurationMs - elapsed;
          if (rem <= 0) {
            setRemainingMs(0);
            setIsRunning(false);
            setIsFinished(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
          } else {
            setRemainingMs(rem);
          }
        } else {
          // Stopwatch mode
          setRemainingMs(0);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, totalDurationMs]);
  const toggleTimer = () => {
    if (!isRunning && !isFinished) {
      setIsRunning(true);
      startTimeRef.current = Date.now() - elapsedMs;
    } else if (isRunning) {
      setIsRunning(false);
    } else if (isFinished) {
      resetTimer();
      setIsRunning(true);
      startTimeRef.current = Date.now();
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setRemainingMs(totalDurationMs);
    setElapsedMs(0);
    onCountChange(0); // Reset count as well
  };

  const handleCommit = () => {
    const min = Math.floor(elapsedMs / 60000);
    resetTimer();
    onCommit(min > 0 ? min : undefined);
  };

  const handleTap = () => {
    if (!isRunning) return;
    onCountChange(currentCount + 1);
    controls.start({
      scale: [1, 0.95, 1],
      transition: { duration: 0.08 }
    });
  };

  const handleManualChange = (val: string) => {
    setManualValue(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed >= 0) {
      onCountChange(parsed);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = isFinished ? 0 : totalDurationMs === 0 ? 0 : circumference - ((remainingMs / totalDurationMs) * circumference);

  return (
    <div className="flex flex-col items-center transition-all duration-500 w-full py-0">
      {!isStarted ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
          className="flex flex-col items-center w-full pb-4 gap-8"
        >
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
              <circle cx="128" cy="128" r="120" stroke="var(--sm-surface)" strokeWidth="4" fill="none" className="opacity-40" />
              <circle
                cx="128" cy="128" r="120"
                stroke="var(--accent)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-300 ease-linear"
              />
            </svg>

            <div className="text-center z-10 flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Duration
              </span>
              <div className="font-serif text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-none mb-2.5">
                {timerSettings.hours > 0 ? `${timerSettings.hours}:${timerSettings.minutes.toString().padStart(2, '0')}:00` : `${timerSettings.minutes.toString().padStart(2, '0')}:00`}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--border-subtle)]">
                {timerSettings.hours === 0 && timerSettings.minutes === 0 ? "Stopwatch" : "Countdown"}
              </div>
            </div>
          </div>
          
          <button 
            onClick={toggleTimer}
            className="h-16 px-10 rounded-full flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-sm transition-transform active:scale-95 shadow-lg text-white cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 10px 15px -3px var(--accent-shadow), 0 4px 6px -4px var(--accent-shadow)'
            }}
          >
            <Play size={20} fill="currentColor" /> Start Chanting
          </button>
          
          <div className="w-full">
            {children}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col items-center w-full relative"
        >
          {/* Sentinel element to detect scroll sticky stickiness */}
          <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none" />

          {/* Big Tap Button & Actions Sticky Container */}
          <div className={cn(
            "flex flex-col items-center sticky top-16 z-30 pb-5 bg-[var(--bg-main)]/95 backdrop-blur-sm w-[calc(100%+2rem)] -mx-4 px-4 gap-8 transition-all duration-300",
            isStuck 
              ? "border-b border-[var(--border-subtle)]/30 shadow-sm" 
              : "border-b-transparent shadow-none"
          )}>
            <motion.button
              animate={controls}
              onTap={handleTap}
              className={cn(
                "relative w-64 h-64 flex items-center justify-center group cursor-pointer transition-all duration-300",
                !isRunning && "opacity-40 pointer-events-none"
              )}
            >
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 z-10 pointer-events-none" viewBox="0 0 256 256">
                <circle cx="128" cy="128" r="120" stroke="var(--sm-surface)" strokeWidth="3" fill="none" className="opacity-40" />
                <circle
                  cx="128" cy="128" r="120"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/10" />
              <div className="absolute inset-4 rounded-full border border-white dark:border-slate-800 shadow-xl" />
              <div
                className="absolute inset-8 rounded-full p-1"
                style={{
                  backgroundColor: 'var(--accent-shadow)',
                  boxShadow: '0 0 40px var(--accent-shadow)'
                }}
              >
                <div
                  className="w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden p-4 text-center"
                  style={{
                    backgroundColor: 'var(--accent)'
                  }}
                >
                  <motion.div
                    initial={false}
                    className="absolute inset-0 bg-white opacity-0"
                    whileTap={{ opacity: 0.15 }}
                  />
                  <Hand size={28} className="text-white mb-1.5" />
                  <span className="text-3xl font-serif text-white tracking-wide leading-none mb-2">
                    {totalDurationMs > 0 ? formatTime(remainingMs) : formatTime(elapsedMs)}
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/80 leading-none">
                    {t('chant.tapToChant')}
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Display and Controls (Sticky) */}
            <div className="flex items-center justify-center gap-6 w-full max-w-xs">
              <button
                onClick={() => onCountChange(Math.max(0, currentCount - 1))}
                disabled={!isRunning}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-[var(--border-subtle)] active:scale-90 transition-transform bg-[var(--bg-card)] cursor-pointer",
                  !isRunning && "opacity-45 pointer-events-none"
                )}
              >
                <Minus size={20} className="text-[var(--text-muted)]" />
              </button>

              <div className="text-center flex flex-col items-center">
                <input
                  type="number"
                  value={manualValue}
                  onChange={(e) => handleManualChange(e.target.value)}
                  disabled={!isRunning}
                  className="font-serif text-6xl font-medium tracking-tight bg-transparent text-center focus:outline-none w-32 text-[var(--text-primary)] disabled:opacity-50"
                />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">
                  {t('chant.ofChants', { count: targetCount })}
                </p>
              </div>

              <button
                onClick={() => onCountChange(currentCount + 1)}
                disabled={!isRunning}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-[var(--border-subtle)] active:scale-90 transition-transform bg-[var(--bg-card)] cursor-pointer",
                  !isRunning && "opacity-45 pointer-events-none"
                )}
              >
                <Plus size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Quick Increment Buttons */}
            <div className="flex gap-3">
              {[-10, 10, 108].map(num => (
                <button
                  key={num}
                  onClick={() => onCountChange(Math.max(0, currentCount + num))}
                  disabled={!isRunning}
                  className={cn(
                    "px-4 py-2 rounded-xl bg-[var(--bg-muted)] text-[10px] font-black tracking-widest text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all active:scale-95 cursor-pointer",
                    !isRunning && "opacity-45 pointer-events-none"
                  )}
                >
                  {num > 0 ? '+' : ''}{num}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full max-w-[280px]">
              <button
                onClick={resetTimer}
                className="w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)'
                }}
                title="Cancel"
              >
                <X size={20} />
              </button>

              <button
                onClick={toggleTimer}
                className="w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)'
                }}
                title={isRunning ? 'Pause' : 'Resume'}
              >
                {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>

              <button
                onClick={handleCommit}
                disabled={currentCount === 0 && elapsedMs < 60000}
                className={cn(
                  "flex-1 h-14 rounded-full flex items-center justify-center gap-2 font-bold tracking-widest uppercase text-xs transition-all shadow-lg active:scale-95 cursor-pointer",
                  (currentCount > 0 || elapsedMs >= 60000)
                    ? "text-white" 
                    : "opacity-45 pointer-events-none"
                )}
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: (currentCount > 0 || elapsedMs >= 60000) ? '0 10px 15px -3px var(--accent-shadow), 0 4px 6px -4px var(--accent-shadow)' : 'none'
                }}
              >
                {t('chant.logSession')}
              </button>
            </div>
          </div>

          <div className="w-full mt-6">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
}
