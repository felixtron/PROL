"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, Store, Building2 } from "lucide-react";
import { enrollInCourse } from "@/lib/actions/enrollment";
import {
  createCheckoutSession,
  type StripePaymentMethod,
} from "@/lib/actions/payment";

interface CheckoutButtonProps {
  courseId: string;
  priceInCents: number;
  currency: string;
  isFree: boolean;
  coveredByCompany?: boolean;
}

type PaymentOption = {
  value: StripePaymentMethod;
  label: string;
  subtitle: string;
  icon: React.ElementType;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: "card",
    label: "Tarjeta de credito o debito",
    subtitle: "Confirmacion inmediata",
    icon: CreditCard,
  },
  {
    value: "oxxo",
    label: "OXXO",
    subtitle: "Paga en efectivo en cualquier tienda. Hasta 3 dias.",
    icon: Store,
  },
  {
    value: "spei",
    label: "SPEI",
    subtitle: "Transferencia interbancaria. Confirmacion en 1-2 dias habiles.",
    icon: Building2,
  },
];

export function CheckoutButton({
  courseId,
  isFree,
  coveredByCompany,
}: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<StripePaymentMethod>("card");
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const router = useRouter();

  // Inscripción directa (sin Stripe) cuando el curso es gratis o cuando la
  // empresa del alumno tiene asignación activa.
  const isDirect = isFree || coveredByCompany;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        if (isDirect) {
          await enrollInCourse(courseId);
          router.push(`/dashboard/courses/${courseId}`);
        } else {
          const session = await createCheckoutSession(courseId, method);
          if (session?.url) {
            window.location.href = session.url;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al inscribir");
      }
    });
  }

  if (isDirect) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
            </>
          ) : coveredByCompany ? (
            "Inscribirse (incluido por tu empresa)"
          ) : (
            "Inscribirse Gratis"
          )}
        </button>
        {error && (
          <p className="text-center text-xs text-red-700">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Method picker */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShowMethodPicker((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-secondary"
        >
          <span className="flex items-center gap-2">
            {(() => {
              const opt = PAYMENT_OPTIONS.find((o) => o.value === method)!;
              const Icon = opt.icon;
              return (
                <>
                  <Icon className="h-4 w-4 text-primary-600" />
                  <span className="font-medium text-text-primary">
                    {opt.label}
                  </span>
                </>
              );
            })()}
          </span>
          <span className="text-xs text-text-tertiary">
            {showMethodPicker ? "▲" : "▼"}
          </span>
        </button>

        {showMethodPicker && (
          <div className="space-y-1 rounded-lg border border-border bg-surface p-1">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = method === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMethod(opt.value);
                    setShowMethodPicker(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-primary-50"
                      : "hover:bg-surface-secondary"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 ${
                      isActive ? "text-primary-700" : "text-text-tertiary"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {opt.label}
                    </p>
                    <p className="text-xs text-text-tertiary">{opt.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
          </>
        ) : (
          `Pagar con ${PAYMENT_OPTIONS.find((o) => o.value === method)!.label.split(" ")[0]}`
        )}
      </button>
    </div>
  );
}
