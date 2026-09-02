import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { listManualsForAdmin } from "@/lib/queries/manual";
import { NewManualForm } from "./new-manual-form";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-amber-100 text-amber-800",
};

export default async function TenantAdminManualsPage() {
  const manuals = await listManualsForAdmin().catch(() => null);
  if (!manuals) redirect("/tenant-admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Manuales Maestros
          </h1>
          <p className="mt-1 text-text-secondary">
            El contenido que se activa para cada empresa cliente: secciones,
            documentos y evidencias requeridas.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Plantillas de la norma, del tenant. La implementación para cada
            empresa vive en Proyectos.
          </p>
        </div>
        <NewManualForm />
      </div>

      {manuals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Todavía no hay manuales. Crea el primero para empezar a cargar sus
            secciones.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {manuals.map((m) => {
            const sections = m.chapters.reduce(
              (sum, c) => sum + c._count.sections,
              0,
            );
            return (
              <Link
                key={m.id}
                href={`/tenant-admin/manuals/${m.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{m.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_CLASS[m.status]
                      }`}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  {m.normaLabel ? (
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {m.normaLabel}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Actualizado el {DATE.format(new Date(m.updatedAt))}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-text-tertiary">
                  <p>
                    {sections} {sections === 1 ? "sección" : "secciones"}
                  </p>
                  <p>
                    {m._count.documents}{" "}
                    {m._count.documents === 1 ? "documento" : "documentos"}
                  </p>
                  <p>
                    {m._count.assignments}{" "}
                    {m._count.assignments === 1 ? "empresa" : "empresas"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
