"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Clock,
  HelpCircle,
  MessageSquare,
  CheckSquare,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  createInteractiveStop,
  updateInteractiveStop,
  deleteInteractiveStop,
} from "@/lib/actions/interactive-stops";

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

interface StopData {
  id: string;
  timestampSeconds: number;
  type: InteractiveStopType;
  content: StopContent;
  isRequired: boolean;
}

interface InteractiveStopEditorProps {
  lessonId: string;
  videoDurationSeconds: number | null;
  existingStops: StopData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STOP_TYPES = [
  { value: "QUESTION", label: "Pregunta", icon: HelpCircle, color: "primary" },
  { value: "REFLECTION", label: "Reflexión", icon: MessageSquare, color: "purple" },
  { value: "EXERCISE", label: "Ejercicio", icon: CheckSquare, color: "emerald" },
  { value: "POLL", label: "Encuesta", icon: BarChart3, color: "amber" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const [m = 0, s = 0] = parts.map(Number);
  return m * 60 + s;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveStopEditor({
  lessonId,
  videoDurationSeconds,
  existingStops,
}: InteractiveStopEditorProps) {
  const [stops, setStops] = useState<StopData[]>(existingStops);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [showNewStop, setShowNewStop] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddStop = () => {
    setShowNewStop(true);
  };

  const handleDeleteStop = (stopId: string) => {
    if (!confirm("¿Eliminar esta parada interactiva?")) return;

    startTransition(async () => {
      try {
        await deleteInteractiveStop(stopId);
        setStops((prev) => prev.filter((s) => s.id !== stopId));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar parada");
      }
    });
  };

  if (!videoDurationSeconds) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-secondary p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Paradas Interactivas</h3>
        <button
          type="button"
          onClick={handleAddStop}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar parada
        </button>
      </div>

      {/* Timeline visualization */}
      {videoDurationSeconds > 0 && (
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-text-tertiary">
            <span>0:00</span>
            <span>{formatTime(videoDurationSeconds)}</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-primary-100">
            {stops.map((stop) => {
              const percentage = (stop.timestampSeconds / videoDurationSeconds) * 100;
              const stopType = STOP_TYPES.find((t) => t.value === stop.type);
              return (
                <div
                  key={stop.id}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-primary-600 ring-2 ring-surface transition-transform hover:scale-125"
                  style={{ left: `${percentage}%` }}
                  title={`${formatTime(stop.timestampSeconds)} - ${stopType?.label}`}
                  onClick={() => setEditingStopId(stop.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Stops list */}
      <div className="space-y-2">
        {stops.length === 0 && !showNewStop && (
          <p className="py-4 text-center text-xs text-text-tertiary">
            No hay paradas interactivas. Agrega una para comenzar.
          </p>
        )}

        {stops.map((stop) => (
          <StopItem
            key={stop.id}
            stop={stop}
            isEditing={editingStopId === stop.id}
            onEdit={() => setEditingStopId(stop.id)}
            onCancelEdit={() => setEditingStopId(null)}
            onUpdate={(updatedStop) => {
              setStops((prev) =>
                prev.map((s) => (s.id === updatedStop.id ? updatedStop : s))
              );
              setEditingStopId(null);
            }}
            onDelete={() => handleDeleteStop(stop.id)}
            isPending={isPending}
          />
        ))}

        {showNewStop && (
          <NewStopForm
            lessonId={lessonId}
            videoDurationSeconds={videoDurationSeconds}
            onCancel={() => setShowNewStop(false)}
            onCreated={(newStop) => {
              setStops((prev) => [...prev, newStop].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
              setShowNewStop(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stop Item Component
// ---------------------------------------------------------------------------

function StopItem({
  stop,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isPending,
}: {
  stop: StopData;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (stop: StopData) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const stopType = STOP_TYPES.find((t) => t.value === stop.type);
  const Icon = stopType?.icon ?? HelpCircle;

  if (isEditing) {
    return (
      <StopForm
        initialData={stop}
        onCancel={onCancelEdit}
        onSave={onUpdate}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${stopType?.color}-50`}>
        <Icon className={`h-4 w-4 text-${stopType?.color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{stopType?.label}</span>
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Clock className="h-3 w-3" />
            {formatTime(stop.timestampSeconds)}
          </span>
          {!stop.isRequired && (
            <span className="rounded-pill bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
              Opcional
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-text-secondary">
          {stop.type === "QUESTION" && (stop.content as QuestionContent).question}
          {stop.type === "REFLECTION" && (stop.content as ReflectionContent).prompt}
          {stop.type === "EXERCISE" && (stop.content as ExerciseContent).instructions}
          {stop.type === "POLL" && (stop.content as PollContent).question}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
          title="Editar"
        >
          <Clock className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Eliminar"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stop Form Component (for editing)
// ---------------------------------------------------------------------------

function StopForm({
  initialData,
  onCancel,
  onSave,
}: {
  initialData: StopData;
  onCancel: () => void;
  onSave: (stop: StopData) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateInteractiveStop(initialData.id, {
          timestampSeconds: formData.timestampSeconds,
          type: formData.type,
          content: formData.content,
          isRequired: formData.isRequired,
        });
        onSave(formData);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al actualizar parada");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-primary-200 bg-primary-50/30 p-3">
      <StopContentEditor
        type={formData.type}
        content={formData.content}
        onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => setFormData((prev) => ({ ...prev, isRequired: e.target.checked }))}
              className="h-3.5 w-3.5 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            Obligatoria
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// New Stop Form Component
// ---------------------------------------------------------------------------

function NewStopForm({
  lessonId,
  videoDurationSeconds,
  onCancel,
  onCreated,
}: {
  lessonId: string;
  videoDurationSeconds: number;
  onCancel: () => void;
  onCreated: (stop: StopData) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<InteractiveStopType>("QUESTION");
  const [timestampStr, setTimestampStr] = useState("0:00");
  const [isRequired, setIsRequired] = useState(true);
  const [content, setContent] = useState<StopContent>({
    question: "",
    options: ["", ""],
    correctIndex: 0,
  } as QuestionContent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestampSeconds = parseTime(timestampStr);

    if (timestampSeconds > videoDurationSeconds) {
      alert(`La marca de tiempo no puede exceder la duración del video (${formatTime(videoDurationSeconds)})`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createInteractiveStop(lessonId, {
          timestampSeconds,
          type,
          content,
          isRequired,
        });

        if (result.success) {
          onCreated({
            id: result.stopId,
            timestampSeconds,
            type,
            content,
            isRequired,
          });
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al crear parada");
      }
    });
  };

  // Update content when type changes
  const handleTypeChange = (newType: InteractiveStopType) => {
    setType(newType);
    switch (newType) {
      case "QUESTION":
        setContent({ question: "", options: ["", ""], correctIndex: 0 } as QuestionContent);
        break;
      case "REFLECTION":
        setContent({ prompt: "" } as ReflectionContent);
        break;
      case "EXERCISE":
        setContent({ instructions: "" } as ExerciseContent);
        break;
      case "POLL":
        setContent({ question: "", options: ["", ""] } as PollContent);
        break;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-primary-200 bg-primary-50/30 p-3">
      <div className="space-y-3">
        {/* Timestamp */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Marca de tiempo (MM:SS)
          </label>
          <input
            type="text"
            value={timestampStr}
            onChange={(e) => setTimestampStr(e.target.value)}
            placeholder="0:30"
            pattern="[0-9]+:[0-5][0-9]"
            required
            className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Type selector */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {STOP_TYPES.map((st) => {
              const StIcon = st.icon;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => handleTypeChange(st.value)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === st.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary"
                  }`}
                >
                  <StIcon className="h-3.5 w-3.5" />
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content editor */}
        <StopContentEditor type={type} content={content} onChange={setContent} />

        {/* Required toggle */}
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Parada obligatoria (los estudiantes deben responder)
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Crear parada
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Content Editor Component
// ---------------------------------------------------------------------------

function StopContentEditor({
  type,
  content,
  onChange,
}: {
  type: InteractiveStopType;
  content: StopContent;
  onChange: (content: StopContent) => void;
}) {
  switch (type) {
    case "QUESTION": {
      const questionContent = content as QuestionContent;
      return (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Pregunta</label>
            <input
              type="text"
              value={questionContent.question}
              onChange={(e) =>
                onChange({ ...questionContent, question: e.target.value })
              }
              placeholder="¿Cuál es la respuesta correcta?"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Opciones</label>
            {questionContent.options.map((option, idx) => (
              <div key={idx} className="mb-1.5 flex items-center gap-2">
                <input
                  type="radio"
                  checked={questionContent.correctIndex === idx}
                  onChange={() =>
                    onChange({ ...questionContent, correctIndex: idx })
                  }
                  className="h-3.5 w-3.5 text-primary-600 focus:ring-primary-500"
                  title="Marcar como correcta"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...questionContent.options];
                    newOptions[idx] = e.target.value;
                    onChange({ ...questionContent, options: newOptions });
                  }}
                  placeholder={`Opción ${idx + 1}`}
                  required
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {questionContent.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = questionContent.options.filter((_, i) => i !== idx);
                      const newCorrectIndex =
                        questionContent.correctIndex === idx
                          ? 0
                          : questionContent.correctIndex > idx
                          ? questionContent.correctIndex - 1
                          : questionContent.correctIndex;
                      onChange({ ...questionContent, options: newOptions, correctIndex: newCorrectIndex });
                    }}
                    className="rounded-lg p-1.5 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {questionContent.options.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...questionContent,
                    options: [...questionContent.options, ""],
                  })
                }
                className="mt-1 text-xs text-primary-600 hover:text-primary-700"
              >
                + Agregar opción
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">
              Explicación (opcional)
            </label>
            <textarea
              value={questionContent.explanation ?? ""}
              onChange={(e) =>
                onChange({ ...questionContent, explanation: e.target.value })
              }
              placeholder="Explica por qué esta es la respuesta correcta..."
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }

    case "REFLECTION": {
      const reflectionContent = content as ReflectionContent;
      return (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Pregunta de reflexion
          </label>
          <textarea
            value={reflectionContent.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder="¿Que aprendiste en esta seccion?"
            required
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      );
    }

    case "EXERCISE": {
      const exerciseContent = content as ExerciseContent;
      return (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Instrucciones del ejercicio
          </label>
          <textarea
            value={exerciseContent.instructions}
            onChange={(e) => onChange({ instructions: e.target.value })}
            placeholder="Describe el ejercicio que deben completar..."
            required
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      );
    }

    case "POLL": {
      const pollContent = content as PollContent;
      return (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Pregunta</label>
            <input
              type="text"
              value={pollContent.question}
              onChange={(e) => onChange({ ...pollContent, question: e.target.value })}
              placeholder="¿Que te parecio esta seccion?"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Opciones</label>
            {pollContent.options.map((option, idx) => (
              <div key={idx} className="mb-1.5 flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollContent.options];
                    newOptions[idx] = e.target.value;
                    onChange({ ...pollContent, options: newOptions });
                  }}
                  placeholder={`Opción ${idx + 1}`}
                  required
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {pollContent.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = pollContent.options.filter((_, i) => i !== idx);
                      onChange({ ...pollContent, options: newOptions });
                    }}
                    className="rounded-lg p-1.5 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {pollContent.options.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...pollContent, options: [...pollContent.options, ""] })
                }
                className="mt-1 text-xs text-primary-600 hover:text-primary-700"
              >
                + Agregar opción
              </button>
            )}
          </div>
        </div>
      );
    }
  }
}
