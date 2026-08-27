import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, ListChecks, BarChart3, Zap, Send } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAdmin } from "@/lib/survey-access";
import { listSurveysForAdmin } from "@/lib/queries/survey";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-surface-tertiary text-text-tertiary" },
  PUBLISHED: { label: "Activa", className: "bg-emerald-50 text-emerald-700" },
  ARCHIVED: { label: "Archivada", className: "bg-amber-50 text-amber-700" },
};

const TRIGGER_LABEL: Record<string, string> = {
  MANUAL: "Envío manual",
  COURSE_COMPLETED: "Al terminar el curso",
  CERTIFICATE_ISSUED: "Al emitir el diploma",
};

export default async function AdminSurveysPage() {
  const user = await requireSurveyAdmin();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/tenant-admin");
  }

  const surveys = await listSurveysForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Encuestas</h1>
          <p className="mt-1 max-w-2xl text-text-secondary">
            Cuestionarios de satisfacción que administras tú. Cada encuesta es una
            plantilla reutilizable: se lanza por bloques a una empresa, curso,
            proyecto o evento, y los resultados llegan aquí antes que a nadie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tenant-admin/surveys/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <BarChart3 className="h-4 w-4" />
            Informe
          </Link>
          <Link
            href="/tenant-admin/surveys/new"
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
            Todavía no hay encuestas
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Crea la primera para medir la satisfacción de un curso, un workshop
            o un proyecto.
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
                    href={`/tenant-admin/surveys/${s.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-secondary"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-heading text-base font-semibold text-text-primary">
                          {s.title}
                        </h2>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                        {s.trigger !== "MANUAL" && (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                            <Zap className="h-3 w-3" />
                            {TRIGGER_LABEL[s.trigger]}
                            {s.triggerCourse ? ` · ${s.triggerCourse.title}` : ""}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-text-tertiary">
                          {s.description}
                        </p>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                        <span>
                          {s._count.questions} pregunta
                          {s._count.questions !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {s._count.campaigns} lanzamiento
                          {s._count.campaigns !== 1 ? "s" : ""}
                        </span>
                        <span>
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
