import type { QuizResultCell } from "@/lib/queries/quiz-results";

export interface GateQuiz {
  id: string;
  maxAttempts: number;
  isFinalExam: boolean;
}

export interface GateAttempt {
  score: number;
  /**
   * Aprobado tal como se registró al enviarlo. Se usa el valor almacenado y
   * no se recalcula contra `passingScore`: si el profesor sube el mínimo
   * después, el alumno ya tiene la lección completada y decirle "reprobado"
   * contradiría lo que ve en su curso.
   */
  passed: boolean;
  at: Date | null;
}

export interface StudentQuizSummary {
  results: Record<string, QuizResultCell>;
  gatePassed: number;
  gatePending: number;
  canTakeFinal: boolean;
  finalPassed: boolean;
}

/**
 * Resume los intentos de un alumno en los quizzes de un curso.
 *
 * Mantiene separados los dos umbrales del producto: `passed` viene del
 * `passingScore` del quiz (marca la lección completa) y `meetsGate` del
 * mínimo fijo que abre el examen final. Un alumno puede tener el primero y
 * no el segundo, y ese es justo el caso que el profesor necesita ver.
 */
export function summarizeStudentQuizzes(
  quizzes: GateQuiz[],
  attemptsByQuiz: Record<string, GateAttempt[]>,
  gateMinScore: number,
): StudentQuizSummary {
  const results: Record<string, QuizResultCell> = {};

  for (const q of quizzes) {
    const list = attemptsByQuiz[q.id] ?? [];
    const bestScore = list.length
      ? Math.max(...list.map((a) => a.score))
      : null;
    const lastAttemptAt = list.reduce<Date | null>(
      (acc, a) => (a.at !== null && (acc === null || a.at > acc) ? a.at : acc),
      null,
    );
    results[q.id] = {
      bestScore,
      attempts: list.length,
      attemptsLeft: Math.max(0, q.maxAttempts - list.length),
      passed: list.some((a) => a.passed),
      meetsGate: bestScore !== null && bestScore >= gateMinScore,
      lastAttemptAt,
    };
  }

  const intermediates = quizzes.filter((q) => !q.isFinalExam);
  const finalExam = quizzes.find((q) => q.isFinalExam) ?? null;
  const gatePassed = intermediates.filter(
    (q) => results[q.id]?.meetsGate,
  ).length;

  return {
    results,
    gatePassed,
    gatePending: intermediates.length - gatePassed,
    canTakeFinal: finalExam !== null && gatePassed === intermediates.length,
    finalPassed: finalExam
      ? (results[finalExam.id]?.meetsGate ?? false)
      : false,
  };
}
