"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleItemCheck } from "@/lib/actions/manual";

export interface ChecklistItem {
  id: string;
  text: string;
  helpText: string | null;
}

export interface CheckState {
  checkedAt: Date;
  by: string | null;
}

interface SectionChecklistProps {
  assignmentId: string;
  items: ChecklistItem[];
  checks: Record<string, CheckState>;
  /** La autoevaluación muestra además el resumen "n de m". */
  variant: "steps" | "self-check";
}

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: "America/Mexico_City",
});

/**
 * Checklist de la sección (paso a paso o autoevaluación).
 *
 * El estado es de la EMPRESA, no de quien mira: marcar algo aquí lo marca para
 * todos sus compañeros. Por eso cada ítem muestra quién lo marcó y cuándo — sin
 * esa traza, un checklist compartido se vuelve un misterio en cuanto son tres
 * personas trabajando el mismo manual.
 */
export function SectionChecklist({
  assignmentId,
  items,
  checks,
  variant,
}: SectionChecklistProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    checks,
    (state: Record<string, CheckState>, update: { itemId: string; checked: boolean }) => {
      const next = { ...state };
      if (update.checked) {
        next[update.itemId] = { checkedAt: new Date(), by: null };
      } else {
        delete next[update.itemId];
      }
      return next;
    },
  );

  const done = items.filter((i) => optimistic[i.id]).length;
  const complete = items.length > 0 && done === items.length;

  function handleToggle(itemId: string, checked: boolean) {
    startTransition(async () => {
      setOptimistic({ itemId, checked });
      await toggleItemCheck({ assignmentId, itemId, checked });
    });
  }

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const check = optimistic[item.id];
          return (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <button
                type="button"
                onClick={() => handleToggle(item.id, !check)}
                aria-pressed={Boolean(check)}
                aria-label={check ? "Desmarcar" : "Marcar como hecho"}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  check
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-border bg-surface hover:border-primary-400"
                }`}
              >
                {check ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    check
                      ? "text-text-tertiary line-through decoration-border"
                      : "text-text-primary"
                  }`}
                >
                  {item.text}
                </p>
                {item.helpText ? (
                  <p className="mt-1 text-xs text-text-tertiary">{item.helpText}</p>
                ) : null}
                {check ? (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Marcado {check.by ? `por ${check.by} ` : ""}
                    el {DATE.format(new Date(check.checkedAt))}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {variant === "self-check" && items.length > 0 ? (
        <div
          className={`mt-3 rounded-lg border px-4 py-3 text-sm font-medium ${
            complete
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-border bg-surface-secondary text-text-secondary"
          }`}
        >
          {done} de {items.length}
          {complete
            ? " — completo. Pueden avanzar a la siguiente sección."
            : " — completen la autoevaluación antes de avanzar."}
        </div>
      ) : null}
    </div>
  );
}
