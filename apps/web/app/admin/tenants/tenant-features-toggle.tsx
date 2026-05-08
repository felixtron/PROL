"use client";

import { useTransition } from "react";
import { toggleTenantFeature } from "@/lib/actions/admin";

interface TenantFeaturesToggleProps {
  tenantId: string;
  feature:
    | "aiEnabled"
    | "workshopsEnabled"
    | "evaluationsEnabled"
    | "surveysEnabled";
  enabled: boolean;
  label: string;
}

export function TenantFeaturesToggle({
  tenantId,
  feature,
  enabled,
  label,
}: TenantFeaturesToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleTenantFeature(tenantId, feature, !enabled);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="group flex items-center gap-2"
      title={`${enabled ? "Desactivar" : "Activar"} ${label}`}
    >
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-gray-300"
        } ${isPending ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-xs text-text-secondary">
        {isPending ? "..." : enabled ? "Si" : "No"}
      </span>
    </button>
  );
}
