import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { canEditCourse } from "@/lib/course-access";
import { FINAL_EXAM_GATE_MIN_SCORE } from "@/lib/queries/quiz";
import { summarizeStudentQuizzes } from "@/lib/quiz-gate";

/** Resultado de un alumno en un quiz concreto. */
export interface QuizResultCell {
  /** Mejor puntaje de todos sus intentos, o null si no lo ha presentado. */
  bestScore: number | null;
  attempts: number;
  attemptsLeft: number;
  /**
   * Aprobado según el `passingScore` del quiz: es lo que marca la lección
   * como completada.
   */
  passed: boolean;
  /**
   * Alcanza el umbral fijo del gate (80). Puede ser false con `passed` en
   * true cuando el quiz tiene `passingScore` por debajo de 80: el alumno ve
   * la lección completa pero el examen final sigue cerrado.
   */
  meetsGate: boolean;
  lastAttemptAt: Date | null;
}

export interface QuizSummary {
  id: string;
  title: string;
  lessonTitle: string;
  passingScore: number;
  maxAttempts: number;
  isFinalExam: boolean;
  /** Cuántos alumnos lo han presentado al menos una vez. */
  taken: number;
  /** Cuántos lo aprobaron según su `passingScore`. */
  passed: number;
  /** Promedio del mejor intento entre quienes lo presentaron. */
  averageBest: number | null;
  /**
   * Alumnos que aprobaron el quiz pero no llegan al 80 del gate. Solo aplica
   * a los intermedios y es la cifra que explica un examen final cerrado.
   */
  passedButBelowGate: number;
}

export interface StudentQuizRow {
  enrollmentId: string;
  student: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    company: { id: string; name: string } | null;
  };
  /** Resultado por quiz, indexado por `quizId`. */
  results: Record<string, QuizResultCell>;
  /** Intermedios que ya alcanzan el 80 del gate. */
  gatePassed: number;
  /** Intermedios que todavía no. */
  gatePending: number;
  /** ¿Puede presentar el examen final? Sin examen final, siempre false. */
  canTakeFinal: boolean;
  /** Aprobó el examen final con ≥80 (el umbral que emite certificado). */
  finalPassed: boolean;
}

export interface CourseQuizResults {
  course: { id: string; title: string };
  quizzes: QuizSummary[];
  intermediateCount: number;
  hasFinalExam: boolean;
  gateMinScore: number;
  students: StudentQuizRow[];
}

/**
 * Resultados de todos los quizzes de un curso, por alumno.
 *
 * Distingue dos umbrales a propósito: `passingScore` (configurable por quiz,
 * marca la lección como completada) y el gate fijo de 80 que abre el examen
 * final. Colapsarlos en un solo "aprobado" escondería justo el caso que el
 * profesor necesita ver — el alumno que aprobó todo y sigue sin poder
 * presentar el examen.
 */
export const getCourseQuizResults = cache(
  async (courseId: string): Promise<CourseQuizResults> => {
    const user = await requireUser();
    if (!(await canEditCourse(courseId, user.id))) {
      throw new Error("No autorizado");
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) throw new Error("Curso no encontrado");

    const [quizzes, enrollments, attempts] = await Promise.all([
      db.quiz.findMany({
        where: { lesson: { module: { courseId } } },
        orderBy: [
          { lesson: { module: { position: "asc" } } },
          { lesson: { position: "asc" } },
        ],
        select: {
          id: true,
          title: true,
          passingScore: true,
          maxAttempts: true,
          isFinalExam: true,
          lesson: { select: { title: true } },
        },
      }),
      db.enrollment.findMany({
        where: { courseId },
        select: {
          id: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.quizAttempt.findMany({
        where: { quiz: { lesson: { module: { courseId } } } },
        select: {
          quizId: true,
          enrollmentId: true,
          score: true,
          passed: true,
          completedAt: true,
          startedAt: true,
        },
      }),
    ]);

    // Intentos agrupados por (inscripción, quiz).
    const byPair = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const key = `${a.enrollmentId}::${a.quizId}`;
      const list = byPair.get(key) ?? [];
      list.push(a);
      byPair.set(key, list);
    }

    const quizMeta = new Map(quizzes.map((q) => [q.id, q]));
    const intermediates = quizzes.filter((q) => !q.isFinalExam);
    const finalExam = quizzes.find((q) => q.isFinalExam) ?? null;

    const students: StudentQuizRow[] = enrollments.map((e) => {
      const attemptsByQuiz: Record<
        string,
        { score: number; passed: boolean; at: Date | null }[]
      > = {};
      for (const q of quizzes) {
        attemptsByQuiz[q.id] = (byPair.get(`${e.id}::${q.id}`) ?? []).map(
          (a) => ({
            score: a.score,
            passed: a.passed,
            at: a.completedAt ?? a.startedAt,
          }),
        );
      }

      const summary = summarizeStudentQuizzes(
        quizzes,
        attemptsByQuiz,
        FINAL_EXAM_GATE_MIN_SCORE,
      );

      return {
        enrollmentId: e.id,
        student: e.student,
        results: summary.results,
        gatePassed: summary.gatePassed,
        gatePending: summary.gatePending,
        canTakeFinal: summary.canTakeFinal,
        finalPassed: summary.finalPassed,
      };
    });

    const summaries: QuizSummary[] = quizzes.map((q) => {
      // `filter(Boolean)` no estrecha el tipo; el predicado explícito sí.
      const cells = students
        .map((s) => s.results[q.id])
        .filter((c): c is QuizResultCell => c !== undefined);
      const taken = cells.filter((c) => c.bestScore !== null);
      const meta = quizMeta.get(q.id)!;
      return {
        id: q.id,
        title: q.title,
        lessonTitle: q.lesson.title,
        passingScore: meta.passingScore,
        maxAttempts: meta.maxAttempts,
        isFinalExam: q.isFinalExam,
        taken: taken.length,
        passed: cells.filter((c) => c.passed).length,
        averageBest: taken.length
          ? Math.round(
              taken.reduce((sum, c) => sum + (c.bestScore ?? 0), 0) /
                taken.length,
            )
          : null,
        passedButBelowGate: q.isFinalExam
          ? 0
          : cells.filter((c) => c.passed && !c.meetsGate).length,
      };
    });

    return {
      course,
      quizzes: summaries,
      intermediateCount: intermediates.length,
      hasFinalExam: finalExam !== null,
      gateMinScore: FINAL_EXAM_GATE_MIN_SCORE,
      students,
    };
  },
);
