import { forwardRef, useState } from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    type = 'text',
    className = '',
    inputClassName = '',
    id,
    disabled = false,
    ...props
  },
  ref,
) {
  const inputId = id ?? label?.replace(/\s/g, '-').toLowerCase();
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          'relative flex items-center rounded-lg transition-all duration-200',
          'bg-capture-surface/80 border',
          focused
            ? 'border-capture-primary/60 shadow-glow-sm'
            : 'border-slate-600/30 hover:border-slate-500/40',
          error && 'border-capture-danger/60 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {leftIcon && (
          <span className="absolute start-3 text-capture-metallic pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className={cn(
            'w-full bg-transparent text-slate-100 text-sm',
            'placeholder:text-slate-500',
            'py-2.5 px-3',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            leftIcon && 'ps-10',
            rightIcon && 'pe-10',
            inputClassName,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {rightIcon && (
          <span className="absolute end-3 text-capture-metallic">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-capture-danger" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
