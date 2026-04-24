import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export const getProfessorStudents = cache(async () => {
  const user = await requireUser();

  const [enrollments, pastWorkshops] = await Promise.all([
    db.enrollment.findMany({
      where: { course: { professorId: user.id } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        course: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    // All past (non-cancelled) workshops taught by this professor along with
    // who actually attended each one. Used to compute "workshops asistidos"
    // per student, scoped to the courses in which the student is enrolled.
    db.workshop.findMany({
      where: {
        professorId: user.id,
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
    {
      student: (typeof enrollments)[0]["student"];
      enrollments: {
        courseId: string;
        courseTitle: string;
        progress: number;
        enrolledAt: Date;
      }[];
    }
  >();

  for (const e of enrollments) {
    const existing = studentMap.get(e.student.id);
    const enrollment = {
      courseId: e.course.id,
      courseTitle: e.course.title,
      progress: e.progress,
      enrolledAt: e.enrolledAt,
    };
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
});
