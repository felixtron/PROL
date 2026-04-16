"use client";

import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

const statusConfig = {
  pending: {
    label: "Pendiente",
    icon: Clock,
    color: "text-text-tertiary",
    bg: "bg-surface-tertiary",
  },
  processing: {
    label: "Procesando",
    icon: Loader2,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  completed: {
    label: "Completado",
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  failed: {
    label: "Error",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
} as const;

type AIStatus = keyof typeof statusConfig;

export function AIStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const config = statusConfig[status as AIStatus] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}
    >
      <Icon
        className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
      />
      {config.label}
    </span>
  );
}
