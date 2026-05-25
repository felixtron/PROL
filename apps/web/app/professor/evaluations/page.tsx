import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, ClipboardCheck, Building2 } from "lucide-react";
import { db, type EvaluationKind } from "@prol/db";
import { requireEvaluationAuthor } from "@/lib/auth";
import { listEvaluationsForTenant } from "@/lib/queries/evaluation";
import { ResultsShortcut } from "./results-shortcut";

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

const KIND_LABEL: Record<EvaluationKind, string> = {
  DAFO: "DAFO",
  DIAGNOSTIC: "Diagnóstico",
  GUIDELINES: "Directrices",
  STAKEHOLDERS: "Partes interesadas",
  ROLES: "Cargos y roles",
};

export default async function EvaluationsListPage() {
  const user = await requireEvaluationAuthor();

  // Gate by tenant feature flag.
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { evaluationsEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.evaluationsEnabled) redirect("/professor");
  }

  const evaluations = await listEvaluationsForTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Evaluaciones
          </h1>
          <p className="mt-1 text-text-secondary">
            Crea plantillas tipo DAFO y asígnalas a las empresas.
          </p>
        </div>
        <Link
          href="/professor/evaluations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Evaluación
        </Link>
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            No hay evaluaciones creadas aún
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Crea una plantilla con secciones y preguntas para luego asignarla
            a tus empresas.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <ul className="divide-y divide-border">
            {evaluations.map((ev) => {
              const st = STATUS_LABEL[ev.status] ?? STATUS_LABEL.DRAFT!;
              return (
                <li
                  key={ev.id}
                  className="flex items-stretch gap-2 px-2 transition-colors hover:bg-surface-secondary"
                >
                  <Link
                    href={`/professor/evaluations/${ev.id}`}
                    className="flex flex-1 items-start justify-between gap-4 px-3 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-heading text-base font-semibold text-text-primary">
                          {ev.title}
                        </h2>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                        <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                          {KIND_LABEL[ev.kind]}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-text-tertiary">
                          {ev.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-tertiary">
                        {ev._count.sections} sección
                        {ev._count.sections !== 1 ? "es" : ""} ·{" "}
                        <Building2 className="inline h-3 w-3 -translate-y-px text-text-tertiary" />{" "}
                        {ev._count.assignments} empresa
                        {ev._count.assignments !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {new Date(ev.updatedAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Link>
                  {ev.assignments.length > 0 && (
                    <div className="flex items-center pr-2">
                      <ResultsShortcut
                        evaluationId={ev.id}
                        assignments={ev.assignments}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
