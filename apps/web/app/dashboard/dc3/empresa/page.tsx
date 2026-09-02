import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import {
  getCompanyDc3AdminPanel,
  getMyAdministeredCompanyId,
} from "@/lib/queries/dc3";
import { Dc3EmployerForm } from "@/components/dc3-employer-form";
import { Dc3CompanyAdminNotice } from "@/components/dc3-notice";
import { Dc3ExecutionDates } from "./execution-dates";

export const dynamic = "force-dynamic";

/**
 * Panel DC-3 del administrador de cursos de una empresa.
 *
 * Reúne las dos manos que no son del trabajador —los datos del patrón y
 * las fechas reales de ejecución— porque las llena la misma persona y
 * porque, hasta que estén, ningún participante de esa empresa puede
 * emitir su constancia. Tenerlas separadas en dos pantallas era pedirle
 * al administrador que adivinara que le faltaba la segunda.
 */
export default async function CompanyDc3AdminPage() {
  const companyId = await getMyAdministeredCompanyId();
  if (!companyId) notFound();

  const panel = await getCompanyDc3AdminPanel(companyId);
  if (!panel) notFound();

  const { company, courses } = panel;

  const blocked = courses.reduce(
    (acc, c) =>
      acc +
      c.participants.filter(
        (p) => p.readiness.applicable && !p.readiness.ready && !p.issuedFolio
      ).length,
    0
  );

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      <Link
        href="/dashboard/dc3"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a mis constancias
      </Link>

      <div className="mt-3 mb-4 md:mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Administración de cursos — {company.name}
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Constancias DC-3 de los trabajadores de esta empresa.
        </p>
      </div>

      <Dc3CompanyAdminNotice className="mb-5" />

      {blocked > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p className="text-xs text-amber-900">
            <strong>{blocked}</strong>{" "}
            {blocked === 1
              ? "constancia no se puede emitir todavía"
              : "constancias no se pueden emitir todavía"}
            . Abajo, en cada curso, se indica qué falta y quién debe
            capturarlo.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5 lg:order-1">
          <div>
            <h2 className="font-heading text-sm font-semibold text-text-primary">
              Fechas de ejecución por curso
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              El DC-3 exige el periodo real en que se impartió la
              capacitación, no la fecha en que se dio de alta el curso.
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-text-tertiary" />
              <p className="mt-2 text-sm font-medium text-text-secondary">
                Ningún trabajador está inscrito a un curso con DC-3
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Aparecerán aquí en cuanto se inscriban a un curso configurado
                para emitir constancias.
              </p>
            </div>
          ) : (
            courses.map((course) => (
              <Dc3ExecutionDates key={course.courseId} course={course} />
            ))
          )}
        </div>

        <div className="lg:order-2">
          <Dc3EmployerForm company={company} />
        </div>
      </div>
    </div>
  );
}
