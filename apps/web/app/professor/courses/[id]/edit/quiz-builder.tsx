"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  CheckCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { createQuiz, updateQuiz, deleteQuiz } from "@/lib/actions/quiz";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface QuizData {
  id: string;
  lessonId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  timeLimit: number | null;
  maxAttempts: number;
  isFinalExam: boolean;
}

interface QuizBuilderProps {
  lessonId: string;
  existingQuiz?: QuizData | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizBuilder({ lessonId, existingQuiz }: QuizBuilderProps) {
  const isEditing = !!existingQuiz;

  const [title, setTitle] = useState(existingQuiz?.title ?? "");
  const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore ?? 70);
  const [timeLimit, setTimeLimit] = useState<number | null>(
    existingQuiz?.timeLimit ? Math.floor(existingQuiz.timeLimit / 60) : null
  );
  const [maxAttempts, setMaxAttempts] = useState(existingQuiz?.maxAttempts ?? 3);
  const [isFinalExam, setIsFinalExam] = useState(existingQuiz?.isFinalExam ?? false);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    existingQuiz?.questions ?? []
  );

  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // Question management
  // ---------------------------------------------------------------------------

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: keyof QuizQuestion, value: unknown) {
    const updated = [...questions];
    updated[index] = { ...updated[index]!, [field]: value } as QuizQuestion;
    setQuestions(updated);
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    const updated = [...questions];
    const options = [...updated[qIndex]!.options];
    options[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex]!, options } as QuizQuestion;
    setQuestions(updated);
  }

  function addOption(qIndex: number) {
    const updated = [...questions];
    const options = [...updated[qIndex]!.options, ""];
    updated[qIndex] = { ...updated[qIndex]!, options } as QuizQuestion;
    setQuestions(updated);
  }

  function removeOption(qIndex: number, optIndex: number) {
    const updated = [...questions];
    const options = updated[qIndex]!.options.filter((_, i) => i !== optIndex);
    // Adjust correctIndex if necessary
    let correctIndex = updated[qIndex]!.correctIndex;
    if (correctIndex >= options.length) {
      correctIndex = Math.max(0, options.length - 1);
    }
    updated[qIndex] = { ...updated[qIndex]!, options, correctIndex } as QuizQuestion;
    setQuestions(updated);
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleSave() {
    setError("");
    setSuccess(false);

    // Validate
    if (!title || title.trim().length < 3) {
      setError("El titulo del quiz debe tener al menos 3 caracteres");
      return;
    }

    if (questions.length === 0) {
      setError("Debes agregar al menos una pregunta");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      if (!q.question || q.question.trim().length === 0) {
        setError(`La pregunta ${i + 1} no puede estar vacia`);
        return;
      }
      if (q.options.length < 2) {
        setError(`La pregunta ${i + 1} debe tener al menos 2 opciones`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || q.options[j]!.trim().length === 0) {
          setError(`La opcion ${j + 1} de la pregunta ${i + 1} no puede estar vacia`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const data = {
          title,
          passingScore,
          questions,
          timeLimit: timeLimit ? timeLimit * 60 : undefined,
          maxAttempts,
          isFinalExam,
        };

        if (isEditing && existingQuiz) {
          await updateQuiz(existingQuiz.id, data);
        } else {
          await createQuiz(lessonId, data);
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar quiz");
      }
    });
  }

  function handleDelete() {
    if (!existingQuiz) return;

    if (!confirm("¿Eliminar este quiz? Los intentos de los estudiantes tambien se eliminaran.")) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        await deleteQuiz(existingQuiz.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar quiz");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary-600" />
          <h3 className="font-heading text-base font-semibold text-text-primary">
            {isEditing ? "Editar Quiz" : "Configurar Quiz"}
          </h3>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Eliminar Quiz
          </button>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Quiz guardado exitosamente</p>
        </div>
      )}

      {/* Quiz settings */}
      <div className="mb-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Titulo del Quiz
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Evaluacion Modulo 1"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Puntaje Minimo (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Tiempo Limite (min)
            </label>
            <input
              type="number"
              min="1"
              value={timeLimit ?? ""}
              onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Sin limite"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Intentos Maximos
            </label>
            <input
              type="number"
              min="1"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Final exam toggle */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface-secondary p-3">
          <input
            type="checkbox"
            id="isFinalExam"
            checked={isFinalExam}
            onChange={(e) => {
              setIsFinalExam(e.target.checked);
              if (e.target.checked && passingScore < 80) {
                setPassingScore(80);
              }
            }}
            className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isFinalExam" className="text-sm">
            <span className="font-medium text-text-primary">
              Marcar como examen final del curso
            </span>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Al aprobar este quiz con &ge; 80%, el alumno completa el curso y
              recibe automaticamente su certificado con QR. Solo puede haber un
              examen final por curso.
            </p>
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Preguntas</h4>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            Agregar Pregunta
          </button>
        </div>

        {questions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
            <p className="text-sm text-text-tertiary">
              No hay preguntas aun. Haz clic en "Agregar Pregunta" para comenzar.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <QuestionCard
              key={qIndex}
              question={q}
              index={qIndex}
              onUpdate={updateQuestion}
              onUpdateOption={updateOption}
              onAddOption={addOption}
              onRemoveOption={removeOption}
              onRemove={removeQuestion}
            />
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? "Guardar Cambios" : "Crear Quiz"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question Card Component
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  onUpdate,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onRemove,
}: {
  question: QuizQuestion;
  index: number;
  onUpdate: (index: number, field: keyof QuizQuestion, value: unknown) => void;
  onUpdateOption: (qIndex: number, optIndex: number, value: string) => void;
  onAddOption: (qIndex: number) => void;
  onRemoveOption: (qIndex: number, optIndex: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-start gap-3">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 text-text-tertiary" />
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
          {index + 1}
        </div>
        <div className="flex-1 space-y-3">
          {/* Question text */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">
              Pregunta
            </label>
            <textarea
              value={question.question}
              onChange={(e) => onUpdate(index, "question", e.target.value)}
              rows={2}
              placeholder="Escribe la pregunta..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Options */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium text-text-primary">
                Opciones (selecciona la correcta)
              </label>
              <button
                type="button"
                onClick={() => onAddOption(index)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-3 w-3" />
                Opcion
              </button>
            </div>
            <div className="space-y-2">
              {question.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`question-${index}-correct`}
                    checked={question.correctIndex === optIndex}
                    onChange={() => onUpdate(index, "correctIndex", optIndex)}
                    className="h-4 w-4 shrink-0 text-primary-600 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => onUpdateOption(index, optIndex, e.target.value)}
                    placeholder={`Opcion ${optIndex + 1}`}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(index, optIndex)}
                      className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Eliminar opcion"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation (optional) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">
              Explicacion (opcional)
            </label>
            <textarea
              value={question.explanation ?? ""}
              onChange={(e) => onUpdate(index, "explanation", e.target.value)}
              rows={2}
              placeholder="Explica por que esta es la respuesta correcta..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-2 rounded-lg p-1 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600"
          title="Eliminar pregunta"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
