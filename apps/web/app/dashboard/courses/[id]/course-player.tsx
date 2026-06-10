"use client";

import { useState, useTransition, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
  CheckCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  BookOpen,
  Clock,
  User,
  X,
  List,
  Download,
  Lock,
} from "lucide-react";
import { updateLessonProgress } from "@/lib/actions/enrollment";
import { QuizPlayer } from "./quiz-player";
import { InteractiveStopOverlay } from "./interactive-stop-overlay";
import { VideoPlayer, type PlayerAPI } from "@/components/video-player";
import { MultiLessonPlayer } from "./multi-lesson-player";
import { AssignmentPlayer } from "./assignment-player";
import { RichText } from "@/components/rich-text";
import {
  multiLessonContentSchema,
  type MultiLessonProgressMetadata,
} from "@prol/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LessonType = "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "MULTI" | "DOWNLOAD";

interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  position: number;
  videoDurationSeconds: number | null;
  videoUrl: string | null;
  videoProvider: "CLOUDFLARE" | "VIMEO_URL" | "VIMEO_UPLOAD" | "YOUTUBE" | null;
  videoHash: string | null;
  content: unknown;
}

interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface CoursePlayerProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
  };
  professor: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  modules: Module[];
  enrollmentId: string;
  progress: number;
  completedLessonIds: string[];
  totalLessons: number;
  lessonProgressMap: Map<string, string>;
  /** Id de la lección que contiene el examen final del curso, o null. */
  finalExamLessonId?: string | null;
  /** ¿El examen final está bloqueado por el gate de quizzes intermedios? */
  finalExamLocked?: boolean;
  /** Cuántos quizzes intermedios faltan por aprobar. */
  finalExamPendingCount?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const lessonTypeIcon: Record<LessonType, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
  MULTI: BookOpen,
  DOWNLOAD: Download,
};

const lessonTypeLabel: Record<LessonType, string> = {
  VIDEO: "Video",
  TEXT: "Lectura",
  QUIZ: "Evaluación",
  ASSIGNMENT: "Actividad",
  MULTI: "Lección",
  DOWNLOAD: "Material",
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoursePlayer({
  course,
  professor,
  modules,
  enrollmentId,
  progress: initialProgress,
  completedLessonIds: initialCompletedIds,
  totalLessons,
  lessonProgressMap,
  finalExamLessonId = null,
  finalExamLocked = false,
  finalExamPendingCount = 0,
}: CoursePlayerProps) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(initialCompletedIds),
  );
  const [progress, setProgress] = useState(initialProgress);
  const [isPending, startTransition] = useTransition();
  const [lessonPanelOpen, setLessonPanelOpen] = useState(false);
  // Map of lessonId → lessonProgressId. Starts with whatever the server
  // gave us; we extend it on the client when a video lesson is opened
  // and we lazily create a progress row.
  const [progressIdByLesson, setProgressIdByLesson] = useState<
    Map<string, string>
  >(() => new Map(lessonProgressMap));

  const flatLessons = useMemo(
    () => modules.flatMap((m) => m.lessons),
    [modules],
  );

  const activeLessonIndex = useMemo(
    () => flatLessons.findIndex((l) => l.id === activeLessonId),
    [flatLessons, activeLessonId],
  );

  const activeLesson =
    activeLessonIndex >= 0 ? flatLessons[activeLessonIndex] : null;

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of modules) for (const l of m.lessons) map.set(l.id, m.id);
    return map;
  }, [modules]);

  // Accordion state for the sidebar — only one module needs to be open
  // at a time; default to the module containing the active lesson, or
  // the first module otherwise.
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(
    () => new Set(modules[0] ? [modules[0].id] : []),
  );

  // Whenever the active lesson changes, ensure its module is expanded so
  // the user can see where they are in the sidebar.
  useEffect(() => {
    if (!activeLessonId) return;
    const moduleId = lessonsByModule.get(activeLessonId);
    if (!moduleId) return;
    setExpandedModuleIds((prev) => {
      if (prev.has(moduleId)) return prev;
      const next = new Set(prev);
      next.add(moduleId);
      return next;
    });
  }, [activeLessonId, lessonsByModule]);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const goToLesson = useCallback((lessonId: string | null) => {
    setActiveLessonId(lessonId);
    setLessonPanelOpen(false);
  }, []);

  const goPrev = useCallback(() => {
    const prev = flatLessons[activeLessonIndex - 1];
    if (activeLessonIndex > 0 && prev) setActiveLessonId(prev.id);
  }, [activeLessonIndex, flatLessons]);

  const goNext = useCallback(() => {
    const next = flatLessons[activeLessonIndex + 1];
    if (activeLessonIndex < flatLessons.length - 1 && next)
      setActiveLessonId(next.id);
  }, [activeLessonIndex, flatLessons]);

  const handleMarkComplete = useCallback(() => {
    if (!activeLesson) return;
    const lessonId = activeLesson.id;

    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(lessonId);
      return next;
    });
    const newCompleted = completedIds.size + 1;
    setProgress(
      totalLessons > 0 ? Math.round((newCompleted / totalLessons) * 100) : 0,
    );

    startTransition(async () => {
      try {
        await updateLessonProgress(enrollmentId, lessonId, {
          status: "COMPLETED",
        });
      } catch {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(lessonId);
          return next;
        });
        setProgress(initialProgress);
      }
    });
  }, [
    activeLesson,
    completedIds.size,
    totalLessons,
    enrollmentId,
    initialProgress,
  ]);

  const startFirstLesson = useCallback(() => {
    const first = flatLessons[0];
    if (first) setActiveLessonId(first.id);
  }, [flatLessons]);

  // ---------------------------------------------------------------------------
  // Lesson navigation panel (shared between mobile sheet and desktop sidebar)
  // ---------------------------------------------------------------------------

  const lessonNav = (
    <>
      {/* Progress header */}
      <div className="border-b border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">
            Progreso del curso
          </span>
          <span className="text-sm font-semibold text-primary-600">
            {progress}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-tertiary">
          {completedIds.size} de {totalLessons} lecciones completadas
        </p>
      </div>

      {/* Modules & lessons (accordion) */}
      <nav className="flex-1 overflow-y-auto py-2">
        {modules.map((mod, moduleIndex) => {
          const isExpanded = expandedModuleIds.has(mod.id);
          const moduleCompleted = mod.lessons.filter((l) =>
            completedIds.has(l.id),
          ).length;
          return (
            <div key={mod.id} className="border-b border-border/50 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary"
                aria-expanded={isExpanded}
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${
                    isExpanded ? "" : "-rotate-90"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  {/*
                    Render a sequential label rather than `mod.position` so
                    students see "Módulo 1, 2, 3…" instead of the raw
                    column value, which can have gaps when modules are
                    reordered or deleted (e.g. ISO 27001 course has
                    positions 0, 14, 15, 19…). `position` is still used
                    for ORDER BY upstream.
                  */}
                  <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Módulo {moduleIndex + 1}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
                    {mod.title}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-text-tertiary">
                  {moduleCompleted}/{mod.lessons.length}
                </span>
              </button>
              {isExpanded && (
                <ul className="pb-2">
                  {mod.lessons.map((lesson) => {
                    const Icon = lessonTypeIcon[lesson.type];
                    const isActive = lesson.id === activeLessonId;
                    const isComplete = completedIds.has(lesson.id);
                    const duration = formatDuration(lesson.videoDurationSeconds);
                    const isLockedFinalExam =
                      finalExamLocked && lesson.id === finalExamLessonId;

                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => goToLesson(lesson.id)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 pl-10 text-sm transition-colors ${
                            isActive
                              ? "border-l-2 border-primary-600 bg-primary-50 text-primary-700"
                              : isLockedFinalExam
                                ? "text-amber-800 active:bg-amber-50"
                                : "text-text-primary active:bg-surface-tertiary"
                          }`}
                        >
                          {isLockedFinalExam ? (
                            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                          ) : isComplete ? (
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <p
                              className={`truncate ${isComplete ? "text-text-tertiary line-through" : ""}`}
                            >
                              {lesson.title}
                            </p>
                            {isLockedFinalExam && (
                              <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700">
                                Bloqueado · faltan {finalExamPendingCount}{" "}
                                evaluación{finalExamPendingCount === 1 ? "" : "es"}
                              </p>
                            )}
                          </div>
                          {duration && !isLockedFinalExam && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                              <Clock className="h-3 w-3" />
                              {duration}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* ─── Main content area ─── */}
      <div className="flex-1 overflow-y-auto">
        {activeLesson ? (
          <LessonView
            lesson={activeLesson}
            isCompleted={completedIds.has(activeLesson.id)}
            isPending={isPending}
            onMarkComplete={handleMarkComplete}
            onPrev={activeLessonIndex > 0 ? goPrev : undefined}
            onNext={
              activeLessonIndex < flatLessons.length - 1 ? goNext : undefined
            }
            onBackToOverview={() => goToLesson(null)}
            onToggleLessons={() => setLessonPanelOpen(true)}
            lessonIndex={activeLessonIndex + 1}
            totalLessons={flatLessons.length}
            enrollmentId={enrollmentId}
            lessonProgressId={progressIdByLesson.get(activeLesson.id) ?? null}
            onProgressIdResolved={(lessonId, progressId) =>
              setProgressIdByLesson((prev) => {
                if (prev.get(lessonId) === progressId) return prev;
                const next = new Map(prev);
                next.set(lessonId, progressId);
                return next;
              })
            }
          />
        ) : (
          <CourseOverview
            course={course}
            professor={professor}
            progress={progress}
            completedCount={completedIds.size}
            totalLessons={totalLessons}
            onStart={startFirstLesson}
            onToggleLessons={() => setLessonPanelOpen(true)}
          />
        )}
      </div>

      {/* ─── Desktop sidebar (hidden on mobile) ─── */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-surface md:flex">
        {lessonNav}
      </aside>

      {/* ─── Mobile bottom sheet for lessons ─── */}
      {lessonPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setLessonPanelOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface shadow-xl">
            {/* Drag handle + close */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-text-tertiary/30" />
                <span className="text-sm font-semibold text-text-primary">
                  Contenido del curso
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLessonPanelOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full active:bg-surface-tertiary"
                aria-label="Cerrar panel"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            {/* Scrollable lesson list */}
            <div className="flex-1 overflow-y-auto">{lessonNav}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CourseOverview({
  course,
  professor,
  progress,
  completedCount,
  totalLessons,
  onStart,
  onToggleLessons,
}: {
  course: CoursePlayerProps["course"];
  professor: CoursePlayerProps["professor"];
  progress: number;
  completedCount: number;
  totalLessons: number;
  onStart: () => void;
  onToggleLessons: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Back link */}
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <Link
          href="/dashboard/courses"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary active:text-text-primary transition-colors md:mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Mis Cursos
        </Link>
      </div>

      {/* Hero section */}
      <div className="overflow-hidden bg-surface shadow-sm md:mx-8 md:rounded-xl">
        {/* Thumbnail / gradient banner */}
        <div className="relative h-44 w-full bg-gradient-to-br from-primary-500 to-primary-700 sm:h-52">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-white/30" />
            </div>
          )}
        </div>

        {/* Course info */}
        <div className="px-4 py-5 md:p-6">
          <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
            {course.title}
          </h1>

          {/* Professor */}
          <div className="mt-3 flex items-center gap-3">
            {professor.avatar ? (
              <img
                src={professor.avatar}
                alt={professor.name ?? "Profesor"}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                <User className="h-4 w-4 text-primary-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {professor.name ?? "Profesor"}
              </p>
              <p className="text-xs text-text-tertiary">Instructor</p>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <p className="mt-3 text-sm leading-relaxed text-text-secondary md:mt-4">
              {course.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-4 md:mt-6">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-text-secondary md:text-sm">
                {completedCount} de {totalLessons} lecciones
              </span>
              <span className="text-xs font-semibold text-primary-600 md:text-sm">
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3 md:mt-6">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm active:bg-primary-800 transition-colors md:flex-none md:py-2.5"
            >
              {progress > 0 ? "Continuar" : "Comenzar"}
              <Play className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleLessons}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-secondary active:bg-surface-tertiary transition-colors md:hidden"
            >
              <List className="h-4 w-4" />
              Lecciones
            </button>
          </div>
        </div>
      </div>

      {/* Bottom spacing for mobile bottom nav */}
      <div className="h-4 md:h-8" />
    </div>
  );
}

function LessonView({
  lesson,
  isCompleted,
  isPending,
  onMarkComplete,
  onPrev,
  onNext,
  onBackToOverview,
  onToggleLessons,
  lessonIndex,
  totalLessons,
  enrollmentId,
  lessonProgressId: initialLessonProgressId,
  onProgressIdResolved,
}: {
  lesson: Lesson;
  isCompleted: boolean;
  isPending: boolean;
  onMarkComplete: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onBackToOverview: () => void;
  onToggleLessons: () => void;
  lessonIndex: number;
  totalLessons: number;
  enrollmentId: string;
  lessonProgressId: string | null;
  onProgressIdResolved: (lessonId: string, progressId: string) => void;
}) {
  const Icon = lessonTypeIcon[lesson.type];
  const [quizData, setQuizData] = useState<any>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [interactiveStops, setInteractiveStops] = useState<any[]>([]);
  const lessonProgressId = initialLessonProgressId;
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerApi, setPlayerApi] = useState<PlayerAPI | null>(null);
  const isPreview = enrollmentId.startsWith("preview-");

  // Reset playback state when switching lessons so a previous video's
  // currentTime doesn't leak into a brand-new lesson and accidentally
  // re-trigger stops.
  useEffect(() => {
    setCurrentTime(0);
    setPlayerApi(null);
  }, [lesson.id]);

  // Real students: opening a VIDEO lesson without an existing progress
  // row means we need to create one (IN_PROGRESS) so interactive stops
  // can persist responses against it.
  useEffect(() => {
    if (lesson.type !== "VIDEO") return;
    if (initialLessonProgressId) return;
    if (isPreview) return;
    let cancelled = false;
    void updateLessonProgress(enrollmentId, lesson.id, {
      status: "IN_PROGRESS",
    }).then((res) => {
      if (cancelled) return;
      if (res?.lessonProgressId) {
        onProgressIdResolved(lesson.id, res.lessonProgressId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    lesson.id,
    lesson.type,
    initialLessonProgressId,
    isPreview,
    enrollmentId,
    onProgressIdResolved,
  ]);

  // Load quiz data when lesson type is QUIZ
  useEffect(() => {
    if (lesson.type === "QUIZ") {
      setIsLoadingQuiz(true);
      fetch(`/api/quiz/${lesson.id}?enrollmentId=${enrollmentId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setQuizData)
        .catch(console.error)
        .finally(() => setIsLoadingQuiz(false));
    }
  }, [lesson.id, lesson.type, enrollmentId]);

  // Load interactive stops when lesson type is VIDEO
  useEffect(() => {
    if (lesson.type === "VIDEO") {
      setIsLoadingStops(true);
      const params = new URLSearchParams();
      if (lessonProgressId) params.set("lessonProgressId", lessonProgressId);
      fetch(`/api/interactive-stops/${lesson.id}?${params}`)
        .then((res) => (res.ok ? res.json() : []))
        .then(setInteractiveStops)
        .catch(console.error)
        .finally(() => setIsLoadingStops(false));
    }
  }, [lesson.id, lesson.type, lessonProgressId]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* ─── Mobile top bar ─── */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={onBackToOverview}
          className="flex h-9 w-9 items-center justify-center rounded-full active:bg-surface-tertiary"
          aria-label="Volver al curso"
        >
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <span className="text-xs font-medium text-text-tertiary">
          {lessonIndex} / {totalLessons}
        </span>
        <button
          type="button"
          onClick={onToggleLessons}
          className="flex h-9 w-9 items-center justify-center rounded-full active:bg-surface-tertiary"
          aria-label="Ver lecciones"
        >
          <List className="h-5 w-5 text-text-secondary" />
        </button>
      </div>

      {/* ─── Desktop back link ─── */}
      <div className="hidden px-8 pt-8 md:block">
        <button
          type="button"
          onClick={onBackToOverview}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Vista general del curso
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 px-4 py-4 md:px-8 md:pb-8">
        {/* Lesson header */}
        <div className="mb-4 md:mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              <Icon className="h-3 w-3" />
              {lessonTypeLabel[lesson.type]}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle className="h-3 w-3" />
                Completada
              </span>
            )}
          </div>
          <h1 className="font-heading text-lg font-bold text-text-primary md:text-2xl">
            {lesson.title}
          </h1>
        </div>

        {/* Lesson content */}
        <div className="mb-6 md:mb-8">
          {lesson.type === "VIDEO" ? (
            lesson.videoUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
                <VideoPlayer
                  videoUrl={lesson.videoUrl}
                  provider={lesson.videoProvider}
                  videoHash={
                    lesson.videoProvider === "YOUTUBE"
                      ? null
                      : lesson.videoHash
                  }
                  startSeconds={
                    lesson.videoProvider === "YOUTUBE" && lesson.videoHash
                      ? parseInt(lesson.videoHash, 10) || null
                      : null
                  }
                  title={lesson.title}
                  onTimeUpdate={setCurrentTime}
                  onReady={setPlayerApi}
                />
                {/* Interactive stops overlay. We render even without a
                    lessonProgressId — the overlay short-circuits to a
                    no-op submit in that case so professor previews and
                    real students whose progress row is still being
                    created can both see the stops. */}
                {interactiveStops.length > 0 && (
                  <InteractiveStopOverlay
                    stops={interactiveStops}
                    lessonProgressId={lessonProgressId}
                    currentTime={currentTime}
                    playerApi={playerApi}
                  />
                )}
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-900">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                    <Play className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">Video no disponible</p>
                </div>
              </div>
            )
          ) : lesson.type === "MULTI" ? (
            (() => {
              const parsed = multiLessonContentSchema.safeParse(lesson.content);
              if (!parsed.success || parsed.data.blocks.length === 0) {
                return (
                  <div className="rounded-xl bg-surface p-8 text-center text-sm text-text-tertiary">
                    El profesor aún no ha agregado bloques a esta lección.
                  </div>
                );
              }
              const meta =
                typeof window !== "undefined"
                  ? (undefined as MultiLessonProgressMetadata | undefined)
                  : undefined;
              void meta;
              // blockProgress should come from server; for now, read from
              // a lessonProgressMap-derived map if available.
              const blockProgress: Record<string, boolean> = {};
              return (
                <MultiLessonPlayer
                  enrollmentId={enrollmentId}
                  lessonId={lesson.id}
                  content={parsed.data}
                  initialBlockProgress={blockProgress}
                  onAllComplete={onMarkComplete}
                />
              );
            })()
          ) : lesson.type === "TEXT" ? (
            <div className="rounded-xl bg-surface p-4 shadow-sm md:p-6">
              {typeof lesson.content === "string" ? (
                <RichText text={lesson.content} />
              ) : (
                <p className="text-text-tertiary italic">
                  El contenido de esta lección aún no está disponible.
                </p>
              )}
            </div>
          ) : lesson.type === "QUIZ" ? (
            isLoadingQuiz ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 md:p-12">
                <div className="text-center">
                  <HelpCircle className="mx-auto h-10 w-10 animate-pulse text-text-tertiary md:h-12 md:w-12" />
                  <p className="mt-2 text-sm text-text-secondary">
                    Cargando quiz...
                  </p>
                </div>
              </div>
            ) : quizData ? (
              // `key` forces a fresh QuizPlayer instance per lesson so
              // internal state (currentQuestionIndex, answers, timer,
              // isStarted...) doesn't leak across quiz navigations.
              <QuizPlayer
                key={lesson.id}
                quiz={quizData}
                enrollmentId={enrollmentId}
                onQuizPassed={onMarkComplete}
              />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 md:p-12">
                <div className="text-center">
                  <HelpCircle className="mx-auto h-10 w-10 text-text-tertiary md:h-12 md:w-12" />
                  <p className="mt-2 text-sm text-text-secondary">
                    Quiz no disponible
                  </p>
                </div>
              </div>
            )
          ) : lesson.type === "ASSIGNMENT" ? (
            // Same reasoning as QuizPlayer: prevent stale submission /
            // notes / file state from leaking across lesson navigations.
            <AssignmentPlayer
              key={lesson.id}
              enrollmentId={enrollmentId}
              lessonId={lesson.id}
              content={lesson.content}
            />
          ) : lesson.type === "DOWNLOAD" ? (
            <DownloadPlayer content={lesson.content} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 md:p-12">
              <div className="text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-text-tertiary md:h-12 md:w-12" />
                <p className="mt-2 text-sm text-text-secondary">
                  Tipo de lección no soportado
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Actions bar ─── */}
        <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between md:pt-6">
          {/* Mark as complete — solo para lecciones que NO se autocompletan
              al evaluarse. Los QUIZ se marcan al aprobar el quiz; los
              ASSIGNMENT al entregar. Permitir el click manual aquí dejaba
              al alumno saltarse el examen final (lección QUIZ con isFinalExam)
              quedando enrollment 100% pero sin certificado. */}
          <div>
            {lesson.type === "QUIZ" || lesson.type === "ASSIGNMENT" ? (
              isCompleted ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  Lección completada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-text-tertiary">
                  {lesson.type === "QUIZ"
                    ? "Aprueba el quiz para completar la lección"
                    : "Entrega la actividad para completar la lección"}
                </span>
              )
            ) : !isCompleted ? (
              <button
                type="button"
                onClick={onMarkComplete}
                disabled={isPending}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-primary-800 transition-colors disabled:opacity-50 md:w-auto md:rounded-lg md:py-2.5"
              >
                {isPending ? "Guardando..." : "Marcar como completada"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Lección completada
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary active:bg-surface-tertiary transition-colors md:flex-none md:rounded-lg md:py-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary active:bg-surface-tertiary transition-colors md:flex-none md:rounded-lg md:py-2.5"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DOWNLOAD lesson player — student-facing card with file metadata + a
// big download button. Content shape:
//   { fileUrl: string; fileName: string; fileSize: number; description?: string }
// ---------------------------------------------------------------------------

function DownloadPlayer({ content }: { content: unknown }) {
  const data = (content ?? {}) as {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    description?: string;
  };
  if (!data.fileUrl) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 md:p-12">
        <div className="text-center">
          <Download className="mx-auto h-10 w-10 text-text-tertiary md:h-12 md:w-12" />
          <p className="mt-2 text-sm text-text-secondary">
            Aún no se ha subido el material
          </p>
        </div>
      </div>
    );
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
          <Download className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <p className="font-heading text-lg font-semibold text-text-primary">
            {data.fileName ?? "Material descargable"}
          </p>
          {data.fileSize ? (
            <p className="mt-1 text-xs text-text-tertiary">
              {formatSize(data.fileSize)}
            </p>
          ) : null}
        </div>
        {data.description ? (
          <p className="max-w-md whitespace-pre-wrap text-sm text-text-secondary">
            {data.description}
          </p>
        ) : null}
        <a
          href={data.fileUrl}
          download={data.fileName ?? true}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Download className="h-4 w-4" />
          Descargar archivo
        </a>
      </div>
    </div>
  );
}

