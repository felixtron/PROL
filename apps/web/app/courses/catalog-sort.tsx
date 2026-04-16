"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes" },
  { value: "popular", label: "Más populares" },
  { value: "price-low", label: "Precio: menor a mayor" },
  { value: "price-high", label: "Precio: mayor a menor" },
] as const;

export function CatalogSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "newest";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    // Reset to page 1 when sorting changes
    params.delete("page");

    router.push(`/courses?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-text-tertiary" />
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
