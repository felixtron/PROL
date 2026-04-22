"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
  Loader2,
  CheckCircle,
  Pencil,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  deleteLesson,
  publishCourse,
} from "@/lib/actions/module";
import { updateCourse } from "@/lib/actions/course";
import { VideoUpload } from "./video-upload";
import { AILessonActions } from "./ai-lesson-actions";
import { ThumbnailUpload } from "./thumbnail-upload";
import { QuizBuilder } from "./quiz-builder";
import { InteractiveStopEditor } from "./interactive-stop-editor";
import { LessonBlocksEditor } from "./lesson-blocks-editor";
import type { LessonBlock } from "@prol/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LessonData = {
  id: string;
  title: string;
  type: string;
  position: number;
  videoDurationSeconds: number | null;
  videoUrl: string | null;
  videoProvider: "CLOUDFLARE" | "VIMEO_URL" | "VIMEO_UPLOAD" | null;
  videoRawUrl: string | null;
  content?: unknown;
  aiStatus: string | null;
  interactiveStops: Array<{
    id: string;
    timestampSeconds: number;
    type: "QUESTION" | "REFLECTION" | "EXERCISE" | "POLL";
    content: any;
    isRequired: boolean;
  }>;
};

type ModuleData = {
  id: string;
  title: string;
  position: number;
  lessons: LessonData[];
};

type CourseData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  priceInCents: number;
  currency: string;
  status: string;
  category: string | null;
  modules: ModuleData[];
  quizzes?: { id: string; title: string }[];
  _count: { enrollments: number };
  aiEnabled?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Desarrollo Personal",
  "Marketing Digital",
  "Diseno",
  "Programacion",
  "Negocios",
  "Idiomas",
  "Otro",
];

const LESSON_TYPES = [
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "TEXT", label: "Texto", icon: FileText },
  { value: "QUIZ", label: "Quiz", icon: HelpCircle },
  { value: "ASSIGNMENT", label: "Tarea", icon: ClipboardList },
] as const;

const lessonTypeIcons: Record<string, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
};

const statusStyles: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-surface-tertiary text-text-secondary",
  ARCHIVED: "bg-amber-50 text-amber-700",
  REVIEW: "bg-blue-50 text-blue-700",
};

const statusLabels: Record<string, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
  REVIEW: "En Revision",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseEditor({ course }: { course: CourseData }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Column — Content */}
      <div className="lg:col-span-2">
        <ModulesSection
          courseId={course.id}
          modules={course.modules}
          aiEnabled={course.aiEnabled ?? false}
          availableQuizzes={course.quizzes ?? []}
        />
      </div>

      {/* Right Column — Settings */}
      <div className="space-y-6">
        <CourseSettingsCard course={course} />
        <CourseStatsCard course={course} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modules & Lessons Section
// ---------------------------------------------------------------------------

function ModulesSection({
  courseId,
  modules,
  aiEnabled,
  availableQuizzes,
}: {
  courseId: string;
  modules: ModuleData[];
  aiEnabled: boolean;
  availableQuizzes: { id: string; title: string }[];
}) {
  const [showNewModule, setShowNewModule] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreateModule(formData: FormData) {
    startTransition(async () => {
      try {
        await createModule(courseId, formData);
        setShowNewModule(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al crear modulo");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Contenido del Curso
        </h2>
        <button
          type="button"
          onClick={() => setShowNewModule(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <Plus className="h-4 w-4" />
          Agregar Modulo
        </button>
      </div>

      {modules.length === 0 && !showNewModule && (
        <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
          <GripVertical className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">
            Aun no tienes modulos. Agrega el primer modulo para comenzar.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {modules.map((mod, idx) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            index={idx}
            aiEnabled={aiEnabled}
            availableQuizzes={availableQuizzes}
          />
        ))}
      </div>

      {/* New Module Inline Form */}
      {showNewModule && (
        <form action={handleCreateModule} className="mt-4">
          <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-4">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Titulo del Modulo
            </label>
            <input
              name="title"
              required
              minLength={2}
              autoFocus
              placeholder="Ej: Introduccion"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModule(false)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Crear Modulo
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module Card
// ---------------------------------------------------------------------------

function ModuleCard({
  module: mod,
  index,
  aiEnabled,
  availableQuizzes,
}: {
  module: ModuleData;
  index: number;
  aiEnabled: boolean;
  availableQuizzes: { id: string; title: string }[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();

  function handleUpdateTitle(formData: FormData) {
    startUpdateTransition(async () => {
      try {
        await updateModule(mod.id, formData);
        setIsEditing(false);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Error al actualizar modulo"
        );
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar el modulo "${mod.title}" y todas sus lecciones? Esta accion no se puede deshacer.`
      )
    )
      return;

    startDeleteTransition(async () => {
      try {
        await deleteModule(mod.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar modulo");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface-secondary">
      {/* Module Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-text-tertiary hover:text-text-secondary"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <GripVertical className="h-4 w-4 shrink-0 text-text-tertiary" />

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-xs font-semibold text-primary-700">
          {index + 1}
        </span>

        {isEditing ? (
          <form action={handleUpdateTitle} className="flex flex-1 items-center gap-2">
            <input
              name="title"
              defaultValue={mod.title}
              required
              minLength={2}
              autoFocus
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-sm font-semibold text-text-primary">
              {mod.title}
            </span>
            <span className="shrink-0 text-xs text-text-tertiary">
              {mod.lessons.length}{" "}
              {mod.lessons.length === 1 ? "leccion" : "lecciones"}
            </span>
          </>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface hover:text-text-secondary"
              title="Editar titulo"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar modulo"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Lessons */}
      {isExpanded && (
        <div className="border-t border-border">
          {mod.lessons.length === 0 && !showNewLesson && (
            <p className="px-4 py-4 text-center text-xs text-text-tertiary">
              Sin lecciones aun.
            </p>
          )}

          {mod.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              aiEnabled={aiEnabled}
              availableQuizzes={availableQuizzes}
            />
          ))}

          {/* Add Lesson Form */}
          {showNewLesson ? (
            <NewLessonForm
              moduleId={mod.id}
              onClose={() => setShowNewLesson(false)}
            />
          ) : (
            <div className="px-4 py-2.5">
              <button
                type="button"
                onClick={() => setShowNewLesson(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Leccion
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson Row
// ---------------------------------------------------------------------------

function LessonRow({
  lesson,
  aiEnabled,
  availableQuizzes,
}: {
  lesson: LessonData;
  aiEnabled: boolean;
  availableQuizzes: { id: string; title: string }[];
}) {
  const [isDeleting, startTransition] = useTransition();
  const [showVideo, setShowVideo] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const Icon = lessonTypeIcons[lesson.type] ?? Video;

  function handleDelete() {
    if (!confirm(`¿Eliminar la leccion "${lesson.title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteLesson(lesson.id);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Error al eliminar leccion"
        );
      }
    });
  }

  async function handleToggleQuiz() {
    if (!showQuiz) {
      setIsLoadingQuiz(true);
      try {
        const res = await fetch(`/api/quiz/professor/${lesson.id}`);
        if (res.ok) {
          const quiz = await res.json();
          setQuizData(quiz);
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
      } finally {
        setIsLoadingQuiz(false);
      }
    }
    setShowQuiz(!showQuiz);
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface/60">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-tertiary">
          <Icon className="h-3.5 w-3.5 text-text-secondary" />
        </div>
        <span className="flex-1 truncate text-sm text-text-primary">
          {lesson.title}
        </span>
        {lesson.videoDurationSeconds != null && lesson.videoDurationSeconds > 0 && (
          <span className="shrink-0 text-xs text-text-tertiary">
            {formatDuration(lesson.videoDurationSeconds)}
          </span>
        )}
        {lesson.type === "VIDEO" && (
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100 transition-colors"
            title={lesson.videoUrl ? "Ver video" : "Subir video"}
          >
            {lesson.videoUrl ? "Video" : "Subir video"}
          </button>
        )}
        {lesson.type === "QUIZ" && (
          <button
            type="button"
            onClick={handleToggleQuiz}
            disabled={isLoadingQuiz}
            className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50"
            title="Configurar quiz"
          >
            {isLoadingQuiz ? "Cargando..." : showQuiz ? "Ocultar Quiz" : "Configurar Quiz"}
          </button>
        )}
        <AILessonActions
          lessonId={lesson.id}
          lessonType={lesson.type}
          hasVideo={!!lesson.videoUrl}
          aiStatus={lesson.aiStatus}
          aiEnabled={aiEnabled}
        />
        <span className="shrink-0 rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-tertiary">
          {lesson.type}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Eliminar leccion"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Video upload section for VIDEO lessons */}
      {lesson.type === "VIDEO" && showVideo && (
        <div className="px-4 pb-3">
          <VideoUpload
            lessonId={lesson.id}
            currentVideoUrl={lesson.videoUrl}
            currentProvider={lesson.videoProvider}
            currentRawUrl={lesson.videoRawUrl}
          />
          {/* Interactive stops editor */}
          <InteractiveStopEditor
            lessonId={lesson.id}
            videoDurationSeconds={lesson.videoDurationSeconds}
            existingStops={lesson.interactiveStops}
          />
        </div>
      )}

      {/* Quiz builder section for QUIZ lessons */}
      {lesson.type === "QUIZ" && showQuiz && (
        <div className="px-4 pb-3">
          <QuizBuilder lessonId={lesson.id} existingQuiz={quizData} />
        </div>
      )}

      {/* Multi-format blocks editor for MULTI lessons */}
      {lesson.type === "MULTI" && showVideo && (
        <div className="px-4 pb-3">
          <LessonBlocksEditor
            lessonId={lesson.id}
            initialBlocks={
              ((lesson.content as { blocks?: LessonBlock[] } | null)?.blocks) ?? []
            }
            availableQuizzes={availableQuizzes}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Lesson Form
// ---------------------------------------------------------------------------

function NewLessonForm({
  moduleId,
  onClose,
}: {
  moduleId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createLesson(moduleId, formData);
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al crear leccion");
      }
    });
  }

  return (
    <form action={handleSubmit} className="border-t border-border px-4 py-3">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Titulo de la Leccion
          </label>
          <input
            name="title"
            required
            minLength={3}
            autoFocus
            placeholder="Ej: Bienvenida al curso"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Tipo
          </label>
          <div className="flex gap-2">
            {LESSON_TYPES.map((lt) => {
              const LtIcon = lt.icon;
              return (
                <label
                  key={lt.value}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 has-[:checked]:text-primary-700"
                >
                  <input
                    type="radio"
                    name="type"
                    value={lt.value}
                    defaultChecked={lt.value === "VIDEO"}
                    className="sr-only"
                  />
                  <LtIcon className="h-3.5 w-3.5" />
                  {lt.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Agregar
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Course Settings Card
// ---------------------------------------------------------------------------

function CourseSettingsCard({ course }: { course: CourseData }) {
  const [isPending, startTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleUpdate(formData: FormData) {
    setError("");
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateCourse(course.id, formData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al actualizar curso"
        );
      }
    });
  }

  function handlePublish() {
    if (
      !confirm(
        "¿Publicar este curso? Los estudiantes podran verlo e inscribirse."
      )
    )
      return;

    startPublishTransition(async () => {
      try {
        await publishCourse(course.id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al publicar curso"
        );
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        Configuracion del Curso
      </h2>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Curso actualizado</p>
        </div>
      )}

      <form action={handleUpdate} className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="edit-title"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Titulo
          </label>
          <input
            id="edit-title"
            name="title"
            defaultValue={course.title}
            required
            minLength={3}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="edit-description"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Descripcion
          </label>
          <textarea
            id="edit-description"
            name="description"
            rows={3}
            defaultValue={course.description ?? ""}
            placeholder="Describe tu curso..."
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Imagen de Portada
          </label>
          <ThumbnailUpload
            courseId={course.id}
            currentThumbnail={course.thumbnail}
          />
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="edit-price"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Precio (MXN)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
              $
            </span>
            <input
              id="edit-price"
              name="priceInCents"
              type="hidden"
              value={course.priceInCents}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              defaultValue={(course.priceInCents / 100).toFixed(2)}
              onChange={(e) => {
                const hidden = document.getElementById(
                  "edit-price"
                ) as HTMLInputElement | null;
                if (hidden) {
                  hidden.value = String(
                    Math.round(parseFloat(e.target.value || "0") * 100)
                  );
                }
              }}
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-8 pr-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="edit-category"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Categoria
          </label>
          <select
            id="edit-category"
            name="category"
            defaultValue={course.category ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Sin categoria</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </form>

      {/* Publish */}
      {course.status === "DRAFT" && (
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPublishing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Publicando...
              </span>
            ) : (
              "Publicar Curso"
            )}
          </button>
          <p className="mt-2 text-center text-xs text-text-tertiary">
            Una vez publicado, los alumnos podran ver e inscribirse al curso.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Course Stats Card
// ---------------------------------------------------------------------------

function CourseStatsCard({ course }: { course: CourseData }) {
  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        Resumen
      </h2>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-sm text-text-secondary">
            <Users className="h-4 w-4" />
            Alumnos inscritos
          </dt>
          <dd className="text-sm font-semibold text-text-primary">
            {course._count.enrollments}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-text-secondary">Modulos</dt>
          <dd className="text-sm font-semibold text-text-primary">
            {course.modules.length}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-text-secondary">Lecciones</dt>
          <dd className="text-sm font-semibold text-text-primary">
            {totalLessons}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-text-secondary">Precio</dt>
          <dd className="text-sm font-semibold text-text-primary">
            {course.priceInCents === 0
              ? "Gratis"
              : formatCurrency(course.priceInCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-text-secondary">Estado</dt>
          <dd>
            <span
              className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${statusStyles[course.status] ?? statusStyles.DRAFT}`}
            >
              {statusLabels[course.status] ?? course.status}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
