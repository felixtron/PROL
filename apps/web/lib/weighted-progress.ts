import type { ProfessorStudentEnrollment } from "@/lib/queries/students";

/**
 * Avance ponderado por lecciones sobre un conjunto de inscripciones.
 *
 * El promedio simple de porcentajes engaña: un curso de 40 lecciones al 10%
 * pesaba igual que uno de 4 al 100%, y el alumno salía al 55% cuando le
 * faltaban 36 de 44 lecciones. Aquí se suman lecciones, no porcentajes.
 *
 * Cursos con `totalLessons = 0` (contador desfasado o curso sin contenido) se
 * excluyen del denominador en vez de contar como 0%, que hundiría la media.
 */
export function weightedProgress(
  enrollments: Pick<
    ProfessorStudentEnrollment,
    "lessonsCompleted" | "lessonsTotal"
  >[],
): { percent: number; completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const e of enrollments) {
    if (e.lessonsTotal <= 0) continue;
    completed += Math.min(e.lessonsCompleted, e.lessonsTotal);
    total += e.lessonsTotal;
  }
  return {
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
  };
}
