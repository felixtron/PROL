import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, FileText } from "lucide-react";
import { requireTenantAdmin } from "@/lib/auth";
import { getTenantDc3Courses, getTrainingAgents } from "@/lib/queries/dc3";
import { dc3ThematicAreaLabel } from "@/lib/dc3/catalogs";
import { TrainingAgents } from "./training-agents";

export const dynamic = "force-dynamic";

/**
 * Panel DC-3 de la administración: los agentes capacitadores del tenant y
 * el estado de configuración de cada curso.
 *
 * La configuración vive aquí y no en el editor del profesor porque el
 * DC-3 tiene efectos ante la STPS: quién lo impartió, con qué registro y
 * en qué área temática no son decisiones editoriales del curso.
 */
export default async function TenantAdminDc3Page() {
  const admin = await requireTenantAdmin();

  if (!admin.tenantId) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          DC-3
        </h1>
        <p className="mt-1 text-text-secondary">
          Como SUPER_ADMIN, entra al tenant correspondiente para configurar sus
          constancias DC-3.
        </p>
      </div>
    );
  }

  const [courses, agents] = await Promise.all([
    getTenantDc3Courses(),
    getTrainingAgents(admin.tenantId),
  ]);

  const enabled = courses.filter((c) => c.dc3Enabled);
  const disabled = courses.filter((c) => !c.dc3Enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Constancias DC-3
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configura qué cursos emiten Constancia de Competencias o de
          Habilidades Laborales y con qué datos se imprime.
        </p>
      </div>

      <TrainingAgents agents={agents} />

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-500" />
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Cursos
          </h2>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          Un curso emite DC-3 sólo cuando está activado y tiene área temática,
          duración, agente capacitador e instructor.
        </p>

        <div className="mt-4 space-y-2">
          {enabled.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}

          {enabled.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-text-tertiary">
              Ningún curso emite DC-3 todavía.
            </p>
          )}
        </div>

        {disabled.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-text-secondary">
              {disabled.length} curso(s) sin DC-3 activado
            </summary>
            <div className="mt-3 space-y-2">
              {disabled.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

type CourseSummary = Awaited<ReturnType<typeof getTenantDc3Courses>>[number];

function CourseRow({ course }: { course: CourseSummary }) {
  // Lo mismo que exige el emisor, resumido para el listado: si falta
  // cualquiera de estos, ningún alumno del curso podrá imprimir.
  const missing: string[] = [];
  if (!course.dc3ThematicAreaCode) missing.push("área temática");
  if (!course.dc3DurationHours) missing.push("duración");
  if (!course.dc3TrainingAgent) missing.push("agente capacitador");
  if (!course.dc3InstructorName) missing.push("instructor");
  if (course.dc3DeliveryMode === "LIVE" && course._count.dc3Editions === 0) {
    missing.push("ediciones con fechas");
  }

  const complete = course.dc3Enabled && missing.length === 0;

  return (
    <Link
      href={`/tenant-admin/dc3/${course.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-surface-secondary"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {complete ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <CircleDashed className="h-4 w-4 shrink-0 text-text-tertiary" />
          )}
          <p className="truncate text-sm font-medium text-text-primary">
            {course.dc3CourseName || course.title}
          </p>
        </div>
        <p className="mt-0.5 pl-6 text-xs text-text-tertiary">
          {course.dc3Enabled ? (
            complete ? (
              <>
                {course.dc3DeliveryMode === "LIVE" ? "En vivo" : "En línea"} ·{" "}
                {course.dc3DurationHours} h ·{" "}
                {dc3ThematicAreaLabel(course.dc3ThematicAreaCode)} ·{" "}
                {course.dc3TrainingAgent?.name}
              </>
            ) : (
              <span className="text-amber-700">Falta: {missing.join(", ")}</span>
            )
          ) : (
            "DC-3 desactivado"
          )}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary" />
    </Link>
  );
}
