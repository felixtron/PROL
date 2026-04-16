import { Users } from "lucide-react";
import { getProfessorStudents } from "@/lib/queries/students";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function StudentsPage() {
  const students = await getProfessorStudents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Mis Alumnos
          </h1>
          <p className="mt-1 text-text-secondary">
            Alumnos inscritos en tus cursos.
          </p>
        </div>
        {students.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
            <Users className="h-4 w-4" />
            {students.length} alumno{students.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            Aun no tienes alumnos
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Los alumnos apareceran aqui cuando se inscriban a tus cursos.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Alumno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Correo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Cursos Inscritos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Progreso Prom.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Miembro Desde
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map(({ student, enrollments }) => {
                  const avgProgress =
                    enrollments.length > 0
                      ? Math.round(
                          enrollments.reduce((sum, e) => sum + e.progress, 0) /
                            enrollments.length
                        )
                      : 0;
                  const courseNames = enrollments
                    .map((e) => e.courseTitle)
                    .join(", ");
                  const memberSince = new Date(
                    student.createdAt
                  ).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-surface-secondary"
                    >
                      {/* Avatar + Name */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          {student.avatar ? (
                            <img
                              src={student.avatar}
                              alt={student.name ?? ""}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                              {getInitials(student.name ?? "E")}
                            </div>
                          )}
                          <span className="text-sm font-medium text-text-primary">
                            {student.name ?? "Sin nombre"}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                        {student.email}
                      </td>

                      {/* Courses */}
                      <td className="max-w-xs px-6 py-4">
                        <p
                          className="truncate text-sm text-text-secondary"
                          title={courseNames}
                        >
                          {courseNames}
                        </p>
                      </td>

                      {/* Average Progress */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-tertiary">
                            <div
                              className="h-full rounded-full bg-primary-600"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-secondary">
                            {avgProgress}%
                          </span>
                        </div>
                      </td>

                      {/* Member Since */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-text-tertiary">
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
    </div>
  );
}
