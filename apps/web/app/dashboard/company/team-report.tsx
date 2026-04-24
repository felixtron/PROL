import { BarChart3, CheckCircle2, Clock } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  lastLoginAt: Date | null;
  enrollments: {
    id: string;
    courseId: string;
    progress: number;
    status: string;
    completedAt: Date | null;
  }[];
  workshopAttendances: { workshopId: string }[];
}

interface Assignment {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    totalLessons: number;
  };
}

export function TeamReport({
  members,
  assignments,
  workshopsByCourse,
}: {
  members: Member[];
  assignments: Assignment[];
  workshopsByCourse: Record<string, string[]>;
}) {
  const courseIds = assignments.map((a) => a.courseId);

  // KPIs across the team for assigned courses only.
  let totalSlots = 0; // member × course pairs
  let totalEnrolled = 0;
  let totalCompleted = 0;
  let progressSum = 0;
  let progressCount = 0;

  for (const m of members) {
    for (const c of courseIds) {
      totalSlots += 1;
      const e = m.enrollments.find((x) => x.courseId === c);
      if (e) {
        totalEnrolled += 1;
        progressSum += e.progress;
        progressCount += 1;
        if (e.status === "COMPLETED") totalCompleted += 1;
      }
    }
  }

  const avgProgress =
    progressCount > 0 ? Math.round((progressSum / progressCount) * 100) : 0;
  const enrollmentRate =
    totalSlots > 0 ? Math.round((totalEnrolled / totalSlots) * 100) : 0;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
          <BarChart3 className="h-4 w-4 text-primary-600" />
          Reporte de avance del equipo
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Como líder de la empresa puedes ver el progreso de todos tus
          compañeros en los cursos asignados.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 px-5 sm:grid-cols-3">
        <Kpi label="Avance promedio" value={`${avgProgress}%`} />
        <Kpi
          label="Inscripciones"
          value={`${totalEnrolled}/${totalSlots}`}
          hint={`${enrollmentRate}% de cobertura`}
        />
        <Kpi label="Cursos completados" value={String(totalCompleted)} />
      </div>

      {/* Matrix */}
      {assignments.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-text-tertiary">
          La empresa aún no tiene cursos asignados.
        </p>
      ) : members.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-text-tertiary">
          Aún no hay miembros en la empresa.
        </p>
      ) : (
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-left text-xs text-text-tertiary">
                <th className="px-3 py-2 font-medium">Compañero</th>
                {assignments.map((a) => (
                  <th
                    key={a.id}
                    className="px-3 py-2 font-medium"
                    title={a.course.title}
                  >
                    <span className="line-clamp-2">{a.course.title}</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => {
                let memberProgressSum = 0;
                let memberProgressCount = 0;
                for (const c of courseIds) {
                  const e = m.enrollments.find((x) => x.courseId === c);
                  if (e) {
                    memberProgressSum += e.progress;
                    memberProgressCount += 1;
                  }
                }
                const memberAvg =
                  memberProgressCount > 0
                    ? Math.round((memberProgressSum / memberProgressCount) * 100)
                    : 0;

                return (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name ?? m.email}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {(m.name ?? m.email).slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">
                            {m.name ?? m.email}
                          </p>
                          <p className="truncate text-xs text-text-tertiary">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {assignments.map((a) => {
                      const e = m.enrollments.find(
                        (x) => x.courseId === a.courseId
                      );
                      const courseWorkshopIds =
                        workshopsByCourse[a.courseId] ?? [];
                      const totalWorkshops = courseWorkshopIds.length;
                      const attendedSet = new Set(
                        m.workshopAttendances.map((x) => x.workshopId)
                      );
                      const attendedCount = courseWorkshopIds.filter((id) =>
                        attendedSet.has(id)
                      ).length;
                      return (
                        <td key={a.id} className="px-3 py-2">
                          <ProgressCell
                            enrollment={e ?? null}
                            attendance={
                              totalWorkshops > 0
                                ? { attended: attendedCount, total: totalWorkshops }
                                : null
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-sm font-semibold text-text-primary">
                      {memberProgressCount > 0 ? `${memberAvg}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-0.5 font-heading text-2xl font-bold text-text-primary">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

function ProgressCell({
  enrollment,
  attendance,
}: {
  enrollment: { progress: number; status: string } | null;
  attendance: { attended: number; total: number } | null;
}) {
  if (!enrollment && !attendance) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
        <Clock className="h-3 w-3" />
        Sin inscribir
      </span>
    );
  }

  const pct = enrollment ? Math.round(enrollment.progress * 100) : 0;
  const completed = enrollment?.status === "COMPLETED";

  return (
    <div className="min-w-[140px] space-y-1">
      {enrollment ? (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">{pct}%</span>
            {completed && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Completado
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={`h-full rounded-full ${
                completed ? "bg-emerald-500" : "bg-primary-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
          <Clock className="h-3 w-3" />
          Sin inscribir
        </span>
      )}
      {attendance && (
        <p className="text-[11px] text-text-tertiary">
          Asistió a {attendance.attended}/{attendance.total} workshop
          {attendance.total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
