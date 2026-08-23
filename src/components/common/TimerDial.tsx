import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface TimerDialProps {
  /** Size in pixels (width and height). Default: 264 */
  size?: number;
  /** Current remaining time in milliseconds */
  remainingMs: number;
  /** Total session duration in milliseconds */
  totalDurationMs: number;
  /** Formatted time string (e.g. "15:00" or "1:15:00") */
  timeString: string;
  /** Label above the time (e.g. "REMAINING", "PAUSED", "COMPLETE") */
  label: string;
  /** Whether the timer is currently actively running */
  isRunning?: boolean;
  /** Whether the timer is paused */
  isPaused?: boolean;
  /** Whether the session has completed */
  isFinished?: boolean;
  /** Active countdown number if in pre-start countdown (e.g. 5, 4, 3, 2, 1) */
  countdown?: number;
  /** Countdown label */
  countdownLabel?: string;
  /** Custom className for the container */
  className?: string;
}

export function TimerDial({
  size = 264,
  remainingMs,
  totalDurationMs,
  timeString,
  label,
  isRunning = false,
  isPaused = false,
  isFinished = false,
  countdown = 0,
  countdownLabel = 'STARTING IN',
  className,
}: TimerDialProps) {
  const center = size / 2;
  const strokeWidth = 6;
  const radius = (size - 64) / 2; // ~100px for 264px size
  const circumference = 2 * Math.PI * radius;

  // Fraction of elapsed time (0 at start, 1 at completion) for natural clockwise fill
  const elapsedFraction = useMemo(() => {
    if (isFinished) return 1;
    if (totalDurationMs <= 0) return 0;
    const elapsed = totalDurationMs - remainingMs;
    return Math.max(0, Math.min(1, elapsed / totalDurationMs));
  }, [remainingMs, totalDurationMs, isFinished]);

  // Dashoffset for clockwise progress fill starting at 12 o'clock
  const strokeDashoffset = isFinished
    ? 0
    : totalDurationMs === 0
    ? circumference
    : circumference * (1 - elapsedFraction);

  // 60 Chronograph Precision Tick Marks around the dial
  const ticks = useMemo(() => {
    const tickList = [];
    const tickRadius = center - 14; // Outer edge of ticks
    for (let i = 0; i < 60; i++) {
      const angleDeg = i * 6; // 360 / 60 = 6 deg
      const isCardinal = i % 15 === 0; // 12, 3, 6, 9 o'clock
      const isFiveMin = i % 5 === 0; // 5-minute intervals
      const length = isCardinal ? 8 : isFiveMin ? 5.5 : 3.5;
      const width = isCardinal ? 2 : isFiveMin ? 1.5 : 1;

      tickList.push({
        id: i,
        angleDeg,
        isCardinal,
        isFiveMin,
        length,
        width,
        r1: tickRadius - length,
        r2: tickRadius,
      });
    }
    return tickList;
  }, [center]);

  // Format time segments to allow sleek breathing colon
  const timeSegments = useMemo(() => {
    return timeString.split(':');
  }, [timeString]);

  const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Ambient Breathing Glow Aura when running */}
      {isRunning && (
        <motion.div
          className="absolute inset-2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--accent-subtle) 0%, rgba(0,0,0,0) 70%)',
          }}
          animate={{
            scale: [0.96, 1.05, 0.96],
            opacity: [0.4, 0.85, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Distinct Bezel Body / Surface Plate */}
      <div
        className="absolute inset-1.5 rounded-full transition-colors duration-500 border-2"
        style={{
          backgroundColor: 'var(--bg-card, var(--surface))',
          borderColor: 'var(--border-base, var(--border))',
          boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08), inset 0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          {/* Subtle Ambient Drop Shadow for the Progress Arc */}
          <filter id={`dial-glow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="3"
              floodColor="var(--accent)"
              floodOpacity={isRunning ? 0.4 : 0.22}
            />
          </filter>

          {/* Warm Gradient for the Progress Arc */}
          <linearGradient id={`dial-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="70%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--color-gold, #e8ac41)" />
          </linearGradient>
        </defs>

        {/* Crisp Outer Bezel Ring Border */}
        <circle
          cx={center}
          cy={center}
          r={center - 6}
          fill="none"
          stroke="var(--border-base, var(--border))"
          strokeWidth="1.5"
          className="opacity-70"
        />

        {/* 60 Chronograph Precision Tick Marks with High Contrast */}
        <g>
          {ticks.map((tick) => {
            const rad = ((tick.angleDeg - 90) * Math.PI) / 180;
            const x1 = center + tick.r1 * Math.cos(rad);
            const y1 = center + tick.r1 * Math.sin(rad);
            const x2 = center + tick.r2 * Math.cos(rad);
            const y2 = center + tick.r2 * Math.sin(rad);

            return (
              <line
                key={tick.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  tick.isCardinal
                    ? 'var(--accent)'
                    : tick.isFiveMin
                    ? 'var(--text-secondary)'
                    : 'var(--text-muted)'
                }
                strokeWidth={tick.width}
                strokeLinecap="round"
                opacity={
                  tick.isCardinal
                    ? 0.85
                    : tick.isFiveMin
                    ? 0.6
                    : 0.32
                }
              />
            );
          })}
        </g>

        {/* Prominent Track Ring (Background Groove) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--accent-muted, var(--border-base))"
          strokeWidth={strokeWidth}
          className="opacity-60"
        />

        {/* Active Progress Arc (Rotated -90° to start at 12 o'clock and fill clockwise) */}
        {elapsedFraction > 0 && (
          <g transform={`rotate(-90 ${center} ${center})`} filter={`url(#dial-glow-${uniqueId})`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#dial-grad-${uniqueId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: isRunning
                  ? 'stroke-dashoffset 0.3s linear'
                  : 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </g>
        )}
      </svg>

      {/* Center Readout Content */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        {countdown > 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            {/* Countdown Badge */}
            <div
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.25em] mb-2 border shadow-xs"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              {countdownLabel}
            </div>

            {/* Countdown Big Number */}
            <div
              className="font-serif text-6xl sm:text-7xl font-bold tracking-tight leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {Math.ceil(countdown)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            {/* Status / Remaining / Duration Pill */}
            <div
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.25em] mb-2 border transition-colors shadow-xs"
              style={{
                backgroundColor: isPaused
                  ? 'rgba(234, 179, 8, 0.12)'
                  : isFinished
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'var(--bg-muted)',
                borderColor: isPaused
                  ? 'rgba(234, 179, 8, 0.3)'
                  : isFinished
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'var(--border-subtle)',
                color: isPaused
                  ? '#ca8a04'
                  : isFinished
                  ? '#16a34a'
                  : 'var(--text-muted)',
              }}
            >
              {isFinished
                ? 'COMPLETE'
                : isPaused
                ? 'PAUSED'
                : label}
            </div>

            {/* Center Clock Digits */}
            <div className="flex items-baseline justify-center font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums">
              {timeSegments.map((segment, index) => (
                <React.Fragment key={index}>
                  <span>{segment}</span>
                  {index < timeSegments.length - 1 && (
                    <span
                      className={cn(
                        "mx-0.5 font-sans font-light opacity-60",
                        isRunning && "animate-pulse"
                      )}
                      style={{ color: 'var(--accent)' }}
                    >
                      :
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
