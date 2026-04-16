"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function CatalogSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }

      // Reset to page 1 when searching
      params.delete("page");

      router.push(`/courses?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, router, searchParams]);

  const handleClear = () => {
    setSearch("");
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-5 w-5 text-text-tertiary" />
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar cursos..."
        className="block w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      {search && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
