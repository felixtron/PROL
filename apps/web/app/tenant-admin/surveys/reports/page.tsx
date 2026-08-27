import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAdmin } from "@/lib/survey-access";
import {
  getSurveyReportForAdmin,
  listCompaniesForSurveyAdmin,
  listCoursesForSurveyAdmin,
  listSurveysForAdmin,
  type SurveyReportGroup,
} from "@/lib/queries/survey";
import { CAMPAIGN_STATE_LABEL } from "@/lib/surveys";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

function tone(score: number | null): string {
  if (score === null) return "text-text-tertiary";
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

function GroupTable({ title, groups }: { title: string; groups: SurveyReportGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-heading text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <ul className="divide-y divide-border">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="min-w-0 truncate text-sm text-text-primary">{g.label}</span>
            <span className="flex shrink-0 items-center gap-4 text-xs text-text-tertiary">
              <span>
                {g.campaigns} lanz. · {g.totalResponses} resp.
              </span>
              <span className={`text-sm font-semibold ${tone(g.satisfactionIndex)}`}>
                {g.satisfactionIndex !== null ? g.satisfactionIndex.toFixed(1) : "—"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Informe consolidado del administrador: índice ponderado por encuesta,
 * curso, empresa y periodo. Es la vista que responde "cómo vamos", frente al
 * detalle de un solo lanzamiento.
 */
export default async function SurveyReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSurveyAdmin();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/tenant-admin");
  }

  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const from = one("from");
  const to = one("to");

  const [report, surveys, companies, courses] = await Promise.all([
    getSurveyReportForAdmin({
      surveyId: one("survey"),
      companyId: one("company"),
      courseId: one("course"),
      from: from ? new Date(`${from}T00:00:00`) : null,
      to: to ? new Date(`${to}T23:59:59`) : null,
    }),
    listSurveysForAdmin(),
    listCompaniesForSurveyAdmin(),
    listCoursesForSurveyAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/tenant-admin/surveys"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Encuestas
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Informe de satisfacción
        </h1>
        <p className="mt-1 text-text-secondary">
          Índice ponderado por número de respuestas. Sólo cuenta lanzamientos ya
          enviados.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-tertiary">
            Encuesta
          </label>
          <select
            name="survey"
            defaultValue={one("survey") ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="">Todas</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-tertiary">
            Empresa
          </label>
          <select
            name="company"
            defaultValue={one("company") ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-tertiary">
            Curso
          </label>
          <select
            name="course"
            defaultValue={one("course") ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-tertiary">
            Desde
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-tertiary">
              Hasta
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Índice general
          </p>
          <p className={`mt-1 font-heading text-3xl font-bold ${tone(report.overallIndex)}`}>
            {report.overallIndex !== null ? report.overallIndex.toFixed(1) : "—"}
            {report.overallIndex !== null && (
              <span className="ml-1 text-base font-medium text-text-tertiary">/100</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Respuestas
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {report.totalResponses}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Lanzamientos
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {report.rows.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GroupTable title="Por encuesta" groups={report.bySurvey} />
        <GroupTable title="Por empresa" groups={report.byCompany} />
        <GroupTable title="Por curso" groups={report.byCourse} />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-sm font-semibold text-text-primary">
            Detalle por lanzamiento
          </h2>
        </div>
        {report.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-tertiary">
            No hay lanzamientos que cumplan el filtro.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {report.rows.map((r) => (
              <li key={r.campaignId}>
                <Link
                  href={`/tenant-admin/surveys/campaigns/${r.campaignId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {r.campaignName}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {r.surveyTitle}
                      {r.contextLine ? ` · ${r.contextLine}` : ""} ·{" "}
                      {CAMPAIGN_STATE_LABEL[r.state]} · cierra {DATE.format(r.closesAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-text-tertiary">
                    <span>
                      {r.totalResponses}/{r.recipientCount} ·{" "}
                      {Math.round(r.responseRate * 100)}%
                    </span>
                    <span className={`text-sm font-semibold ${tone(r.satisfactionIndex)}`}>
                      {r.satisfactionIndex !== null
                        ? r.satisfactionIndex.toFixed(1)
                        : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
