import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, ListChecks, Building2, Users } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAuthor } from "@/lib/auth";
import { listSurveysForTenant } from "@/lib/queries/survey";

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

export default async function SurveysListPage() {
  const user = await requireSurveyAuthor();

  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/professor");
  }

  const surveys = await listSurveysForTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Encuestas
          </h1>
          <p className="mt-1 text-text-secondary">
            Crea encuestas cortas y compártelas por link público. Los
            resultados se agrupan por empresa para que el líder los vea.
          </p>
        </div>
        <Link
          href="/professor/surveys/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Encuesta
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            No hay encuestas creadas aún
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Crea una encuesta para enviar a los proveedores o equipo de una
            empresa.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <ul className="divide-y divide-border">
            {surveys.map((s) => {
              const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.DRAFT!;
              return (
                <li key={s.id}>
                  <Link
                    href={`/professor/surveys/${s.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-secondary"
                  >
                    <div className="min-w-0">
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
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {s.company.name}
                        </span>
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
                    </div>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {new Date(s.updatedAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
