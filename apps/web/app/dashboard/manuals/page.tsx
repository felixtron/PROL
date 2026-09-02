import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookMarked, CalendarClock, CheckCircle2 } from "lucide-react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { listMyManuals } from "@/lib/queries/manual";

export const dynamic = "force-dynamic";

/**
 * Dashboard de cumplimiento del cliente: los manuales activos de su empresa,
 * cuánto llevan implantado y cuánto tienen pendiente.
 */
export default async function MyManualsPage() {
  const user = await requireUser();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { documentsEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.documentsEnabled) redirect("/dashboard");
  }

  const manuals = await listMyManuals();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Proyectos
        </h1>
        <p className="mt-1 text-text-secondary">
          Consulta el manual de implementación de tu sistema de gestión, descarga
          las plantillas de tu empresa y atiende los requisitos que se te piden.
        </p>
      </div>

      {manuals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <BookMarked className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Tu empresa todavía no tiene ningún manual activo. Tu consultor lo
            habilitará al arrancar el proyecto.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {manuals.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/manuals/${m.id}`}
              className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold text-text-primary">
                    {m.manual.title}
                  </h2>
                  {m.manual.normaLabel ? (
                    <p className="text-sm text-text-tertiary">{m.manual.normaLabel}</p>
                  ) : null}
                </div>
                {m.status === "PAUSED" ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    En pausa
                  </span>
                ) : null}
              </div>

              {m.manual.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                  {m.manual.description}
                </p>
              ) : null}

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>Avance de implantación</span>
                  <span className="font-medium text-text-secondary">
                    {m.progress.percent}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${m.progress.percent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {m.progress.approvedRequirements} de {m.progress.totalRequirements}{" "}
                  evidencias aprobadas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-text-tertiary" />
                  {m.pending} {m.pending === 1 ? "actividad pendiente" : "actividades pendientes"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
