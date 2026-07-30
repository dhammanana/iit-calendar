import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface ToggleProps {
  /** Accepts boolean for value or checked state */
  value?: boolean;
  checked?: boolean;
  /** Callback fired when state toggles */
  onToggle?: () => void;
  onChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Reusable toggle switch matching the Settings panel style across the app.
 * Driven by CSS variables --accent (active state) and --bg-muted (inactive state).
 */
export function Toggle({
  value,
  checked,
  onToggle,
  onChange,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}: ToggleProps) {
  const isChecked = checked ?? value ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) onChange(!isChecked);
    if (onToggle) onToggle();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "w-11 h-6 rounded-full p-0.5 flex items-center transition-all duration-200 border flex-shrink-0 cursor-pointer focus:outline-none select-none",
        disabled && "opacity-40 cursor-not-allowed",
        isChecked
          ? "bg-[var(--accent)] border-[var(--accent)] shadow-sm"
          : "bg-stone-300 dark:bg-stone-700/80 border-stone-400/50 dark:border-stone-600/70",
        className
      )}
    >
      <motion.div
        animate={{ x: isChecked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="w-5 h-5 rounded-full bg-white shadow-md flex-shrink-0"
      />
    </button>
  );
}
