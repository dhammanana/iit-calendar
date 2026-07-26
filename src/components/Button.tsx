import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  fullWidth?: boolean;
  isLoading?: boolean;
  isIconOnly?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--accent)] text-white shadow-md hover:brightness-105 active:brightness-95',
  secondary: 'bg-[var(--bg-card-alt)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] border border-[var(--border-subtle)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
  outline: 'bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent-soft)] shadow-sm',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm active:bg-red-700',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full gap-1.5',
  md: 'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full gap-2',
  lg: 'px-6 py-3 text-sm font-black uppercase tracking-widest rounded-full gap-2.5',
};

const iconOnlySizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'w-8 h-8 !p-0 rounded-full shrink-0',
  md: 'w-9 h-9 !p-0 rounded-full shrink-0',
  lg: 'w-12 h-12 !p-0 rounded-full shrink-0',
};

const iconSizes: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 14,
  md: 18,
  lg: 20,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      fullWidth = false,
      isLoading = false,
      isIconOnly,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isLoading;
    const shouldRenderIconOnly = isIconOnly ?? (!children && Boolean(Icon || isLoading));

    return (
      <button
        ref={ref}
        type={type}
        disabled={isButtonDisabled}
        className={cn(
          'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 active:scale-95',
          variantStyles[variant],
          shouldRenderIconOnly ? iconOnlySizes[size] : sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={iconSizes[size]} className="animate-spin shrink-0" />
        ) : Icon ? (
          <Icon size={iconSizes[size]} />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
