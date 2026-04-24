import { BarChart3, Calendar, Users } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  enrollments: {
    id: string;
    courseId: string;
    progress: number;
    status: string;
    completedAt: Date | null;
    course: { id: string; title: string };
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

  // Team-level KPIs scoped to assigned courses only.
  let totalSlots = 0;
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
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary-600" />
        <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Avance del equipo
          </h2>
          <p className="text-xs text-text-tertiary">
            Como líder de la empresa puedes ver el progreso de cada compañero
            en los cursos asignados.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Avance promedio" value={`${avgProgress}%`} />
        <Kpi
          label="Inscripciones"
          value={`${totalEnrolled}/${totalSlots}`}
          hint={`${enrollmentRate}% de cobertura`}
        />
        <Kpi label="Cursos completados" value={String(totalCompleted)} />
      </div>

      {/* Team table — mirrors /professor/students layout */}
      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">
            Aún no hay miembros en la empresa.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Compañero
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Correo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Cursos Inscritos
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Progreso Prom.
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Sesiones y Talleres
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Miembro Desde
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => {
                  // Progress only over courses the company has assigned.
                  const enrollmentsInScope = m.enrollments.filter((e) =>
                    courseIds.includes(e.courseId),
                  );
                  const memberAvg =
                    enrollmentsInScope.length > 0
                      ? Math.round(
                          (enrollmentsInScope.reduce(
                            (sum, e) => sum + e.progress,
                            0,
                          ) /
                            enrollmentsInScope.length) *
                            100,
                        )
                      : 0;

                  const courseTitles = enrollmentsInScope
                    .map((e) => e.course.title)
                    .join(", ");

                  // Workshop attendance across the member's enrolled courses.
                  const attendedSet = new Set(
                    m.workshopAttendances.map((x) => x.workshopId),
                  );
                  const seenW = new Set<string>();
                  let wAttended = 0;
                  let wTotal = 0;
                  for (const e of enrollmentsInScope) {
                    for (const wId of workshopsByCourse[e.courseId] ?? []) {
                      if (seenW.has(wId)) continue;
                      seenW.add(wId);
                      wTotal += 1;
                      if (attendedSet.has(wId)) wAttended += 1;
                    }
                  }

                  const memberSince = new Date(m.createdAt).toLocaleDateString(
                    "es-MX",
                    { year: "numeric", month: "short", day: "numeric" },
                  );

                  return (
                    <tr key={m.id} className="hover:bg-surface-secondary">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.name ?? m.email}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                              {getInitials(m.name ?? m.email)}
                            </div>
                          )}
                          <span className="text-sm font-medium text-text-primary">
                            {m.name ?? "Sin nombre"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-text-secondary">
                        {m.email}
                      </td>
                      <td className="max-w-xs px-5 py-4">
                        {enrollmentsInScope.length === 0 ? (
                          <span className="text-xs text-text-tertiary">
                            Sin inscripciones
                          </span>
                        ) : (
                          <p
                            className="truncate text-sm text-text-secondary"
                            title={courseTitles}
                          >
                            {courseTitles}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-tertiary">
                            <div
                              className="h-full rounded-full bg-primary-600"
                              style={{ width: `${memberAvg}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-secondary">
                            {memberAvg}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {wTotal === 0 ? (
                          <span className="text-sm text-text-tertiary">
                            Sin sesiones
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                            <Calendar className="h-3.5 w-3.5 text-primary-600" />
                            <span className="font-medium text-text-primary">
                              {wAttended}
                            </span>
                            <span className="text-text-tertiary">
                              / {wTotal}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-text-tertiary">
                        {memberSince}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-0.5 font-heading text-2xl font-bold text-text-primary">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}
