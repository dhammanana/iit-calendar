import React, { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface SegmentedOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const activeLayoutId = useId();

  return (
    <div
      className={cn(
        "grid grid-flow-col auto-cols-fr gap-1.5 p-1.5 rounded-full w-fit mx-auto border relative",
        className
      )}
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {options.map((option) => {
        const isSelected = value === option.id;
        const Icon = option.icon;
        const iconSize = size === 'sm' ? 12 : 14;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex items-center justify-center rounded-full font-black uppercase tracking-widest transition-colors duration-200 cursor-pointer select-none text-center px-3.5",
              size === 'sm'
                ? "py-1.5 text-[0.6rem]"
                : "py-2.5 text-[0.65rem]",
              isSelected
                ? "text-white"
                : "text-primary-300 dark:text-primary-700 hover:text-primary-600 dark:hover:text-primary-300"
            )}
          >
            {/* Active sliding background pill */}
            {isSelected && (
              <motion.div
                layoutId={activeLayoutId}
                className="absolute inset-0 bg-saffron rounded-full shadow-md shadow-saffron/20"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}

            {/* Invisible ghost container to lock layout width for icon + label of all options */}
            <div className="flex items-center justify-center gap-1.5 invisible opacity-0 pointer-events-none select-none aria-hidden">
              {Icon && <Icon size={iconSize} className="flex-shrink-0" />}
              <span className="whitespace-nowrap">{option.label}</span>
            </div>

            {/* Visible content overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 z-10">
              {isSelected ? (
                <>
                  {Icon && <Icon size={iconSize} className="flex-shrink-0" />}
                  <span className="whitespace-nowrap">{option.label}</span>
                </>
              ) : (
                Icon && <Icon size={iconSize} className="flex-shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
