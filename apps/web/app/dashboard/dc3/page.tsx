import Link from "next/link";
import { Building2, FileText } from "lucide-react";
import { getMyDc3Panel } from "@/lib/queries/dc3";
import { Dc3WorkerForm } from "./worker-form";
import { Dc3CourseRow } from "./course-row";
import { Dc3EmployerForm } from "@/components/dc3-employer-form";

export const dynamic = "force-dynamic";

/**
 * Panel DC-3 del trabajador.
 *
 * Reúne las tres manos que llenan el formato: sus propios datos (que
 * edita aquí), los del patrón (que sólo edita si además es el líder de
 * proyecto de su empresa) y el estado de cada curso.
 */
export default async function Dc3Page() {
  const { profile, rows } = await getMyDc3Panel();

  // El DC-3 lo emite un patrón. Sin empresa asociada el módulo entero no
  // le corresponde a esta cuenta, así que no se muestra a medias.
  if (!profile?.company) {
    return (
      <div className="px-4 py-5 md:p-6 lg:p-8">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Constancias DC-3
        </h1>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-8 text-center md:p-12">
          <Building2 className="mx-auto h-8 w-8 text-text-tertiary md:h-10 md:w-10" />
          <p className="mt-2 text-sm font-medium text-text-secondary">
            Tu cuenta no está asociada a ninguna empresa
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-text-tertiary">
            La constancia DC-3 la emite el patrón que capacitó al trabajador,
            así que sólo está disponible para quienes se inscriben a través de
            una empresa con patrón registrado.
          </p>
          <Link
            href="/dashboard/certificates"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            Ver mis diplomas
          </Link>
        </div>
      </div>
    );
  }

  const isLeader = profile.company.leaderId === profile.id;
  const applicable = rows.filter((r) => r.readiness.applicable);
  const notApplicable = rows.filter((r) => !r.readiness.applicable);

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Constancias DC-3
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Constancia de Competencias o de Habilidades Laborales (STPS) para los
          cursos que concluyas con {profile.company.name}.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Cursos */}
        <div className="space-y-3 lg:order-1">
          <h2 className="font-heading text-sm font-semibold text-text-primary">
            Mis cursos
          </h2>

          {applicable.length === 0 && notApplicable.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-text-tertiary" />
              <p className="mt-2 text-sm font-medium text-text-secondary">
                Todavía no tienes cursos con constancia DC-3
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Aparecerán aquí en cuanto te inscribas a un curso configurado
                para emitirla.
              </p>
            </div>
          )}

          {applicable.map((row) => (
            <Dc3CourseRow key={row.enrollmentId} row={row} />
          ))}

          {notApplicable.length > 0 && (
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer text-xs font-medium text-text-secondary">
                {notApplicable.length} curso(s) sin constancia DC-3
              </summary>
              <div className="mt-3 space-y-3">
                {notApplicable.map((row) => (
                  <Dc3CourseRow key={row.enrollmentId} row={row} />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Formularios de captura */}
        <div className="space-y-5 lg:order-2">
          <Dc3WorkerForm profile={profile} />
          <Dc3EmployerForm company={profile.company} canEdit={isLeader} />
        </div>
      </div>
    </div>
  );
}
