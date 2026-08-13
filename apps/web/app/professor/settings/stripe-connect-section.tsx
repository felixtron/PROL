"use client";

import { useTransition } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { createConnectOnboardingLink } from "@/lib/actions/payment";

type ConnectStatus =
  | { connected: false }
  | { connected: true; chargesEnabled: boolean; detailsSubmitted: boolean };

export function StripeConnectSection({ status }: { status: ConnectStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    startTransition(async () => {
      const result = await createConnectOnboardingLink();
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        Pagos con Stripe
      </h2>
      <p className="mt-1 text-sm text-text-tertiary">
        Conecta tu cuenta de Stripe para recibir pagos por tus cursos.
      </p>

      <div className="mt-6">
        {/* Not connected */}
        {!status.connected && (
          <div className="flex items-start gap-4 rounded-lg border border-border bg-primary-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <CreditCard className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Configura tu cuenta de Stripe
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Para vender cursos de pago, necesitas conectar una cuenta de
                Stripe donde recibirás tus ganancias.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isPending ? (
                  "Redirigiendo..."
                ) : (
                  <>
                    Conectar Stripe
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Connected but details not submitted */}
        {status.connected && !status.detailsSubmitted && (
          <div className="flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Completa tu configuración de Stripe
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tu cuenta de Stripe está conectada pero faltan datos por
                completar. Termina la configuración para poder recibir pagos.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isPending ? (
                  "Redirigiendo..."
                ) : (
                  <>
                    Completar configuración
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Connected but charges not yet enabled */}
        {status.connected && status.detailsSubmitted && !status.chargesEnabled && (
          <div className="flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Cuenta en revisión
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tu información ha sido enviada y Stripe está verificando tu
                cuenta. Recibirás una notificación cuando los pagos estén
                habilitados.
              </p>
            </div>
          </div>
        )}

        {/* Fully connected and charges enabled */}
        {status.connected && status.chargesEnabled && (
          <div className="flex items-start gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Cuenta de Stripe conectada
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                Tu cuenta está activa y lista para recibir pagos por tus cursos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
