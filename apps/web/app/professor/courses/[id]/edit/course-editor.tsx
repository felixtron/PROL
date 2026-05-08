"use client";

import { useRef, useState, useTransition } from "react";
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
  ChevronUp,
  Users,
  Download,
  Image as ImageIcon,
  Check,
  X,
  Bold,
  Italic,
  Underline,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  List,
  ListOrdered,
} from "lucide-react";
import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  deleteLesson,
  moveLesson,
  publishCourse,
  updateLesson,
} from "@/lib/actions/module";
import { updateCourse } from "@/lib/actions/course";
import { VideoUpload } from "./video-upload";
import { AILessonActions } from "./ai-lesson-actions";
import { ThumbnailUpload } from "./thumbnail-upload";
import { QuizBuilder } from "./quiz-builder";
import { InteractiveStopEditor } from "./interactive-stop-editor";
import { LessonBlocksEditor } from "./lesson-blocks-editor";
import { AssignmentEditor } from "./assignment-editor";
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
  videoProvider: "CLOUDFLARE" | "VIMEO_URL" | "VIMEO_UPLOAD" | "YOUTUBE" | null;
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
  "Diseño",
  "Programación",
  "Negocios",
  "Idiomas",
  "Otro",
];

const LESSON_TYPES = [
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "TEXT", label: "Texto", icon: FileText },
  { value: "QUIZ", label: "Quiz", icon: HelpCircle },
  { value: "ASSIGNMENT", label: "Tarea", icon: ClipboardList },
  { value: "DOWNLOAD", label: "Descargable", icon: Download },
] as const;

const lessonTypeIcons: Record<string, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
  DOWNLOAD: Download,
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
  REVIEW: "En Revisión",
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
        alert(err instanceof Error ? err.message : "Error al crear módulo");
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
          Agregar Módulo
        </button>
      </div>

      {modules.length === 0 && !showNewModule && (
        <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
          <GripVertical className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">
            Aún no tienes módulos. Agrega el primer módulo para comenzar.
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
              Título del Módulo
            </label>
            <input
              name="title"
              required
              minLength={2}
              autoFocus
              placeholder="Ej: Introducción"
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
                Crear Módulo
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
          err instanceof Error ? err.message : "Error al actualizar módulo"
        );
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar el módulo "${mod.title}" y todas sus lecciones? Esta acción no se puede deshacer.`
      )
    )
      return;

    startDeleteTransition(async () => {
      try {
        await deleteModule(mod.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar módulo");
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
              {mod.lessons.length === 1 ? "lección" : "lecciones"}
            </span>
          </>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface hover:text-text-secondary"
              title="Editar título"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar módulo"
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
              Sin lecciones aún.
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
                Agregar Lección
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
  const [showText, setShowText] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(lesson.title);
  const [titleError, setTitleError] = useState("");
  const Icon = lessonTypeIcons[lesson.type] ?? Video;

  function handleSaveTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed.length < 3) {
      setTitleError("Mínimo 3 caracteres");
      return;
    }
    if (trimmed === lesson.title) {
      setEditingTitle(false);
      return;
    }
    setTitleError("");
    startTransition(async () => {
      try {
        await updateLesson(lesson.id, { title: trimmed });
        setEditingTitle(false);
      } catch (err) {
        setTitleError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      try {
        await moveLesson(lesson.id, direction);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al mover lección");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteLesson(lesson.id);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Error al eliminar lección"
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
        {/* Reorder controls (up/down) */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => handleMove("up")}
            disabled={isDeleting}
            title="Mover arriba"
            className="rounded p-0.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-50"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => handleMove("down")}
            disabled={isDeleting}
            title="Mover abajo"
            className="rounded p-0.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-50"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-tertiary">
          <Icon className="h-3.5 w-3.5 text-text-secondary" />
        </div>
        {editingTitle ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              type="text"
              value={titleDraft}
              autoFocus
              onChange={(e) => {
                setTitleDraft(e.target.value);
                setTitleError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setTitleDraft(lesson.title);
                  setTitleError("");
                  setEditingTitle(false);
                }
              }}
              className="flex-1 rounded-md border border-primary-300 bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={isDeleting}
              className="rounded-md bg-primary-600 p-1 text-white hover:bg-primary-700 disabled:opacity-50"
              title="Guardar título"
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitleDraft(lesson.title);
                setTitleError("");
                setEditingTitle(false);
              }}
              className="rounded-md p-1 text-text-secondary hover:bg-surface-tertiary"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
            {titleError && (
              <span className="text-[10px] text-red-700">{titleError}</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            title="Editar título"
            className="group flex flex-1 items-center gap-1.5 truncate text-left text-sm text-text-primary hover:text-primary-700"
          >
            <span className="truncate">{lesson.title}</span>
            <Pencil className="h-3 w-3 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100" />
          </button>
        )}
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
        {lesson.type === "TEXT" && (
          <button
            type="button"
            onClick={() => setShowText(!showText)}
            className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100 transition-colors"
            title="Editar contenido de la lección"
          >
            {showText ? "Ocultar texto" : "Editar texto"}
          </button>
        )}
        {lesson.type === "DOWNLOAD" && (
          <button
            type="button"
            onClick={() => setShowDownload(!showDownload)}
            className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100 transition-colors"
            title="Subir/cambiar archivo descargable"
          >
            {showDownload ? "Ocultar archivo" : "Editar archivo"}
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
          title="Eliminar lección"
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

      {/* Text editor for TEXT lessons */}
      {lesson.type === "TEXT" && showText && (
        <div className="px-4 pb-3">
          <TextLessonEditor
            lessonId={lesson.id}
            initialContent={
              typeof lesson.content === "string"
                ? lesson.content
                : lesson.content &&
                    typeof (lesson.content as { content?: unknown }).content ===
                      "string"
                  ? ((lesson.content as { content: string }).content)
                  : ""
            }
          />
        </div>
      )}

      {/* Download editor for DOWNLOAD lessons */}
      {lesson.type === "DOWNLOAD" && showDownload && (
        <div className="px-4 pb-3">
          <DownloadLessonEditor
            lessonId={lesson.id}
            initialContent={
              lesson.content as {
                fileUrl?: string;
                fileName?: string;
                fileSize?: number;
                description?: string;
              } | null
            }
          />
        </div>
      )}

      {/* Assignment editor for ASSIGNMENT lessons */}
      {lesson.type === "ASSIGNMENT" && showVideo && (
        <div className="px-4 pb-3">
          <AssignmentEditor
            lessonId={lesson.id}
            initialContent={
              lesson.content as {
                instructions: string;
                fileUrl?: string | null;
                fileName?: string | null;
                fileSize?: number | null;
                dueAt?: string | null;
              } | null
            }
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
        alert(err instanceof Error ? err.message : "Error al crear lección");
      }
    });
  }

  return (
    <form action={handleSubmit} className="border-t border-border px-4 py-3">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">
            Título de la Lección
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
        "¿Publicar este curso? Los estudiantes podrán verlo e inscribirse."
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
        Configuración del Curso
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
            Título
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
            Descripción
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
            Categoría
          </label>
          <select
            id="edit-category"
            name="category"
            defaultValue={course.category ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Sin categoría</option>
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
            Una vez publicado, los alumnos podrán ver e inscribirse al curso.
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
          <dt className="text-sm text-text-secondary">Módulos</dt>
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

// ---------------------------------------------------------------------------
// Text Lesson Editor — lets the professor edit the textual content of a TEXT
// lesson and optionally load a .txt/.md file from disk. The file is parsed
// in-browser (FileReader) and concatenated to the existing content.
// ---------------------------------------------------------------------------

function TextLessonEditor({
  lessonId,
  initialContent,
}: {
  lessonId: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

  type Format =
    | "bold"
    | "italic"
    | "underline"
    | "h2"
    | "h3"
    | "center"
    | "right"
    | "justify"
    | "left"
    | "bullets"
    | "numbered";

  /** Wrap the current selection (or insert at cursor) with markdown/HTML
   * syntax. Headings and alignment apply to the current line/paragraph;
   * lists apply line-by-line over the selection. */
  function applyFormat(kind: Format) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);

    const wrap = (left: string, right: string, placeholder: string) => {
      const body = selected || placeholder;
      const next = before + left + body + right + after;
      setContent(next);
      setSaved(false);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = (before + left).length;
        ta.setSelectionRange(pos, pos + body.length);
      });
    };

    if (kind === "bold") return wrap("**", "**", "texto en negritas");
    if (kind === "italic") return wrap("*", "*", "texto en cursiva");
    if (kind === "underline") return wrap("<u>", "</u>", "texto subrayado");

    if (kind === "center" || kind === "right" || kind === "justify") {
      // Wrap the entire current paragraph (block separated by blank
      // lines) so the alignment applies to the whole block.
      const blockStart =
        before.lastIndexOf("\n\n") === -1 ? 0 : before.lastIndexOf("\n\n") + 2;
      const blockEndOffset = after.indexOf("\n\n");
      const blockEnd = blockEndOffset === -1 ? content.length : end + blockEndOffset;
      const blockText = content.slice(blockStart, blockEnd).replace(
        /^<(center|right|justify)>([\s\S]*?)<\/\1>$/,
        "$2",
      );
      const wrapped = `<${kind}>${blockText.trim() || "texto"}</${kind}>`;
      const next =
        content.slice(0, blockStart) + wrapped + content.slice(blockEnd);
      setContent(next);
      setSaved(false);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = blockStart + wrapped.length;
        ta.setSelectionRange(pos, pos);
      });
      return;
    }

    if (kind === "left") {
      // Strip alignment wrapper if present on the current block.
      const blockStart =
        before.lastIndexOf("\n\n") === -1 ? 0 : before.lastIndexOf("\n\n") + 2;
      const blockEndOffset = after.indexOf("\n\n");
      const blockEnd = blockEndOffset === -1 ? content.length : end + blockEndOffset;
      const blockText = content
        .slice(blockStart, blockEnd)
        .replace(/^<(center|right|justify)>([\s\S]*?)<\/\1>$/, "$2");
      const next =
        content.slice(0, blockStart) + blockText + content.slice(blockEnd);
      setContent(next);
      setSaved(false);
      return;
    }

    if (kind === "bullets" || kind === "numbered") {
      // Apply prefix to each non-empty line of the selection (or the
      // current line if no selection).
      const target = selected || (() => {
        const lineStart = before.lastIndexOf("\n") + 1;
        const lineEndOffset = after.indexOf("\n");
        const lineEnd = lineEndOffset === -1 ? content.length : end + lineEndOffset;
        return content.slice(lineStart, lineEnd);
      })();
      const lines = target.split("\n");
      const prefixed = lines
        .map((l, idx) => {
          const stripped = l.replace(/^([*-]\s+|\d+\.\s+)/, "");
          if (!stripped.trim()) return stripped;
          return kind === "bullets" ? `- ${stripped}` : `${idx + 1}. ${stripped}`;
        })
        .join("\n");
      if (selected) {
        const next = before + prefixed + after;
        setContent(next);
        setSaved(false);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(start, start + prefixed.length);
        });
      } else {
        const lineStart = before.lastIndexOf("\n") + 1;
        const lineEndOffset = after.indexOf("\n");
        const lineEnd = lineEndOffset === -1 ? content.length : end + lineEndOffset;
        const next =
          content.slice(0, lineStart) + prefixed + content.slice(lineEnd);
        setContent(next);
        setSaved(false);
      }
      return;
    }

    // Heading: insert at the start of the current line.
    const lineStart = before.lastIndexOf("\n") + 1;
    const head = kind === "h2" ? "## " : "### ";
    // Strip any existing leading "# " sequence on the line so toggling works.
    const lineStartContent = content.slice(lineStart);
    const cleaned = lineStartContent.replace(/^#{1,3}\s+/, "");
    const next =
      content.slice(0, lineStart) + head + cleaned;
    setContent(next);
    setSaved(false);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = lineStart + head.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  /** Wraps current selection with a color span. */
  function applyColor(color: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);
    const body = selected || "texto con color";
    const wrapped = `<color="${color}">${body}</color>`;
    setContent(before + wrapped + after);
    setSaved(false);
    requestAnimationFrame(() => {
      ta.focus();
      const offset = (before + `<color="${color}">`).length;
      ta.setSelectionRange(offset, offset + body.length);
    });
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Solo imágenes (PNG, JPG, WEBP, GIF).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("La imagen supera 5 MB.");
      e.target.value = "";
      return;
    }
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo subir la imagen");
      }
      // Insert markdown image at the cursor position. The textarea is the
      // source of truth, so we splice into `content` directly.
      const ta = textareaRef.current;
      const altText = file.name.replace(/\.[^.]+$/, "");
      const markdown = `\n\n![${altText}](${data.url})\n\n`;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        setContent((prev) => prev.slice(0, start) + markdown + prev.slice(end));
        // Restore caret after the inserted markdown.
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + markdown.length;
          ta.setSelectionRange(pos, pos);
        });
      } else {
        setContent((prev) => prev + markdown);
      }
      setSaved(false);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "No se pudo subir la imagen",
      );
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const accepted =
      name.endsWith(".txt") ||
      name.endsWith(".pdf") ||
      name.endsWith(".docx");
    if (!accepted) {
      setFileError(
        "Formato no permitido. Sube PDF, Word (.docx) o texto plano (.txt).",
      );
      e.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError("El archivo supera 10 MB.");
      e.target.value = "";
      return;
    }

    setIsLoadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/extract-text", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? "No se pudo leer el archivo");
      }
      setContent((prev) => (prev ? `${prev}\n\n${data.text}` : data.text!));
      setLoadedFile(file.name);
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "No se pudo leer el archivo",
      );
    } finally {
      setIsLoadingFile(false);
      e.target.value = "";
    }
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    startSaving(async () => {
      try {
        await updateLesson(lessonId, { content });
        setSaved(true);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "No se pudo guardar la lección",
        );
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 rounded-lg border border-dashed border-border bg-surface-secondary p-2 text-xs">
        <label className="flex cursor-pointer items-center gap-2 text-text-secondary hover:text-primary-700">
          <input
            type="file"
            accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFile}
            disabled={isLoadingFile}
            className="sr-only"
          />
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-border">
            {isLoadingFile && <Loader2 className="h-3 w-3 animate-spin" />}
            Subir PDF, Word o .txt
          </span>
          <span>
            {loadedFile
              ? `Cargado: ${loadedFile}`
              : "o escribe directamente abajo"}
          </span>
        </label>
        {fileError && (
          <p className="mt-1 text-[11px] text-red-700">{fileError}</p>
        )}
      </div>
      <div className="mb-2 rounded-lg border border-dashed border-border bg-surface-secondary p-2 text-xs">
        <label className="flex cursor-pointer items-center gap-2 text-text-secondary hover:text-primary-700">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleImage}
            disabled={isUploadingImage}
            className="sr-only"
          />
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-border">
            {isUploadingImage ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
            Insertar imagen
          </span>
          <span>
            Se inserta como markdown en la posición del cursor (PNG/JPG/WEBP/GIF, 5 MB máx).
          </span>
        </label>
        {imageError && (
          <p className="mt-1 text-[11px] text-red-700">{imageError}</p>
        )}
      </div>
      {/* Formatting toolbar */}
      <div className="mb-1 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          title="Negritas (**texto**)"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("italic")}
          title="Cursiva (*texto*)"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("underline")}
          title="Subrayado (<u>texto</u>)"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => applyFormat("h2")}
          title="Tamaño grande (línea actual)"
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <Type className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">A+</span>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("h3")}
          title="Tamaño mediano (línea actual)"
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <Type className="h-3 w-3" />
          <span className="text-[11px] font-medium">A</span>
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        {/* Alignment */}
        <button
          type="button"
          onClick={() => applyFormat("left")}
          title="Alinear a la izquierda"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("center")}
          title="Centrar"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("right")}
          title="Alinear a la derecha"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("justify")}
          title="Justificar"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        {/* Lists */}
        <button
          type="button"
          onClick={() => applyFormat("bullets")}
          title="Lista con viñetas"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("numbered")}
          title="Lista numerada"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        {/* Color picker — native input, looks like a button */}
        <label
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded px-2 text-text-secondary hover:bg-surface hover:text-text-primary"
          title="Color del texto"
        >
          <Palette className="h-3.5 w-3.5" />
          <input
            type="color"
            defaultValue="#1e5ae6"
            onChange={(e) => applyColor(e.target.value)}
            className="h-4 w-4 cursor-pointer rounded border-none bg-transparent p-0"
          />
        </label>
        <span className="ml-auto pr-2 text-[10px] text-text-tertiary">
          Selecciona texto y aplica formato
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        rows={8}
        placeholder="Contenido de la lección (soporta markdown)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {saveError && (
          <span className="text-xs text-red-700">{saveError}</span>
        )}
        {saved && !saveError && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Guardado
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar texto
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Download Lesson Editor — lets the professor upload a single file (PDF,
// Office, ZIP, image…) that students will download. Persists fileUrl,
// fileName, fileSize and a short description in lesson.content (JSON).
// Reuses /api/upload/assignment which already accepts the same MIME types.
// ---------------------------------------------------------------------------

function DownloadLessonEditor({
  lessonId,
  initialContent,
}: {
  lessonId: string;
  initialContent: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    description?: string;
  } | null;
}) {
  const [fileUrl, setFileUrl] = useState(initialContent?.fileUrl ?? "");
  const [fileName, setFileName] = useState(initialContent?.fileName ?? "");
  const [fileSize, setFileSize] = useState(initialContent?.fileSize ?? 0);
  const [description, setDescription] = useState(initialContent?.description ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadError("El archivo supera 25 MB.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/assignment", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        url?: string;
        filename?: string;
        sizeBytes?: number;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo subir");
      }
      setFileUrl(data.url);
      setFileName(data.filename ?? file.name);
      setFileSize(data.sizeBytes ?? file.size);
      setSaved(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al subir el archivo",
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    if (!fileUrl) {
      setSaveError("Sube un archivo antes de guardar.");
      return;
    }
    startSaving(async () => {
      try {
        // Pass the structured object directly — Lesson.content is a Json
        // column, sending JSON.stringify(...) would store it as an escaped
        // string and the player would never find fileUrl.
        await updateLesson(lessonId, {
          content: { fileUrl, fileName, fileSize, description },
        });
        setSaved(true);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "No se pudo guardar la lección",
        );
      }
    });
  }

  function formatSize(bytes: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 rounded-lg border border-dashed border-border bg-surface-secondary p-3 text-xs">
        <label className="flex cursor-pointer items-center gap-3 text-text-secondary hover:text-primary-700">
          <input
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.zip,.png,.jpg,.jpeg,.webp,.txt"
            onChange={handleFile}
            disabled={isUploading}
            className="sr-only"
          />
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-3 py-1.5 text-[11px] font-medium text-primary-700 ring-1 ring-border">
            {isUploading && <Loader2 className="h-3 w-3 animate-spin" />}
            {fileUrl ? "Reemplazar archivo" : "Subir archivo"}
          </span>
          <span className="flex-1 truncate">
            {fileUrl ? (
              <>
                <span className="font-medium text-text-primary">{fileName}</span>
                {fileSize > 0 && (
                  <span className="ml-1 text-text-tertiary">
                    ({formatSize(fileSize)})
                  </span>
                )}
              </>
            ) : (
              "PDF, Word, Excel, PowerPoint, ZIP, imágenes o TXT (25 MB máx)"
            )}
          </span>
        </label>
        {uploadError && (
          <p className="mt-1 text-[11px] text-red-700">{uploadError}</p>
        )}
      </div>

      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="Descripción del material (opcional)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      <div className="mt-2 flex items-center justify-end gap-2">
        {saveError && (
          <span className="text-xs text-red-700">{saveError}</span>
        )}
        {saved && !saveError && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Guardado
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !fileUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar lección
        </button>
      </div>
    </div>
  );
}
