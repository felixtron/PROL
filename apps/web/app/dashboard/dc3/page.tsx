import Link from "next/link";
import { Building2, FileText } from "lucide-react";
import { getMyDc3Panel } from "@/lib/queries/dc3";
import { Dc3WorkerForm } from "./worker-form";
import { Dc3CourseRow } from "./course-row";

export const dynamic = "force-dynamic";

/**
 * Panel DC-3 del trabajador.
 *
 * Muestra su mano del formato —sus propios datos, que edita aquí— y el
 * estado de cada curso. Las otras dos manos (patrón y fechas de
 * ejecución) viven en el panel del administrador de cursos de su
 * empresa, al que sólo se enlaza si el usuario lo es.
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

  // "Administrador de cursos de la empresa" = el líder registrado de esa
  // empresa. Es quien captura el patrón y las fechas de ejecución; para
  // todos los demás este panel es sólo el bloque del trabajador.
  const isCompanyAdmin = profile.company.leaderId === profile.id;
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

          {/* Los datos del patrón NO se muestran al trabajador raso: son
              datos fiscales de su empresa, no suyos. Quien los administra
              los edita en su propio panel, que además es donde captura
              las fechas de ejecución. */}
          {isCompanyAdmin && (
            <Link
              href="/dashboard/dc3/empresa"
              className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-5 hover:bg-primary-100"
            >
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <span className="min-w-0">
                <span className="block font-heading text-sm font-semibold text-text-primary">
                  Administración de cursos de {profile.company.name}
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  Captura los datos del patrón y las fechas de ejecución para
                  desbloquear las constancias de todos los participantes.
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
