import React from 'react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string | number;
}

export interface LabeledSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  badgeLabel?: string;
  label?: string;
  className?: string;
  selectClassName?: string;
}

export function LabeledSelect({
  value,
  onChange,
  options,
  badgeLabel,
  label,
  className,
  selectClassName,
}: LabeledSelectProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          className="block text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted, var(--sm-text-muted))' }}
        >
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full px-4 py-4 rounded-2xl border outline-none transition-all appearance-none cursor-pointer focus:ring-2",
            selectClassName || "font-serif text-2xl text-center"
          )}
          style={{
            backgroundColor: 'var(--bg-input, var(--sm-surface))',
            borderColor: 'var(--border-base, var(--sm-border))',
            color: 'var(--accent, var(--sm-accent))',
          }}
        >
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              style={{
                backgroundColor: 'var(--bg-card, var(--sm-card-bg))',
                color: 'var(--text-primary, var(--sm-text-primary))',
              }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {badgeLabel && (
          <span
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 text-[9px] font-black uppercase tracking-tighter pointer-events-none"
            style={{
              backgroundColor: 'var(--bg-card, var(--sm-card-bg))',
              color: 'var(--text-muted, var(--sm-text-muted))',
            }}
          >
            {badgeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
