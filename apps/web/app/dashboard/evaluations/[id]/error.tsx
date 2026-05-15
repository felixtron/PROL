"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";

/**
 * Error boundary for /dashboard/evaluations/[id]. Without this, any throw
 * during render (e.g. `requireUser()` saying "Sesión expirada" mid-session
 * or a transient DB lookup failure) bubbles past the dashboard layout and
 * Next.js renders a blank body — the user sees a completely empty page
 * with no indication of what happened.
 */
export default function EvaluationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to server so we have a chance to correlate to the digest the
    // user reports.
    console.error(
      "[evaluations/[id]] render failed",
      error.message,
      error.digest,
    );
  }, [error]);

  const isSession =
    /sesi[oó]n expirada/i.test(error.message) ||
    error.message.toLowerCase().includes("no autorizado");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 font-heading text-lg font-semibold text-amber-900">
          {isSession
            ? "Tu sesión expiró"
            : "No pudimos cargar la evaluación"}
        </h1>
        <p className="mt-1 text-sm text-amber-800">
          {isSession
            ? "Volvé a iniciar sesión para continuar respondiendo."
            : "Algo falló mientras cargábamos los datos. Probá de nuevo en un momento."}
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-amber-700/80">
            Código: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {isSession ? (
            <Link
              href="/sign-in?callbackUrl=/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <RotateCw className="h-4 w-4" />
              Reintentar
            </button>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
