import { forwardRef } from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = forwardRef(function Card(
  {
    children,
    className = '',
    padding = 'md',
    hoverable = true,
    glow = false,
    as: Tag = 'div',
    ...props
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'relative rounded-xl overflow-hidden',
        // Glassmorphism
        'bg-capture-card/70 backdrop-blur-md',
        'border border-slate-600/20',
        'shadow-card',
        // Inner highlight
        'before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-slate-400/20 before:to-transparent',
        // Hover lift
        hoverable && [
          'transition-all duration-300 ease-out',
          'hover:-translate-y-1 hover:shadow-glow-sm',
          'hover:border-capture-primary/20',
          'active:translate-y-0 active:shadow-card',
        ],
        glow && 'shadow-glow-sm border-capture-primary/30',
        paddings[padding] ?? paddings.md,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

Card.displayName = 'Card';

export function CardHeader({ children, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={cn('text-base font-semibold text-slate-100', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={cn('text-sm text-capture-metallic mt-0.5', className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={cn('flex items-center gap-2 mt-4 pt-4 border-t border-slate-600/20', className)}>
      {children}
    </div>
  );
}

export default Card;
