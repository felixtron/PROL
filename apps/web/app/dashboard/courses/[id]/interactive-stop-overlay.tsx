"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { submitStopResponse } from "@/lib/actions/interactive-stops";
import { InlineRichText } from "@/components/rich-text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InteractiveStopType = "QUESTION" | "REFLECTION" | "EXERCISE" | "POLL";

interface QuestionContent {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ReflectionContent {
  prompt: string;
}

interface ExerciseContent {
  instructions: string;
}

interface PollContent {
  question: string;
  options: string[];
}

type StopContent = QuestionContent | ReflectionContent | ExerciseContent | PollContent;

interface QuestionResponse {
  selectedIndex: number;
}

interface ReflectionResponse {
  text: string;
}

interface ExerciseResponse {
  completed: true;
}

interface PollResponse {
  selectedIndex: number;
}

type StopResponse = QuestionResponse | ReflectionResponse | ExerciseResponse | PollResponse;

interface StopData {
  id: string;
  timestampSeconds: number;
  type: InteractiveStopType;
  content: StopContent;
  isRequired: boolean;
  response: {
    response: StopResponse;
    isCorrect: boolean | null;
    respondedAt: Date;
  } | null;
}

interface InteractiveStopOverlayProps {
  stops: StopData[];
  // Null means "no real progress row yet" — we still show the stops
  // (preview mode, or in the milliseconds before the first
  // updateLessonProgress upsert resolves) but skip persistence.
  lessonProgressId: string | null;
  videoElement: HTMLIFrameElement | null;
  onStopTriggered?: () => void;
  onStopCompleted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveStopOverlay({
  stops,
  lessonProgressId,
  videoElement,
  onStopTriggered,
  onStopCompleted,
}: InteractiveStopOverlayProps) {
  const [activeStop, setActiveStop] = useState<StopData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [triggeredStops, setTriggeredStops] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor video time (polling approach for iframe)
  useEffect(() => {
    if (!videoElement) return;

    // For Cloudflare Stream iframe, we can't directly access currentTime
    // We'll use a message-based approach or estimate based on play events
    // For now, we'll use a simple interval to track estimated time
    let startTime = Date.now();
    let lastKnownTime = 0;

    intervalRef.current = setInterval(() => {
      // Estimate current time (this is a simplified approach)
      // In production, you might want to use postMessage API with Stream iframe
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedTime = lastKnownTime + elapsed;
      setCurrentTime(estimatedTime);
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [videoElement]);

  // Check for stops at current time
  useEffect(() => {
    if (!stops.length || activeStop) return;

    for (const stop of stops) {
      // Check if we've reached this stop's timestamp (within 1 second tolerance)
      if (
        Math.abs(currentTime - stop.timestampSeconds) < 1 &&
        !triggeredStops.has(stop.id)
      ) {
        // Skip if already answered and not required
        if (stop.response && !stop.isRequired) {
          setTriggeredStops((prev) => new Set(prev).add(stop.id));
          continue;
        }

        // Trigger the stop
        setActiveStop(stop);
        setTriggeredStops((prev) => new Set(prev).add(stop.id));
        onStopTriggered?.();
        break;
      }
    }
  }, [currentTime, stops, activeStop, triggeredStops, onStopTriggered]);

  const handleClose = () => {
    if (activeStop && activeStop.isRequired && !activeStop.response) {
      alert("Esta parada es obligatoria. Debes responder antes de continuar.");
      return;
    }
    setActiveStop(null);
    onStopCompleted?.();
  };

  if (!activeStop) {
    return (
      <div className="pointer-events-none absolute inset-0">
        {/* Stop markers on progress bar */}
        <StopMarkers stops={stops} />
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40 bg-black/70" />

      {/* Modal */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              {activeStop.type === "QUESTION" && "Pregunta"}
              {activeStop.type === "REFLECTION" && "Reflexión"}
              {activeStop.type === "EXERCISE" && "Ejercicio"}
              {activeStop.type === "POLL" && "Encuesta"}
            </h3>
            {(!activeStop.isRequired || activeStop.response) && (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-tertiary"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <StopContent
              stop={activeStop}
              lessonProgressId={lessonProgressId}
              onComplete={handleClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stop Markers Component
// ---------------------------------------------------------------------------

function StopMarkers({ stops }: { stops: StopData[] }) {
  // This would render markers on the video progress bar
  // Since we're using an iframe, we can't modify the Cloudflare Stream player controls
  // This is a placeholder for when you have a custom video player
  return null;
}

// ---------------------------------------------------------------------------
// Stop Content Component
// ---------------------------------------------------------------------------

function StopContent({
  stop,
  lessonProgressId,
  onComplete,
}: {
  stop: StopData;
  lessonProgressId: string | null;
  onComplete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(!!stop.response);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(
    stop.response?.isCorrect ?? null
  );

  switch (stop.type) {
    case "QUESTION":
      return (
        <QuestionContent
          content={stop.content as QuestionContent}
          existingResponse={stop.response?.response as QuestionResponse | undefined}
          lessonProgressId={lessonProgressId}
          stopId={stop.id}
          isRequired={stop.isRequired}
          submitted={submitted}
          isCorrect={isCorrect}
          onSubmit={(selectedIndex, correct) => {
            setSubmitted(true);
            setIsCorrect(correct);
          }}
          onComplete={onComplete}
          isPending={isPending}
          startTransition={startTransition}
        />
      );

    case "REFLECTION":
      return (
        <ReflectionContent
          content={stop.content as ReflectionContent}
          existingResponse={stop.response?.response as ReflectionResponse | undefined}
          lessonProgressId={lessonProgressId}
          stopId={stop.id}
          isRequired={stop.isRequired}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
          onComplete={onComplete}
          isPending={isPending}
          startTransition={startTransition}
        />
      );

    case "EXERCISE":
      return (
        <ExerciseContent
          content={stop.content as ExerciseContent}
          existingResponse={stop.response?.response as ExerciseResponse | undefined}
          lessonProgressId={lessonProgressId}
          stopId={stop.id}
          isRequired={stop.isRequired}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
          onComplete={onComplete}
          isPending={isPending}
          startTransition={startTransition}
        />
      );

    case "POLL":
      return (
        <PollContent
          content={stop.content as PollContent}
          existingResponse={stop.response?.response as PollResponse | undefined}
          lessonProgressId={lessonProgressId}
          stopId={stop.id}
          isRequired={stop.isRequired}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
          onComplete={onComplete}
          isPending={isPending}
          startTransition={startTransition}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Question Content Component
// ---------------------------------------------------------------------------

function QuestionContent({
  content,
  existingResponse,
  lessonProgressId,
  stopId,
  isRequired,
  submitted,
  isCorrect,
  onSubmit,
  onComplete,
  isPending,
  startTransition,
}: {
  content: QuestionContent;
  existingResponse?: QuestionResponse;
  lessonProgressId: string | null;
  stopId: string;
  isRequired: boolean;
  submitted: boolean;
  isCorrect: boolean | null;
  onSubmit: (selectedIndex: number, isCorrect: boolean) => void;
  onComplete: () => void;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    existingResponse?.selectedIndex ?? null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex === null) return;

    // Without a real lessonProgressId we can still let the user see if
    // they got it right by comparing against content.correctIndex
    // locally, but skip the server round-trip entirely.
    if (!lessonProgressId) {
      const correct = selectedIndex === content.correctIndex;
      onSubmit(selectedIndex, correct);
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitStopResponse(stopId, lessonProgressId, {
          selectedIndex,
        });
        onSubmit(selectedIndex, result.isCorrect ?? false);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al enviar respuesta");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium text-text-primary">
        <InlineRichText text={content.question} />
      </p>

      <div className="space-y-2">
        {content.options.map((option, idx) => (
          <label
            key={idx}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              submitted
                ? idx === content.correctIndex
                  ? "border-emerald-500 bg-emerald-50"
                  : idx === selectedIndex && !isCorrect
                  ? "border-red-500 bg-red-50"
                  : "border-border bg-surface-secondary"
                : selectedIndex === idx
                ? "border-primary-500 bg-primary-50"
                : "border-border bg-surface-secondary hover:bg-surface-tertiary"
            }`}
          >
            <input
              type="radio"
              name="answer"
              value={idx}
              checked={selectedIndex === idx}
              onChange={() => !submitted && setSelectedIndex(idx)}
              disabled={submitted}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="flex-1 text-sm text-text-primary">{option}</span>
            {submitted && idx === content.correctIndex && (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            )}
            {submitted && idx === selectedIndex && idx !== content.correctIndex && (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </label>
        ))}
      </div>

      {submitted && content.explanation && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary-800">Explicación</p>
              <p className="mt-1 text-xs text-primary-700">
                <InlineRichText text={content.explanation} />
              </p>
            </div>
          </div>
        </div>
      )}

      {submitted && isCorrect !== null && (
        <div
          className={`rounded-lg border p-3 ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <p
              className={`text-sm font-medium ${
                isCorrect ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {isCorrect ? "¡Correcto!" : "Incorrecto"}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!submitted ? (
          <button
            type="submit"
            disabled={selectedIndex === null || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar respuesta
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Continuar
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Reflection Content Component
// ---------------------------------------------------------------------------

function ReflectionContent({
  content,
  existingResponse,
  lessonProgressId,
  stopId,
  isRequired,
  submitted,
  onSubmit,
  onComplete,
  isPending,
  startTransition,
}: {
  content: ReflectionContent;
  existingResponse?: ReflectionResponse;
  lessonProgressId: string | null;
  stopId: string;
  isRequired: boolean;
  submitted: boolean;
  onSubmit: () => void;
  onComplete: () => void;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [text, setText] = useState(existingResponse?.text ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (!lessonProgressId) {
      onSubmit();
      return;
    }

    startTransition(async () => {
      try {
        await submitStopResponse(stopId, lessonProgressId, { text });
        onSubmit();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al enviar respuesta");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium text-text-primary">
        <InlineRichText text={content.prompt} />
      </p>

      <textarea
        value={text}
        onChange={(e) => !submitted && setText(e.target.value)}
        disabled={submitted}
        placeholder="Escribe tu reflexión aquí..."
        rows={5}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-surface-secondary disabled:text-text-secondary"
      />

      <div className="flex justify-end gap-2">
        {!submitted ? (
          <button
            type="submit"
            disabled={!text.trim() || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar reflexión
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Continuar
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Exercise Content Component
// ---------------------------------------------------------------------------

function ExerciseContent({
  content,
  existingResponse,
  lessonProgressId,
  stopId,
  isRequired,
  submitted,
  onSubmit,
  onComplete,
  isPending,
  startTransition,
}: {
  content: ExerciseContent;
  existingResponse?: ExerciseResponse;
  lessonProgressId: string | null;
  stopId: string;
  isRequired: boolean;
  submitted: boolean;
  onSubmit: () => void;
  onComplete: () => void;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const handleComplete = () => {
    if (!lessonProgressId) {
      onSubmit();
      onComplete();
      return;
    }
    startTransition(async () => {
      try {
        await submitStopResponse(stopId, lessonProgressId, { completed: true });
        onSubmit();
        onComplete();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al marcar como completado");
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap text-sm text-text-primary">
        <InlineRichText text={content.instructions} />
      </p>

      {submitted ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">Ejercicio completado</p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        {!submitted ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Marcar como completado
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poll Content Component
// ---------------------------------------------------------------------------

function PollContent({
  content,
  existingResponse,
  lessonProgressId,
  stopId,
  isRequired,
  submitted,
  onSubmit,
  onComplete,
  isPending,
  startTransition,
}: {
  content: PollContent;
  existingResponse?: PollResponse;
  lessonProgressId: string | null;
  stopId: string;
  isRequired: boolean;
  submitted: boolean;
  onSubmit: () => void;
  onComplete: () => void;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    existingResponse?.selectedIndex ?? null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex === null) return;

    if (!lessonProgressId) {
      onSubmit();
      return;
    }

    startTransition(async () => {
      try {
        await submitStopResponse(stopId, lessonProgressId, { selectedIndex });
        onSubmit();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al enviar respuesta");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium text-text-primary">
        <InlineRichText text={content.question} />
      </p>

      <div className="space-y-2">
        {content.options.map((option, idx) => (
          <label
            key={idx}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              selectedIndex === idx
                ? "border-primary-500 bg-primary-50"
                : "border-border bg-surface-secondary hover:bg-surface-tertiary"
            }`}
          >
            <input
              type="radio"
              name="poll"
              value={idx}
              checked={selectedIndex === idx}
              onChange={() => !submitted && setSelectedIndex(idx)}
              disabled={submitted}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="flex-1 text-sm text-text-primary">{option}</span>
          </label>
        ))}
      </div>

      {submitted && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary-600" />
            <p className="text-sm font-medium text-primary-800">
              Gracias por tu respuesta
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!submitted ? (
          <button
            type="submit"
            disabled={selectedIndex === null || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar respuesta
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Continuar
          </button>
        )}
      </div>
    </form>
  );
}
