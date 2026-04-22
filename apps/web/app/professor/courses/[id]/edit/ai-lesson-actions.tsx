"use client";

import { useState, useTransition } from "react";
import { Sparkles, Mic, Loader2 } from "lucide-react";
import {
  startVideoTranscription,
  startLessonContentGeneration,
} from "@/lib/actions/ai";
import { AIStatusBadge } from "./ai-status-badge";

interface AILessonActionsProps {
  lessonId: string;
  lessonType: string;
  hasVideo: boolean;
  aiStatus: string | null;
  aiEnabled: boolean;
}

export function AILessonActions({
  lessonId,
  lessonType,
  hasVideo,
  aiStatus,
  aiEnabled,
}: AILessonActionsProps) {
  if (!aiEnabled) return null;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleTranscribe() {
    setError("");
    startTransition(async () => {
      try {
        await startVideoTranscription(lessonId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al iniciar transcripción"
        );
      }
    });
  }

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      try {
        await startLessonContentGeneration(lessonId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al generar contenido"
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {aiStatus && <AIStatusBadge status={aiStatus} />}

      {lessonType === "VIDEO" && hasVideo && !aiStatus && (
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
          title="Transcribir video con AI"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Mic className="h-3 w-3" />
          )}
          Transcribir
        </button>
      )}

      {lessonType !== "VIDEO" && !aiStatus && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
          title="Generar contenido con AI"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generar
        </button>
      )}

      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
