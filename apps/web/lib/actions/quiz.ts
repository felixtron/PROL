"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";

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
  timeLimit?: number;
  maxAttempts: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a quiz for a QUIZ-type lesson
 */
export async function createQuiz(lessonId: string, data: CreateQuizData) {
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

  if (!lesson) throw new Error("Leccion de tipo QUIZ no encontrada");
  if (lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  // Validate data
  if (!data.title || data.title.length < 3) {
    throw new Error("El titulo del quiz es requerido");
  }
  if (!data.questions || data.questions.length === 0) {
    throw new Error("El quiz debe tener al menos una pregunta");
  }
  if (data.passingScore < 0 || data.passingScore > 100) {
    throw new Error("El puntaje minimo debe estar entre 0 y 100");
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
      throw new Error("Indice de respuesta correcta invalido");
    }
  }

  // Check if quiz already exists for this lesson
  const existingQuiz = await db.quiz.findFirst({
    where: { lessonId },
  });

  if (existingQuiz) {
    throw new Error("Ya existe un quiz para esta leccion. Usa updateQuiz para actualizarlo.");
  }

  const quiz = await db.quiz.create({
    data: {
      lessonId,
      title: data.title,
      passingScore: data.passingScore,
      questions: data.questions as unknown as Prisma.InputJsonValue,
      timeLimit: data.timeLimit,
      maxAttempts: data.maxAttempts,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true, quizId: quiz.id };
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(quizId: string, data: Partial<CreateQuizData>) {
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
    throw new Error("El titulo del quiz es requerido");
  }
  if (data.questions !== undefined && data.questions.length === 0) {
    throw new Error("El quiz debe tener al menos una pregunta");
  }
  if (data.passingScore !== undefined && (data.passingScore < 0 || data.passingScore > 100)) {
    throw new Error("El puntaje minimo debe estar entre 0 y 100");
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
        throw new Error("Indice de respuesta correcta invalido");
      }
    }
  }

  await db.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
      ...(data.questions && { questions: data.questions as unknown as Prisma.InputJsonValue }),
      ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
      ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
    },
  });

  revalidatePath(`/professor/courses/${quiz.lesson.module.course.id}/edit`);
  return { success: true };
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string) {
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
  return { success: true };
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
  if (!enrollment) throw new Error("Inscripcion no encontrada");

  // Get quiz data
  const quiz = await db.quiz.findFirst({
    where: { id: quizId },
  });
  if (!quiz) throw new Error("Quiz no encontrado");

  // Get questions array from JSON
  const questions = quiz.questions as unknown as QuizQuestion[];

  // Validate answers length
  if (answers.length !== questions.length) {
    throw new Error("El numero de respuestas no coincide con el numero de preguntas");
  }

  // Check max attempts
  const previousAttempts = await db.quizAttempt.findMany({
    where: { quizId, enrollmentId },
  });

  if (previousAttempts.length >= quiz.maxAttempts) {
    throw new Error(`Has alcanzado el maximo de ${quiz.maxAttempts} intentos`);
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

  // Save attempt
  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      enrollmentId,
      answers,
      score,
      passed,
      completedAt: new Date(),
    },
  });

  // If passed, mark lesson as completed
  if (passed) {
    const lesson = await db.lesson.findFirst({
      where: { quizzes: { some: { id: quizId } } },
    });

    if (lesson) {
      await db.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId,
            lessonId: lesson.id,
          },
        },
        create: {
          enrollmentId,
          lessonId: lesson.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Recalculate enrollment progress
      const completedCount = await db.lessonProgress.count({
        where: { enrollmentId, status: "COMPLETED" },
      });

      const course = await db.course.findFirst({
        where: { id: enrollment.course.id },
        select: { totalLessons: true },
      });

      if (course) {
        const newProgress = course.totalLessons > 0
          ? completedCount / course.totalLessons
          : 0;

        await db.enrollment.update({
          where: { id: enrollmentId },
          data: {
            progress: newProgress,
            ...(newProgress >= 1.0 ? {
              status: "COMPLETED",
              completedAt: new Date(),
            } : {}),
          },
        });
      }
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
  };
}
