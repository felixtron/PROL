"use client";

import { useState, useEffect, useTransition } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { submitQuizAttempt } from "@/lib/actions/quiz";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizQuestion {
  question: string;
  options: string[];
  explanation?: string;
}

interface QuizAttempt {
  id: string;
  answers: number[];
  score: number;
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
}

interface QuizData {
  id: string;
  lessonId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  timeLimit: number | null;
  maxAttempts: number;
  attempts: QuizAttempt[];
  attemptsRemaining: number;
}

interface QuizPlayerProps {
  quiz: QuizData;
  enrollmentId: string;
  onQuizPassed?: () => void;
}

interface QuizResult {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  explanation?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizPlayer({ quiz, enrollmentId, onQuizPassed }: QuizPlayerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.timeLimit
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Timer effect
  useEffect(() => {
    if (!isStarted || !timeRemaining || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, timeRemaining, isSubmitted]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleStart() {
    setIsStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setTimeRemaining(quiz.timeLimit);
    setIsSubmitted(false);
    setResults(null);
    setScore(null);
    setPassed(null);
    setAttemptId(null);
  }

  function handleSelectAnswer(optionIndex: number) {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  }

  function handleNext() {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function handlePrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  function handleAutoSubmit() {
    if (isSubmitted) return;
    handleSubmit();
  }

  function handleSubmit() {
    // Check all questions are answered
    const unanswered = answers.some((a) => a === null);
    if (unanswered) {
      if (!confirm("Algunas preguntas no tienen respuesta. ¿Deseas enviar de todas formas?")) {
        return;
      }
    }

    setIsSubmitted(true);

    startTransition(async () => {
      try {
        // Convert null answers to -1 (unanswered)
        const submittedAnswers = answers.map((a) => a ?? -1);

        const result = await submitQuizAttempt(quiz.id, enrollmentId, submittedAnswers);

        setScore(result.score);
        setPassed(result.passed);
        setAttemptId(result.attemptId);

        // Load detailed results with explanations
        if (result.attemptId) {
          const res = await fetch(
            `/api/quiz/${quiz.lessonId}/answers?quizId=${quiz.id}&attemptId=${result.attemptId}`
          );
          if (res.ok) {
            const detailedResults = await res.json();
            setResults(detailedResults.results);
          }
        }

        // Notify parent if passed
        if (result.passed && onQuizPassed) {
          onQuizPassed();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al enviar quiz");
        setIsSubmitted(false);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  // Show previous attempts and start button
  if (!isStarted) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">
          {quiz.title}
        </h2>

        {/* Quiz info */}
        <div className="mb-6 space-y-2 rounded-lg bg-surface-secondary p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Puntaje minimo para aprobar:</span>
            <span className="font-semibold text-text-primary">{quiz.passingScore}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Numero de preguntas:</span>
            <span className="font-semibold text-text-primary">{quiz.questions.length}</span>
          </div>
          {quiz.timeLimit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Tiempo limite:</span>
              <span className="font-semibold text-text-primary">
                {Math.floor(quiz.timeLimit / 60)} minutos
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Intentos restantes:</span>
            <span className="font-semibold text-text-primary">
              {quiz.attemptsRemaining} de {quiz.maxAttempts}
            </span>
          </div>
        </div>

        {/* Previous attempts */}
        {quiz.attempts.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">
              Intentos Anteriores
            </h3>
            <div className="space-y-2">
              {quiz.attempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className={`rounded-lg border p-3 ${
                    attempt.passed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {attempt.passed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-text-primary">
                        Intento {quiz.attempts.length - index}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${
                          attempt.passed ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {attempt.score}%
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(attempt.startedAt).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start or max attempts reached */}
        {quiz.attemptsRemaining > 0 ? (
          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            {quiz.attempts.length > 0 ? "Intentar de Nuevo" : "Comenzar Quiz"}
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Intentos agotados</p>
                <p className="mt-1 text-sm text-amber-700">
                  Has alcanzado el maximo de {quiz.maxAttempts} intentos.
                  {quiz.attempts.some((a) => a.passed) && (
                    <span className="ml-1">Has aprobado este quiz.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show results after submission
  if (isSubmitted && results && score !== null && passed !== null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        {/* Results header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700">
            {passed ? (
              <Trophy className="h-8 w-8 text-white" />
            ) : (
              <RotateCcw className="h-8 w-8 text-white" />
            )}
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold text-text-primary">
            {passed ? "¡Felicidades!" : "Sigue intentando"}
          </h2>
          <p className="text-sm text-text-secondary">
            {passed
              ? "Has aprobado el quiz exitosamente"
              : "No alcanzaste el puntaje minimo"}
          </p>
        </div>

        {/* Score */}
        <div className="mb-6 rounded-lg bg-surface-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Tu puntaje:</span>
            <span className={`text-2xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
              {score}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={`h-full transition-all ${passed ? "bg-emerald-500" : "bg-red-500"}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-text-tertiary">
            Puntaje minimo: {quiz.passingScore}%
          </div>
        </div>

        {/* Question results */}
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Resultados por Pregunta</h3>
          {results.map((result, index) => (
            <div key={index} className="rounded-lg border border-border bg-surface-secondary p-4">
              <div className="mb-3 flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-text-primary">
                  {result.question}
                </p>
                {result.isCorrect ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
              </div>

              <div className="space-y-2">
                {result.options.map((option, optIndex) => {
                  const isSelected = optIndex === result.selectedIndex;
                  const isCorrect = optIndex === result.correctIndex;

                  return (
                    <div
                      key={optIndex}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-900"
                            : "border-border bg-surface text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCorrect && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                        <span>{option}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {result.explanation && (
                <div className="mt-3 rounded-lg bg-primary-50 p-3">
                  <p className="text-xs font-medium text-primary-900">Explicacion:</p>
                  <p className="mt-1 text-xs text-primary-700">{result.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        {quiz.attemptsRemaining > 0 && !passed && (
          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <div className="flex items-center justify-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Intentar de Nuevo ({quiz.attemptsRemaining} intentos restantes)
            </div>
          </button>
        )}
      </div>
    );
  }

  // Quiz in progress
  const currentQuestion = quiz.questions[currentQuestionIndex]!;
  const selectedAnswer = answers[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-text-primary">
            {quiz.title}
          </h2>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-1.5">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className={`text-sm font-semibold ${timeRemaining < 60 ? "text-red-600" : "text-text-primary"}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>
            Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
          </span>
          <span>
            {answeredCount} respondidas
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="mb-4 text-base font-medium text-text-primary">
          {currentQuestion.question}
        </p>

        <div className="space-y-3">
          {currentQuestion.options.map((option, optIndex) => {
            const isSelected = selectedAnswer === optIndex;

            return (
              <button
                key={optIndex}
                type="button"
                onClick={() => handleSelectAnswer(optIndex)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 text-primary-900"
                    : "border-border bg-surface text-text-primary hover:border-primary-200 hover:bg-primary-50/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-primary-600 bg-primary-600"
                        : "border-border bg-surface"
                    }`}
                  >
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Quiz"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
