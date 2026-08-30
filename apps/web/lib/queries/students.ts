import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { courseAccessWhere } from "@/lib/course-access";

export interface ProfessorStudentEnrollment {
  courseId: string;
  courseTitle: string;
  /** Lecciones completadas de este curso. */
  lessonsCompleted: number;
  /**
   * Lecciones del curso. Sale de `course.totalLessons`, el contador
   * denormalizado que usa el resto de la app, para que el profesor vea el
   * mismo número que el alumno.
   */
  lessonsTotal: number;
  /** Avance 0..100 de este curso. */
  progress: number;
  enrolledAt: Date;
}

export interface ProfessorStudentRow {
  student: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    createdAt: Date;
    company: { id: string; name: string } | null;
  };
  enrollments: ProfessorStudentEnrollment[];
  workshops: { attended: number; total: number };
}

export const getProfessorStudents = cache(
  async (): Promise<ProfessorStudentRow[]> => {
    const user = await requireUser();

    const [enrollments, pastWorkshops] = await Promise.all([
      db.enrollment.findMany({
        where: { course: courseAccessWhere(user.id) },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              createdAt: true,
              // Los alumnos B2C no tienen empresa: quedan agrupados aparte.
              company: { select: { id: true, name: true } },
            },
          },
          course: { select: { id: true, title: true, totalLessons: true } },
          // Conteo agregado en la BD: traer las filas de progreso para contarlas
          // en memoria escalaba con alumnos x lecciones.
          _count: {
            select: { lessonProgresses: { where: { status: "COMPLETED" } } },
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      // All past (non-cancelled) workshops taught by this professor along with
      // who actually attended each one. Used to compute "workshops asistidos"
      // per student, scoped to the courses in which the student is enrolled.
      db.workshop.findMany({
        where: {
          // Talleres de los cursos a los que el profesor tiene acceso, no solo
          // los que imparte: si no, un curso compartido mostraria 0 de 0.
          course: courseAccessWhere(user.id),
          startTime: { lt: new Date() },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          courseId: true,
          attendances: { select: { studentId: true } },
        },
      }),
    ]);

    // Index workshops by courseId and attendance by (studentId, workshopId)
    // for O(1) lookups in the grouping loop below.
    const workshopsByCourse = new Map<string, string[]>();
    const attendedBy = new Map<string, Set<string>>(); // studentId -> workshopIds
    for (const w of pastWorkshops) {
      const arr = workshopsByCourse.get(w.courseId) ?? [];
      arr.push(w.id);
      workshopsByCourse.set(w.courseId, arr);
      for (const a of w.attendances) {
        const set = attendedBy.get(a.studentId) ?? new Set();
        set.add(w.id);
        attendedBy.set(a.studentId, set);
      }
    }

    // Group enrollments by student.
    const studentMap = new Map<
      string,
      Omit<ProfessorStudentRow, "workshops">
    >();

    for (const e of enrollments) {
      const lessonsTotal = e.course.totalLessons;
      const lessonsCompleted = Math.min(
        e._count.lessonProgresses,
        Math.max(lessonsTotal, 0),
      );
      const enrollment: ProfessorStudentEnrollment = {
        courseId: e.course.id,
        courseTitle: e.course.title,
        lessonsCompleted,
        lessonsTotal,
        // `enrollment.progress` está en escala 0..1.
        progress: Math.round(e.progress * 100),
        enrolledAt: e.enrolledAt,
      };
      const existing = studentMap.get(e.student.id);
      if (existing) {
        existing.enrollments.push(enrollment);
      } else {
        studentMap.set(e.student.id, {
          student: e.student,
          enrollments: [enrollment],
        });
      }
    }

    // Attach workshop attendance counts per student. Eligible workshops are
    // those of this professor whose course the student is enrolled in.
    return Array.from(studentMap.values()).map((row) => {
      const attendedSet = attendedBy.get(row.student.id) ?? new Set<string>();
      let attended = 0;
      let total = 0;
      const seen = new Set<string>();
      for (const enr of row.enrollments) {
        for (const wId of workshopsByCourse.get(enr.courseId) ?? []) {
          if (seen.has(wId)) continue;
          seen.add(wId);
          total += 1;
          if (attendedSet.has(wId)) attended += 1;
        }
      }
      return { ...row, workshops: { attended, total } };
    });
  },
);
