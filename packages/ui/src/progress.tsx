import { cn } from "./cn";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-pill bg-surface-tertiary", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn(
          "h-full rounded-pill bg-primary-500 transition-all duration-300",
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
