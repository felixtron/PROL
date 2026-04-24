"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  BookOpen,
  Users,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Coins,
} from "lucide-react";
import type {
  CourseOutlineV2,
  Refinement,
  RefinementAnswers,
} from "@prol/content-factory";
import {
  createCourseDraft,
  runRefinement,
  saveRefinementAnswers,
  runOutlineGeneration,
  publishDraftAsCourse,
  runLessonRegeneration,
  applyLessonChoice,
  runCoherenceCheck,
  getCreditsStatus,
  getOperationCosts,
} from "@/lib/actions/course-draft";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

type Step = "briefing" | "refinement" | "generating" | "editing";

interface Props {
  onClose: () => void;
}

export function AICourseForm({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("briefing");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Step 1 state
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [moduleCount, setModuleCount] = useState(5);
  const [lessonsPerModule, setLessonsPerModule] = useState(5);

  // Step 2 state
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});

  // Step 3/4 state
  const [outline, setOutline] = useState<CourseOutlineV2 | null>(null);

  // Meta
  const [balance, setBalance] = useState<number | null>(null);
  const [costs, setCosts] = useState<Awaited<ReturnType<typeof getOperationCosts>> | null>(null);

  useEffect(() => {
    getCreditsStatus()
      .then((s) => setBalance(s.balance))
      .catch(() => {});
    getOperationCosts().then(setCosts).catch(() => {});
  }, []);

  function refreshBalance() {
    getCreditsStatus()
      .then((s) => setBalance(s.balance))
      .catch(() => {});
  }

  function submitBriefing(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("topic", topic);
        fd.set("audience", audience);
        fd.set("level", level);
        fd.set("moduleCount", String(moduleCount));
        fd.set("lessonsPerModule", String(lessonsPerModule));
        const res = await createCourseDraft(fd);
        setDraftId(res.draftId);
        setStep("refinement");
        const ref = await runRefinement(res.draftId);
        setRefinement(ref.refinement);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
        setStep("briefing");
      }
    });
  }

  function submitRefinement() {
    if (!draftId || !refinement) return;
    setError("");
    startTransition(async () => {
      try {
        const answersPayload: RefinementAnswers = {
          inferences: refinement.inferences,
          answers: Object.fromEntries(
            Object.entries(answers).map(([k, v]) => [k, v as string | number | string[]])
          ),
        };
        await saveRefinementAnswers(draftId, answersPayload);
        setStep("generating");
        const res = await runOutlineGeneration(draftId);
        if (!res.success || !res.outline) {
          if (!res.success && res.error === "insufficient_credits") {
            setError(
              `Créditos insuficientes. Necesitas ${res.requested}, tienes ${res.available}.`
            );
          } else {
            setError("Error al generar el outline");
          }
          setStep("refinement");
          return;
        }
        setOutline(res.outline);
        setStep("editing");
        refreshBalance();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
        setStep("refinement");
      }
    });
  }

  function publish() {
    if (!draftId) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await publishDraftAsCourse(draftId);
        if (res.success && res.courseId) {
          router.push(`/professor/courses/${res.courseId}/edit`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            Crear Curso con IA
          </h3>
        </div>
        <CreditsChip balance={balance} />
      </div>

      <StepIndicator step={step} />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === "briefing" && (
        <BriefingStep
          topic={topic}
          audience={audience}
          level={level}
          moduleCount={moduleCount}
          lessonsPerModule={lessonsPerModule}
          pending={pending}
          onTopic={setTopic}
          onAudience={setAudience}
          onLevel={setLevel}
          onModuleCount={setModuleCount}
          onLessonsPerModule={setLessonsPerModule}
          onSubmit={submitBriefing}
          onClose={onClose}
        />
      )}

      {step === "refinement" && (
        <RefinementStep
          refinement={refinement}
          answers={answers}
          outlineCost={costs?.outlineGeneration ?? 10}
          pending={pending}
          onAnswers={setAnswers}
          onBack={() => setStep("briefing")}
          onSubmit={submitRefinement}
        />
      )}

      {step === "generating" && <GeneratingStep />}

      {step === "editing" && outline && draftId && (
        <EditingStep
          outline={outline}
          draftId={draftId}
          pending={pending}
          costs={costs}
          onOutlineChange={setOutline}
          onRegenerateLessonCharged={refreshBalance}
          onPublish={publish}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CreditsChip({ balance }: { balance: number | null }) {
  if (balance === null) return null;
  const low = balance < 10;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        low
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-violet-200 bg-violet-50 text-violet-700"
      }`}
    >
      <Coins className="h-3.5 w-3.5" />
      {balance} créditos
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "briefing", label: "1. Briefing" },
    { key: "refinement", label: "2. Refinar" },
    { key: "generating", label: "3. Generar" },
    { key: "editing", label: "4. Editar" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mb-6 flex items-center gap-2 text-xs font-medium">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 ${
              i < activeIdx
                ? "bg-emerald-100 text-emerald-700"
                : i === activeIdx
                  ? "bg-violet-600 text-white"
                  : "bg-surface-tertiary text-text-tertiary"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight className="h-3 w-3 text-text-tertiary" />
          )}
        </div>
      ))}
    </div>
  );
}

function BriefingStep(props: {
  topic: string;
  audience: string;
  level: string;
  moduleCount: number;
  lessonsPerModule: number;
  pending: boolean;
  onTopic: (v: string) => void;
  onAudience: (v: string) => void;
  onLevel: (v: string) => void;
  onModuleCount: (v: number) => void;
  onLessonsPerModule: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          <BookOpen className="mr-1 inline h-4 w-4" />
          Tema del Curso <span className="text-red-500">*</span>
        </label>
        <input
          value={props.topic}
          onChange={(e) => props.onTopic(e.target.value)}
          required
          placeholder="Ej: Marketing Digital para Emprendedores"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          <Users className="mr-1 inline h-4 w-4" />
          Audiencia Objetivo <span className="text-red-500">*</span>
        </label>
        <input
          value={props.audience}
          onChange={(e) => props.onAudience(e.target.value)}
          required
          placeholder="Ej: Emprendedores y dueños de pequeños negocios en México"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Nivel
          </label>
          <select
            value={props.level}
            onChange={(e) => props.onLevel(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            <Layers className="mr-1 inline h-3.5 w-3.5" />
            Módulos
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={props.moduleCount}
            onChange={(e) => props.onModuleCount(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Lecciones/Módulo
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={props.lessonsPerModule}
            onChange={(e) => props.onLessonsPerModule(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <p className="text-xs text-text-tertiary">
        El paso siguiente (refinamiento) es gratuito. La IA te hará preguntas
        clave antes de generar el outline.
      </p>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={props.pending || !props.topic.trim() || !props.audience.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
        >
          {props.pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparando…
            </>
          ) : (
            <>
              Continuar con IA <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function RefinementStep(props: {
  refinement: Refinement | null;
  answers: Record<string, string | string[] | number>;
  outlineCost: number;
  pending: boolean;
  onAnswers: (a: Record<string, string | string[] | number>) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  if (!props.refinement) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analizando tu briefing…
      </div>
    );
  }

  const r = props.refinement;
  const setAnswer = (id: string, v: string | string[] | number) =>
    props.onAnswers({ ...props.answers, [id]: v });

  return (
    <div className="space-y-5">
      {r.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-800">
            Ajustes sugeridos
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700">
            {r.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-text-primary">
          Inferencias de la IA
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InferenceRow label="Objetivo" value={r.inferences.transformationObjective.value} confidence={r.inferences.transformationObjective.confidence} />
          <InferenceRow label="Duración" value={`${r.inferences.totalDurationHours.value} h`} confidence={r.inferences.totalDurationHours.confidence} />
          <InferenceRow label="Formato" value={r.inferences.formatSuggested.value} confidence={r.inferences.formatSuggested.confidence} />
          <InferenceRow label="Tono" value={r.inferences.toneSuggested.value} confidence={r.inferences.toneSuggested.confidence} />
          <InferenceRow label="% Práctico" value={`${r.inferences.practicalRatio.value}%`} confidence={r.inferences.practicalRatio.confidence} />
          <InferenceRow label="Evaluación" value={r.inferences.evaluationSuggested.value} confidence={r.inferences.evaluationSuggested.confidence} />
        </div>
      </div>

      {r.criticalQuestions.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-text-primary">
            Preguntas clave
          </h4>
          <div className="space-y-3">
            {r.criticalQuestions.map((q) => (
              <div key={q.id} className="rounded-lg border border-border bg-surface p-3">
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  {q.question}
                  {q.optional && (
                    <span className="ml-2 text-xs font-normal text-text-tertiary">
                      (opcional)
                    </span>
                  )}
                </label>
                <p className="mb-2 text-xs text-text-tertiary">{q.impact}</p>

                {q.type === "single_choice" && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          props.answers[q.id] === opt
                            ? "border-violet-500 bg-violet-100 text-violet-700"
                            : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "multi_choice" && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const current = (props.answers[q.id] as string[] | undefined) ?? [];
                      const selected = current.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setAnswer(
                              q.id,
                              selected
                                ? current.filter((o) => o !== opt)
                                : [...current, opt]
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selected
                              ? "border-violet-500 bg-violet-100 text-violet-700"
                              : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "text" && (
                  <input
                    value={(props.answers[q.id] as string | undefined) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                )}

                {q.type === "slider" && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={(props.answers[q.id] as number | undefined) ?? 50}
                    onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    className="w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary"
        >
          <ArrowLeft className="h-4 w-4" /> Atrás
        </button>
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={props.pending}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
        >
          {props.pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generando…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generar outline ({props.outlineCost} créditos)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function InferenceRow({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string | number;
  confidence: "alta" | "media" | "baja";
}) {
  const colors = {
    alta: "bg-emerald-50 text-emerald-700 border-emerald-200",
    media: "bg-amber-50 text-amber-700 border-amber-200",
    baja: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className="rounded-lg border border-border bg-surface p-2">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="truncate text-sm font-medium text-text-primary" title={String(value)}>
        {value}
      </p>
      <span className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] ${colors[confidence]}`}>
        {confidence}
      </span>
    </div>
  );
}

function GeneratingStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      <p className="text-sm font-medium text-text-primary">
        Generando tu outline…
      </p>
      <p className="text-xs text-text-tertiary">
        Esto toma 20–40 segundos. No cierres esta ventana.
      </p>
    </div>
  );
}

function EditingStep(props: {
  outline: CourseOutlineV2;
  draftId: string;
  pending: boolean;
  costs: Awaited<ReturnType<typeof getOperationCosts>> | null;
  onOutlineChange: (o: CourseOutlineV2) => void;
  onRegenerateLessonCharged: () => void;
  onPublish: () => void;
}) {
  const [regenTarget, setRegenTarget] = useState<{
    moduleId: string;
    lessonId: string;
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [alternatives, setAlternatives] = useState<CourseOutlineV2["modules"][number]["lessons"] | null>(null);
  const [coherence, setCoherence] = useState<Awaited<ReturnType<typeof runCoherenceCheck>> | null>(null);
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!regenTarget) return;
    setBusy(true);
    try {
      const res = await runLessonRegeneration(
        props.draftId,
        regenTarget.moduleId,
        regenTarget.lessonId,
        feedback || undefined
      );
      if (!res.success) {
        alert(
          res.error === "insufficient_credits"
            ? `Créditos insuficientes (necesitas ${res.requested}, tienes ${res.available}).`
            : "Error al regenerar."
        );
      } else if (res.alternatives) {
        setAlternatives(res.alternatives);
        props.onRegenerateLessonCharged();
      }
    } finally {
      setBusy(false);
    }
  }

  async function chooseAlternative(alt: CourseOutlineV2["modules"][number]["lessons"][number]) {
    if (!regenTarget) return;
    setBusy(true);
    try {
      await applyLessonChoice(props.draftId, regenTarget.moduleId, alt);
      const nextOutline = {
        ...props.outline,
        modules: props.outline.modules.map((m) =>
          m.id !== regenTarget.moduleId
            ? m
            : {
                ...m,
                lessons: m.lessons.map((l) => (l.id === alt.id ? alt : l)),
              }
        ),
      };
      props.onOutlineChange(nextOutline);
      setAlternatives(null);
      setRegenTarget(null);
      setFeedback("");
    } finally {
      setBusy(false);
    }
  }

  async function checkCoherence() {
    setBusy(true);
    try {
      const res = await runCoherenceCheck(props.draftId);
      setCoherence(res);
      props.onRegenerateLessonCharged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">
            Outline generado. Puedes editarlo o aceptarlo.
          </p>
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl font-bold text-text-primary">
          {props.outline.titleSuggested}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {props.outline.shortDescription}
        </p>
        <p className="mt-2 text-xs text-text-tertiary">
          <span className="font-medium">Promesa:</span>{" "}
          {props.outline.transformationPromise}
        </p>
      </div>

      <div className="space-y-3">
        {props.outline.modules.map((mod) => (
          <details
            key={mod.id}
            className="group rounded-lg border border-border bg-surface p-3"
            open
          >
            <summary className="flex cursor-pointer items-center justify-between">
              <span className="font-medium text-text-primary">
                Módulo {mod.number}. {mod.title}
              </span>
              <span className="text-xs text-text-tertiary">
                {mod.durationMin} min · {mod.lessons.length} lecciones
              </span>
            </summary>
            <p className="mt-1 text-xs text-text-tertiary">{mod.moduleObjective}</p>
            <ul className="mt-2 space-y-1">
              {mod.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-start justify-between gap-2 rounded-md bg-surface-tertiary/50 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {lesson.number}. {lesson.title}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {lesson.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] uppercase text-text-tertiary">
                      {lesson.type} · {lesson.durationMin}m
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRegenTarget({ moduleId: mod.id, lessonId: lesson.id })
                      }
                      className="rounded p-1 text-violet-600 hover:bg-violet-100"
                      title="Regenerar lección"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {regenTarget && (
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-3">
          <p className="mb-2 text-sm font-medium text-violet-800">
            Regenerar lección
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="¿Qué cambiar? (opcional) — ej: 'muy básica', 'falta ejercicio'"
            className="mb-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            rows={2}
          />
          {!alternatives ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegenTarget(null);
                  setFeedback("");
                }}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={regenerate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Regenerar ({props.costs?.lessonRegeneration ?? 1} créditos)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-violet-700">
                Elige una alternativa:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={busy}
                    onClick={() => chooseAlternative(alt)}
                    className="rounded-lg border border-violet-200 bg-white p-2 text-left text-xs hover:border-violet-500 disabled:opacity-50"
                  >
                    <p className="font-semibold text-text-primary">{alt.title}</p>
                    <p className="mt-1 text-text-tertiary">{alt.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {coherence?.success && coherence.report && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-800">
            {coherence.report.summary}
          </p>
          {coherence.report.issues.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              {coherence.report.issues.map((iss, i) => (
                <li key={i}>
                  <span className="font-semibold">[{iss.severity}]</span>{" "}
                  {iss.message}
                  {iss.suggestion && (
                    <span className="text-blue-600"> — {iss.suggestion}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={checkCoherence}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-tertiary disabled:opacity-50"
        >
          Revisar coherencia ({props.costs?.coherenceCheck ?? 1} créditos)
        </button>
        <button
          type="button"
          onClick={props.onPublish}
          disabled={props.pending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {props.pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Crear curso
        </button>
      </div>
    </div>
  );
}
