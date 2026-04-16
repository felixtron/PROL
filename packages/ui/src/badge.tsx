import { type HTMLAttributes } from "react";
import { cn } from "./cn";

type BadgeVariant = "default" | "primary" | "accent" | "success" | "warning" | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-tertiary text-text-secondary",
  primary: "bg-primary-100 text-primary-700",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  destructive: "bg-red-100 text-red-700",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
