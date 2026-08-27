import type { ReactNode } from "react";
import { CalendarClock, Building2 } from "lucide-react";
import type { CampaignContext, CampaignState } from "@/lib/surveys";
import { CAMPAIGN_STATE_LABEL } from "@/lib/surveys";

/**
 * Marco común de las páginas públicas de encuesta. No es un layout de Next
 * porque tiene que recibir el contexto ya resuelto (empresa, curso, evento):
 * ese dato es justo lo que evita que el destinatario tenga que adivinar de
 * qué encuesta se trata cuando le llegan varias.
 */
export function SurveyShell({
  tenantName,
  title,
  description,
  context,
  closesAt,
  children,
}: {
  tenantName: string;
  title: string;
  description?: string | null;
  context: CampaignContext;
  closesAt?: Date | null;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {tenantName}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-neutral-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              {description}
            </p>
          ) : null}

          {(context.line || closesAt) && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
              {context.line && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-neutral-400" />
                  {context.line}
                </span>
              )}
              {closesAt && (
                <span className="inline-flex items-center gap-1.5 text-neutral-500">
                  <CalendarClock className="h-4 w-4 text-neutral-400" />
                  Abierta hasta el{" "}
                  {new Intl.DateTimeFormat("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "America/Mexico_City",
                  }).format(closesAt)}
                </span>
              )}
            </div>
          )}
        </header>

        {children}
      </div>
    </main>
  );
}

/** Mensaje cuando el lanzamiento no acepta respuestas ahora mismo. */
export function SurveyClosedNotice({
  state,
  alreadyAnswered,
}: {
  state: CampaignState;
  alreadyAnswered?: boolean;
}) {
  if (alreadyAnswered) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-emerald-900">
          Ya respondiste esta encuesta
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Gracias. Tu respuesta quedó registrada y no puede modificarse.
        </p>
      </div>
    );
  }

  const message =
    state === "SCHEDULED"
      ? "Esta encuesta todavía no está abierta. Vuelve en la fecha de apertura."
      : state === "CANCELLED"
        ? "Este envío fue anulado."
        : "Esta encuesta ya venció y no acepta más respuestas.";

  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-neutral-900">
        {CAMPAIGN_STATE_LABEL[state]}
      </h2>
      <p className="mt-1 text-sm text-neutral-600">{message}</p>
    </div>
  );
}
