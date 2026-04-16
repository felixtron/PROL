import { cn } from "./cn";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-text-tertiary"
              )}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
