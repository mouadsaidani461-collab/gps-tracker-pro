import { forwardRef } from 'react';

const variants = {
  primary: [
    'bg-capture-primary text-slate-950 font-semibold',
    'shadow-glow-sm hover:shadow-glow-md',
    'hover:brightness-110 active:brightness-95',
    'border border-capture-primary/50',
  ].join(' '),
  secondary: [
    'bg-capture-surface text-slate-200',
    'border border-slate-600/40',
    'hover:border-capture-primary/40 hover:bg-capture-card',
    'hover:shadow-glow-sm active:bg-capture-bg',
  ].join(' '),
  danger: [
    'bg-capture-danger text-white font-semibold',
    'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    'hover:shadow-[0_0_24px_rgba(244,63,94,0.4)]',
    'hover:brightness-110 active:brightness-95',
    'border border-capture-danger/50',
  ].join(' '),
  ghost: [
    'bg-transparent text-capture-metallic',
    'hover:text-capture-glow hover:bg-capture-surface/60',
    'active:bg-capture-surface',
  ].join(' '),
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    className = '',
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capture-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-capture-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        'select-none',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin w-4 h-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
