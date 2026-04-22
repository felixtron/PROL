import { cache } from "react";
import { db } from "@prol/db";
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

interface QuizQuestionForStudent {
  question: string;
  options: string[];
  explanation?: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get quiz data for a lesson (professor view - includes correct answers)
 */
export const getQuizForLesson = cache(async (lessonId: string) => {
  const user = await requireUser();

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: { professorId: true },
          },
        },
      },
      quizzes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!lesson) throw new Error("Lección no encontrada");
  if (lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  const quiz = lesson.quizzes[0] ?? null;

  if (!quiz) return null;

  return {
    id: quiz.id,
    lessonId: quiz.lessonId,
    title: quiz.title,
    passingScore: quiz.passingScore,
    questions: quiz.questions as unknown as QuizQuestion[],
    timeLimit: quiz.timeLimit,
    maxAttempts: quiz.maxAttempts,
    isFinalExam: quiz.isFinalExam,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
});

/**
 * Get quiz for student (WITHOUT correct answers), plus their previous attempts
 */
export const getQuizForStudent = cache(
  async (lessonId: string, enrollmentId: string) => {
    const user = await requireUser();

    // Verify enrollment belongs to user
    const enrollment = await db.enrollment.findFirst({
      where: { id: enrollmentId, studentId: user.id },
    });
    if (!enrollment) throw new Error("Inscripción no encontrada");

    // Get quiz
    const quiz = await db.quiz.findFirst({
      where: { lessonId },
      include: {
        attempts: {
          where: { enrollmentId },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!quiz) return null;

    // Remove correct answers from questions for student view
    const questions = quiz.questions as unknown as QuizQuestion[];
    const questionsForStudent: QuizQuestionForStudent[] = questions.map((q) => ({
      question: q.question,
      options: q.options,
      explanation: q.explanation,
    }));

    // Format attempts
    const attempts = quiz.attempts.map((attempt) => ({
      id: attempt.id,
      answers: attempt.answers as unknown as number[],
      score: attempt.score,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
    }));

    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      passingScore: quiz.passingScore,
      questions: questionsForStudent,
      timeLimit: quiz.timeLimit,
      maxAttempts: quiz.maxAttempts,
      attempts,
      attemptsRemaining: Math.max(0, quiz.maxAttempts - attempts.length),
    };
  }
);

/**
 * Get all quiz attempts for grading/review
 */
export const getQuizAttempts = cache(
  async (quizId: string, enrollmentId: string) => {
    const user = await requireUser();

    // Get quiz with lesson and course info
    const quiz = await db.quiz.findFirst({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: { professorId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) throw new Error("Quiz no encontrado");

    // Check authorization - either professor or enrolled student
    const enrollment = await db.enrollment.findFirst({
      where: { id: enrollmentId },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });

    if (!enrollment) throw new Error("Inscripción no encontrada");

    const isProfessor = quiz.lesson.module.course.professorId === user.id;
    const isStudent = enrollment.studentId === user.id;

    if (!isProfessor && !isStudent) {
      throw new Error("No autorizado");
    }

    // Get attempts
    const attempts = await db.quizAttempt.findMany({
      where: { quizId, enrollmentId },
      orderBy: { startedAt: "desc" },
    });

    // Get questions with correct answers (only for professor or after attempt)
    const questions = quiz.questions as unknown as QuizQuestion[];

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
      },
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
      },
      attempts: attempts.map((attempt) => {
        const answers = attempt.answers as unknown as number[];

        // Calculate details for each answer
        const answerDetails = questions.map((q, index) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          selectedIndex: answers[index],
          isCorrect: answers[index] === q.correctIndex,
          explanation: q.explanation,
        }));

        return {
          id: attempt.id,
          answers,
          answerDetails,
          score: attempt.score,
          passed: attempt.passed,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        };
      }),
      attemptsRemaining: Math.max(0, quiz.maxAttempts - attempts.length),
    };
  }
);

/**
 * Get quiz with correct answers for review after attempt
 */
export const getQuizWithAnswers = cache(
  async (quizId: string, attemptId: string) => {
    const user = await requireUser();

    // Get attempt and verify it belongs to user
    const attempt = await db.quizAttempt.findFirst({
      where: { id: attemptId },
      include: {
        enrollment: {
          select: { studentId: true },
        },
        quiz: {
          include: {
            lesson: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error("Intento no encontrado");
    if (attempt.enrollment.studentId !== user.id) {
      throw new Error("No autorizado");
    }
    if (attempt.quizId !== quizId) {
      throw new Error("El intento no pertenece a este quiz");
    }

    const quiz = attempt.quiz;
    const questions = quiz.questions as unknown as QuizQuestion[];
    const answers = attempt.answers as unknown as number[];

    // Build detailed results
    const results = questions.map((q, index) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: answers[index],
      isCorrect: answers[index] === q.correctIndex,
      explanation: q.explanation,
    }));

    return {
      quiz: {
        id: quiz.id,
        lessonId: quiz.lessonId,
        title: quiz.title,
        passingScore: quiz.passingScore,
      },
      attempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      },
      results,
      correctCount: results.filter((r) => r.isCorrect).length,
      totalQuestions: questions.length,
    };
  }
);
