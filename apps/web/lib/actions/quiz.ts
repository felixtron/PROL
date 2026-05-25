"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { issueCertificateForEnrollment } from "@/lib/certificate-issuer";
import { createNotification } from "@/lib/notifications";
import { getFinalExamGateStatus } from "@/lib/queries/quiz";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface CreateQuizData {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  // null o ausente ⇒ sin límite de tiempo. Cualquier valor ≤ 0 también se
  // normaliza a null para que "0 minutos" no se guarde por accidente.
  timeLimit?: number | null;
  maxAttempts: number;
  isFinalExam?: boolean;
}

/** Sin límite ↔ null. Acepta undefined, null, 0 y negativos como "sin límite". */
function normalizeTimeLimit(v: number | null | undefined): number | null {
  if (v === undefined || v === null) return null;
  return v > 0 ? v : null;
}

const FINAL_EXAM_MIN_PASSING_SCORE = 80;

type QuizActionResult =
  | { success: true; quizId?: string }
  | { success: false; error: string };

function toActionError(err: unknown): QuizActionResult {
  return {
    success: false,
    error: err instanceof Error ? err.message : "Error inesperado",
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a quiz for a QUIZ-type lesson
 */
export async function createQuiz(
  lessonId: string,
  data: CreateQuizData,
): Promise<QuizActionResult> {
  try {
    return await createQuizUnsafe(lessonId, data);
  } catch (err) {
    return toActionError(err);
  }
}

async function createQuizUnsafe(lessonId: string, data: CreateQuizData) {
  const user = await requireUser();

  // Verify lesson exists and user is the professor
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, type: "QUIZ" },
    include: {
      module: {
        include: {
          course: {
            select: { id: true, professorId: true },
          },
        },
      },
    },
  });

  if (!lesson) throw new Error("Lección de tipo QUIZ no encontrada");
  if (lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  // Validate data
  if (!data.title || data.title.length < 3) {
    throw new Error("El título del quiz es requerido");
  }
  if (!data.questions || data.questions.length === 0) {
    throw new Error("El quiz debe tener al menos una pregunta");
  }
  if (data.passingScore < 0 || data.passingScore > 100) {
    throw new Error("El puntaje mínimo debe estar entre 0 y 100");
  }
  if (data.maxAttempts < 1) {
    throw new Error("Debe permitir al menos un intento");
  }

  // Validate questions
  for (const q of data.questions) {
    if (!q.question || q.question.trim().length === 0) {
      throw new Error("Todas las preguntas deben tener texto");
    }
    if (!q.options || q.options.length < 2) {
      throw new Error("Cada pregunta debe tener al menos 2 opciones");
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new Error("Índice de respuesta correcta inválido");
    }
  }

  // Check if quiz already exists for this lesson
  const existingQuiz = await db.quiz.findFirst({
    where: { lessonId },
  });

  if (existingQuiz) {
    throw new Error("Ya existe un quiz para esta lección. Usa updateQuiz para actualizarlo.");
  }

  // Final exam rules
  if (data.isFinalExam) {
    if (data.passingScore < FINAL_EXAM_MIN_PASSING_SCORE) {
      throw new Error(
        `El examen final debe requerir al menos ${FINAL_EXAM_MIN_PASSING_SCORE}% para aprobar`
      );
    }
    // Only one final exam per course
    const existingFinal = await db.quiz.findFirst({
      where: {
        isFinalExam: true,
        lesson: { module: { courseId: lesson.module.course.id } },
      },
      select: { id: true },
    });
    if (existingFinal) {
      throw new Error("Este curso ya tiene un examen final. Solo se permite uno.");
    }
  }

  const quiz = await db.quiz.create({
    data: {
      lessonId,
      title: data.title,
      passingScore: data.passingScore,
      questions: data.questions as unknown as Prisma.InputJsonValue,
      timeLimit: normalizeTimeLimit(data.timeLimit),
      maxAttempts: data.maxAttempts,
      isFinalExam: data.isFinalExam ?? false,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true as const, quizId: quiz.id };
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(
  quizId: string,
  data: Partial<CreateQuizData>,
): Promise<QuizActionResult> {
  try {
    return await updateQuizUnsafe(quizId, data);
  } catch (err) {
    return toActionError(err);
  }
}

async function updateQuizUnsafe(quizId: string, data: Partial<CreateQuizData>) {
  const user = await requireUser();

  const quiz = await db.quiz.findFirst({
    where: { id: quizId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { id: true, professorId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!quiz) throw new Error("Quiz no encontrado");
  if (quiz.lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  // Validate data if provided
  if (data.title !== undefined && data.title.length < 3) {
    throw new Error("El título del quiz es requerido");
  }
  if (data.questions !== undefined && data.questions.length === 0) {
    throw new Error("El quiz debe tener al menos una pregunta");
  }
  if (data.passingScore !== undefined && (data.passingScore < 0 || data.passingScore > 100)) {
    throw new Error("El puntaje mínimo debe estar entre 0 y 100");
  }
  if (data.maxAttempts !== undefined && data.maxAttempts < 1) {
    throw new Error("Debe permitir al menos un intento");
  }

  // Validate questions if provided
  if (data.questions) {
    for (const q of data.questions) {
      if (!q.question || q.question.trim().length === 0) {
        throw new Error("Todas las preguntas deben tener texto");
      }
      if (!q.options || q.options.length < 2) {
        throw new Error("Cada pregunta debe tener al menos 2 opciones");
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error("Índice de respuesta correcta inválido");
      }
    }
  }

  // Final exam rules
  if (data.isFinalExam === true) {
    const targetScore = data.passingScore ?? quiz.passingScore;
    if (targetScore < FINAL_EXAM_MIN_PASSING_SCORE) {
      throw new Error(
        `El examen final debe requerir al menos ${FINAL_EXAM_MIN_PASSING_SCORE}% para aprobar`
      );
    }
    const existingFinal = await db.quiz.findFirst({
      where: {
        isFinalExam: true,
        id: { not: quizId },
        lesson: { module: { courseId: quiz.lesson.module.course.id } },
      },
      select: { id: true },
    });
    if (existingFinal) {
      throw new Error("Este curso ya tiene un examen final");
    }
  }

  await db.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
      ...(data.questions && { questions: data.questions as unknown as Prisma.InputJsonValue }),
      // `timeLimit: null` debe BORRAR el límite. Por eso aceptamos null
      // explícito y sólo skipeamos cuando viene undefined (no enviado).
      ...(data.timeLimit !== undefined && {
        timeLimit: normalizeTimeLimit(data.timeLimit),
      }),
      ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
      ...(data.isFinalExam !== undefined && { isFinalExam: data.isFinalExam }),
    },
  });

  revalidatePath(`/professor/courses/${quiz.lesson.module.course.id}/edit`);
  return { success: true as const };
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<QuizActionResult> {
  try {
    return await deleteQuizUnsafe(quizId);
  } catch (err) {
    return toActionError(err);
  }
}

async function deleteQuizUnsafe(quizId: string) {
  const user = await requireUser();

  const quiz = await db.quiz.findFirst({
    where: { id: quizId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { id: true, professorId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!quiz) throw new Error("Quiz no encontrado");
  if (quiz.lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  await db.quiz.delete({ where: { id: quizId } });

  revalidatePath(`/professor/courses/${quiz.lesson.module.course.id}/edit`);
  return { success: true as const };
}

/**
 * Submit a quiz attempt
 */
export async function submitQuizAttempt(
  quizId: string,
  enrollmentId: string,
  answers: number[]
) {
  const user = await requireUser();

  // Verify enrollment belongs to user
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, studentId: user.id },
    include: {
      course: {
        select: { id: true },
      },
    },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  // Get quiz data
  const quiz = await db.quiz.findFirst({
    where: { id: quizId },
  });
  if (!quiz) throw new Error("Quiz no encontrado");

  // Get questions array from JSON
  const questions = quiz.questions as unknown as QuizQuestion[];

  // Validate answers length
  if (answers.length !== questions.length) {
    throw new Error("El número de respuestas no coincide con el número de preguntas");
  }

  // Check max attempts
  const previousAttempts = await db.quizAttempt.findMany({
    where: { quizId, enrollmentId },
  });

  if (previousAttempts.length >= quiz.maxAttempts) {
    throw new Error(`Has alcanzado el máximo de ${quiz.maxAttempts} intentos`);
  }

  // Gate del examen final: si este es el examen final del curso, exigir
  // que el alumno haya aprobado (≥80%) todos los quizzes intermedios
  // antes de aceptar el intento. Defensa en profundidad: el UI también
  // bloquea, pero esto evita un POST directo bypassando el cliente.
  if (quiz.isFinalExam) {
    const gate = await getFinalExamGateStatus(
      enrollmentId,
      enrollment.course.id,
    );
    if (!gate.canTake) {
      const titles = gate.pending.map((p) => `"${p.title}"`).join(", ");
      throw new Error(
        `Debes aprobar con al menos ${gate.minScore}% cada quiz de los módulos antes de presentar el examen final. Falta(n): ${titles}`,
      );
    }
  }

  // Calculate score
  let correctCount = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i]!.correctIndex) {
      correctCount++;
    }
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.passingScore;

  // Atomically: persist the attempt, mark the lesson as completed (if
  // passed), and update enrollment progress. Certificate issuance lives
  // OUTSIDE the transaction because issueCertificateForEnrollment opens
  // its own $transaction (Prisma does not support nesting). The certificate
  // helper is idempotent, so a transient failure here doesn't lose the
  // attempt — the student's next visit will see they passed.
  const lessonForQuiz = passed
    ? await db.lesson.findFirst({
        where: { quizzes: { some: { id: quizId } } },
        select: { id: true },
      })
    : null;
  const courseForEnrollment = passed
    ? await db.course.findFirst({
        where: { id: enrollment.course.id },
        select: { totalLessons: true },
      })
    : null;
  // Whether the final-exam side-effects (mark COMPLETED + cert) apply.
  const isFinalAndPassed = passed && quiz.isFinalExam && score >= 80;

  const attempt = await db.$transaction(async (tx) => {
    // Serialize concurrent writes to this enrollment (final-exam tx +
    // any other lesson-progress update). Same reasoning as
    // `updateLessonProgress` in lib/actions/enrollment.ts — without
    // the lock, the count of completed lessons further below can be
    // stale and Enrollment.progress can lose updates.
    await tx.$queryRaw`SELECT 1 FROM enrollments WHERE id = ${enrollmentId} FOR UPDATE`;

    const created = await tx.quizAttempt.create({
      data: {
        quizId,
        enrollmentId,
        answers,
        score,
        passed,
        completedAt: new Date(),
      },
    });

    if (passed && lessonForQuiz) {
      await tx.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId,
            lessonId: lessonForQuiz.id,
          },
        },
        create: {
          enrollmentId,
          lessonId: lessonForQuiz.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (courseForEnrollment) {
        const completedCount = await tx.lessonProgress.count({
          where: { enrollmentId, status: "COMPLETED" },
        });
        const newProgress =
          courseForEnrollment.totalLessons > 0
            ? completedCount / courseForEnrollment.totalLessons
            : 0;
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            progress: newProgress,
            ...(newProgress >= 1.0 || isFinalAndPassed
              ? { status: "COMPLETED", completedAt: new Date() }
              : {}),
          },
        });
      }
    }

    return created;
  });

  // Side-effects after the consistent state is committed.
  if (isFinalAndPassed) {
    try {
      const result = await issueCertificateForEnrollment(enrollmentId, {
        finalExamScore: score,
      });
      if (result.folio) {
        await createNotification({
          userId: user.id,
          tenantId: enrollment.tenantId,
          type: "CERTIFICATE",
          title: "Certificado emitido",
          message: `Aprobaste el examen final con ${score}%. Tu certificado está listo.`,
          link: `/verify/${result.folio}`,
        });
      }
    } catch (err) {
      console.error("Error emitiendo certificado tras examen final:", err);
    }
  }

  revalidatePath(`/dashboard/courses/${enrollment.course.id}`);
  return {
    success: true,
    attemptId: attempt.id,
    score,
    passed,
    correctCount,
    totalQuestions: questions.length,
    isFinalExam: quiz.isFinalExam,
  };
}
