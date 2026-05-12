import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, ListChecks, Users, BarChart3, ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireCompanyLeader } from "@/lib/auth";
import { listSurveysForCurrentUser } from "@/lib/queries/survey";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Borrador",
    className: "bg-surface-tertiary text-text-tertiary",
  },
  PUBLISHED: {
    label: "Publicada",
    className: "bg-emerald-50 text-emerald-700",
  },
  ARCHIVED: {
    label: "Archivada",
    className: "bg-amber-50 text-amber-700",
  },
};

export default async function LeaderSurveysListPage() {
  const { company } = await requireCompanyLeader();

  // Gate by tenant feature flag — the leader UI is only available when the
  // tenant admin has the surveys module enabled.
  const tenant = await db.tenant.findUnique({
    where: { id: company.tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant) notFound();
  if (!tenant.surveysEnabled) redirect("/dashboard/company");

  const surveys = await listSurveysForCurrentUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/dashboard/company"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {company.name}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Encuestas
            </h1>
            <p className="mt-1 text-text-secondary">
              Crea encuestas para tu empresa y comparte el link público. Los
              resultados quedan disponibles aquí mismo.
            </p>
          </div>
          <Link
            href="/dashboard/company/surveys/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nueva encuesta
          </Link>
        </div>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            Aún no creaste ninguna encuesta
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Crea una para invitar a respondentes (clientes, proveedores,
            colaboradores) a dejar feedback.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <ul className="divide-y divide-border">
            {surveys.map((s) => {
              const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.DRAFT!;
              return (
                <li key={s.id}>
                  <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <Link
                      href={`/dashboard/company/surveys/${s.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-heading text-base font-semibold text-text-primary">
                          {s.title}
                        </h2>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      {s.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-text-tertiary">
                          {s.description}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                        <span>
                          {s._count.questions} pregunta
                          {s._count.questions !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {s._count.responses} respuesta
                          {s._count.responses !== 1 ? "s" : ""}
                        </span>
                      </p>
                    </Link>
                    {s._count.responses > 0 ? (
                      <Link
                        href={`/dashboard/company/surveys/${s.id}/results`}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Resultados
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
