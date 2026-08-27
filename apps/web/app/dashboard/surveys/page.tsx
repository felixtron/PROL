import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListChecks, BarChart3, CalendarClock, CheckCircle2 } from "lucide-react";
import { db } from "@prol/db";
import { requireUser, getCompanyLed } from "@/lib/auth";
import {
  listMySurveyInvitations,
  listPublishedResultsForLeader,
} from "@/lib/queries/survey";
import { CAMPAIGN_STATE_LABEL } from "@/lib/surveys";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

/**
 * Panel del usuario cliente.
 *
 * Aquí sólo se responde y se consulta lo publicado: no hay crear, editar,
 * duplicar, reenviar ni cambiar configuración. Esas acciones no existen en
 * esta ruta y, aunque se invocaran directamente, las server actions exigen
 * rol de administrador.
 */
export default async function MySurveysPage() {
  const user = await requireUser();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/dashboard");
  }

  const invitations = await listMySurveyInvitations();
  const company = await getCompanyLed(user.id);
  const published = company ? await listPublishedResultsForLeader(company.id) : [];

  const pending = invitations.filter((i) => i.canAnswer);
  const history = invitations.filter((i) => !i.canAnswer);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Encuestas</h1>
        <p className="mt-1 text-text-secondary">
          Responde las encuestas de satisfacción que se te asignaron y consulta
          los resultados que se hayan publicado.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Pendientes
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <ListChecks className="mx-auto h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No tienes encuestas pendientes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((i) => (
              <li
                key={i.recipientId}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-semibold text-text-primary">
                      {i.title}
                    </h3>
                    {i.context.line && (
                      <p className="mt-0.5 text-sm text-text-tertiary">
                        {i.context.line}
                      </p>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Cierra el {DATE.format(i.closesAt)}
                    </p>
                  </div>
                  <Link
                    href={`/surveys/answer/${i.token}`}
                    className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    Responder
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Historial
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {history.map((i) => (
              <li
                key={i.recipientId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {i.title}
                  </p>
                  {i.context.line && (
                    <p className="mt-0.5 truncate text-xs text-text-tertiary">
                      {i.context.line}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {i.answered ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Respondida
                    </span>
                  ) : (
                    <span className="rounded-pill bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-tertiary">
                      {CAMPAIGN_STATE_LABEL[i.state]}
                    </span>
                  )}
                  {i.resultsAvailable && (
                    <Link
                      href={`/dashboard/surveys/${i.campaignId}/results`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Resultados
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {published.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Resultados publicados de {company?.name}
          </h2>
          <p className="text-sm text-text-tertiary">
            Consolidados que se aprobaron para tu empresa. Muestran promedios
            del conjunto, nunca respuestas individuales.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {published.map((p) => (
              <li key={p.campaignId}>
                <Link
                  href={`/dashboard/surveys/${p.campaignId}/results`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-tertiary">
                      {p.context.line || p.name} · {p.totalResponses}{" "}
                      {p.totalResponses === 1 ? "respuesta" : "respuestas"}
                    </p>
                  </div>
                  <BarChart3 className="h-4 w-4 shrink-0 text-text-tertiary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
