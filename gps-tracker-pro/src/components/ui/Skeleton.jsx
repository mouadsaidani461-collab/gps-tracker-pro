function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const baseClasses = 'bg-capture-surface/60 rounded-lg animate-pulse';

export default function Skeleton({
  className = '',
  width,
  height,
  circle = false,
  ...props
}) {
  const style = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  return (
    <div
      className={cn(
        baseClasses,
        circle ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Pre-built skeleton layouts */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={cn('capture-card p-4 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton circle className="w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return <Skeleton circle className={cn(sizes[size], className)} />;
}
