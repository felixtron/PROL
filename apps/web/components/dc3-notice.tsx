import { AlertTriangle, Info } from "lucide-react";
import {
  DC3_POST_PRINT_NOTICE,
  DC3_RESPONSIBILITY_NOTICE,
} from "@/lib/dc3/validation";

/**
 * Las dos leyendas del módulo DC-3, en un solo componente para que digan
 * lo mismo en las tres pantallas donde aparecen. El texto es literal: es
 * la advertencia legal que el trabajador y el líder de proyecto tienen
 * que haber leído antes de que salga el documento.
 */

export function Dc3ResponsibilityNotice({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-xs leading-relaxed text-amber-900">
        {DC3_RESPONSIBILITY_NOTICE}
      </p>
    </div>
  );
}

export function Dc3PostPrintNotice({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2.5 rounded-lg border border-border bg-surface-secondary px-3.5 py-3 ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
      <p className="text-xs leading-relaxed text-text-secondary">
        {DC3_POST_PRINT_NOTICE}
      </p>
    </div>
  );
}
