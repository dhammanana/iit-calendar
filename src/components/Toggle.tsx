import React from 'react';
import { motion } from 'motion/react';

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
      className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 cursor-pointer focus:outline-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      style={{
        backgroundColor: isChecked ? 'var(--accent)' : 'var(--bg-muted)',
      }}
    >
      <motion.div
        animate={{ x: isChecked ? 28 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}
