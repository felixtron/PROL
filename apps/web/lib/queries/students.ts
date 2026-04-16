import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export const getProfessorStudents = cache(async () => {
  const user = await requireUser();

  const enrollments = await db.enrollment.findMany({
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
  });

  // Group by student
  const studentMap = new Map<
    string,
    {
      student: (typeof enrollments)[0]["student"];
      enrollments: {
        courseTitle: string;
        progress: number;
        enrolledAt: Date;
      }[];
    }
  >();

  for (const e of enrollments) {
    const existing = studentMap.get(e.student.id);
    const enrollment = {
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

  return Array.from(studentMap.values());
});
