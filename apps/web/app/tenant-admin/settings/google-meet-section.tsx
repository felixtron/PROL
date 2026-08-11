"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-scopes";
import {
  designateGoogleMeetAccount,
  disconnectGoogleMeetAccount,
  type GoogleMeetStatus,
} from "@/lib/actions/google-integration";

/** Marca que agregamos al callbackURL para reconocer el regreso de Google. */
const CALLBACK_FLAG = "google";

export function GoogleMeetSection({ status }: { status: GoogleMeetStatus }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // El efecto de regreso corre una sola vez aunque React remonte en dev.
  const designated = useRef(false);

  // Al volver del consentimiento de Google, Better Auth ya guardó los tokens
  // en `accounts`; lo que falta es marcar esta cuenta como la anfitriona del
  // tenant. Eso no puede pasar en el callback de OAuth, así que se hace acá.
  useEffect(() => {
    if (searchParams.get(CALLBACK_FLAG) !== "connected") return;
    if (designated.current) return;
    designated.current = true;

    startTransition(async () => {
      const result = await designateGoogleMeetAccount();
      if ("error" in result) {
        setError(result.error);
      }
      router.replace("/tenant-admin/settings");
      router.refresh();
    });
  }, [searchParams, router]);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      try {
        // callbackURL absoluta al origen actual: el redirect_uri de Google
        // apunta siempre al apex, y si el admin entró por el subdominio del
        // tenant una URL relativa lo devolvería al apex, donde su cookie de
        // sesión no viaja. `trustedOrigins` ya acepta *.<dominio>.
        await authClient.linkSocial({
          provider: "google",
          scopes: [GOOGLE_CALENDAR_SCOPE],
          callbackURL: `${window.location.origin}/tenant-admin/settings?${CALLBACK_FLAG}=connected`,
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo iniciar la conexión con Google.",
        );
      }
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectGoogleMeetAccount();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        Google Meet
      </h2>
      <p className="mt-1 text-sm text-text-tertiary">
        Conecta una cuenta de Google para que los profesores generen el enlace
        de Meet automáticamente al crear sesiones virtuales.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {/* Sin credenciales en el servidor: la integración no está disponible */}
        {!status.configured && (
          <div className="flex items-start gap-4 rounded-lg border border-border bg-surface-secondary p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">
              <AlertCircle className="h-5 w-5 text-text-tertiary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Integración no disponible
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Falta configurar las credenciales de Google en el servidor.
                Contacta al equipo de PROL para habilitarla.
              </p>
            </div>
          </div>
        )}

        {/* Configurada pero sin conectar */}
        {status.configured && !status.connected && (
          <div className="flex items-start gap-4 rounded-lg border border-border bg-primary-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <Video className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Conecta la cuenta de Google de tu academia
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Usa la cuenta institucional, no la personal de un profesor: las
                reuniones se crean en su calendario y todos los profesores la
                comparten.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isPending ? (
                  "Conectando..."
                ) : (
                  <>
                    Conectar Google
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Conectada */}
        {status.configured && status.connected && (
          <div className="flex items-start gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Google Meet conectado
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {status.email
                  ? `Las reuniones se crean en el calendario de ${status.email}.`
                  : "Las reuniones se crean en el calendario de la cuenta conectada."}
                {status.hostIsAnotherUser &&
                  " La conectó otro administrador de la academia."}
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
              >
                {isPending ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
