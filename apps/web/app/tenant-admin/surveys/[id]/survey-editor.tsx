"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  ListOrdered,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Send,
  Copy,
  AlertTriangle,
  Zap,
  Users,
} from "lucide-react";
import {
  addQuestion,
  createCampaign,
  deleteQuestion,
  deleteSurvey,
  duplicateSurvey,
  fetchCompanyMembers,
  reorderQuestion,
  updateQuestion,
  updateSurvey,
} from "@/lib/actions/survey";
import {
  CAMPAIGN_STATE_LABEL,
  DEFAULT_DURATION_DAYS,
  campaignState,
  type CampaignState,
} from "@/lib/surveys";

// ─── Tipos que refleja la query del servidor ────────────────────────────────

type QuestionType = "RATING_STARS" | "MULTIPLE_CHOICE";
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Trigger = "MANUAL" | "COURSE_COMPLETED" | "CERTIFICATE_ISSUED";
type Audience = "COMPANY_LEADER" | "SPECIFIC_USERS" | "COMPANY_ALL";

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  position: number;
  options: unknown;
  section: string | null;
  weight: number;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  opensAt: Date | string;
  closesAt: Date | string;
  company: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
  workshop: { id: string; title: string } | null;
  advisorySession: { id: string; title: string } | null;
  projectLabel: string | null;
  resultsPublishedAt: Date | string | null;
  _count: { recipients: number; responses: number };
}

export interface SurveyEditorData {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  defaultDurationDays: number;
  defaultReminderDays: number[];
  trigger: Trigger;
  triggerCourseId: string | null;
  questions: Question[];
  campaigns: CampaignRow[];
}

interface Option {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<Status, string> = {
  DRAFT: "bg-surface-tertiary text-text-tertiary",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-amber-50 text-amber-700",
};
const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Activa",
  ARCHIVED: "Archivada",
};
const STATE_COLORS: Record<CampaignState, string> = {
  DRAFT: "bg-surface-tertiary text-text-tertiary",
  SCHEDULED: "bg-sky-50 text-sky-700",
  OPEN: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-surface-tertiary text-text-secondary",
  CANCELLED: "bg-red-50 text-red-700",
};

function toOptions(raw: unknown): string[] {
  return Array.isArray(raw)
    ? (raw as unknown[]).filter((o): o is string => typeof o === "string")
    : [];
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
    });
  };
  return { pending, error, run, setError };
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {error}
    </div>
  );
}

// ─── Raíz ────────────────────────────────────────────────────────────────────

export function SurveyEditor({
  survey,
  companies,
  courses,
  workshops,
  advisory,
}: {
  survey: SurveyEditorData;
  companies: Array<Option & { leaderId: string | null; memberCount: number }>;
  courses: Option[];
  workshops: Option[];
  advisory: Option[];
}) {
  return (
    <div className="space-y-6">
      <SurveyHeader survey={survey} />
      <SurveySettings survey={survey} courses={courses} />
      <QuestionsCard survey={survey} />
      <LaunchCard
        survey={survey}
        companies={companies}
        courses={courses}
        workshops={workshops}
        advisory={advisory}
      />
      <CampaignsCard campaigns={survey.campaigns} />
    </div>
  );
}

// ─── Cabecera ────────────────────────────────────────────────────────────────

function SurveyHeader({ survey }: { survey: SurveyEditorData }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasResponses = survey.campaigns.some((c) => c._count.responses > 0);

  return (
    <div className="space-y-3">
      <ErrorBox error={error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {survey.title}
            </h1>
            <span
              className={`rounded-pill px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[survey.status]}`}
            >
              {STATUS_LABELS[survey.status]}
            </span>
          </div>
          {survey.description && (
            <p className="mt-1 text-text-secondary">{survey.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {survey.status !== "PUBLISHED" ? (
            <button
              disabled={pending || survey.questions.length === 0}
              onClick={() =>
                run(() => updateSurvey(survey.id, { status: "PUBLISHED" }), () =>
                  router.refresh(),
                )
              }
              title={
                survey.questions.length === 0
                  ? "Agrega al menos una pregunta"
                  : undefined
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              Activar
            </button>
          ) : (
            <button
              disabled={pending}
              onClick={() =>
                run(() => updateSurvey(survey.id, { status: "DRAFT" }), () =>
                  router.refresh(),
                )
              }
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
            >
              Pasar a borrador
            </button>
          )}
          <button
            disabled={pending}
            onClick={() =>
              run(
                async () => {
                  const res = await duplicateSurvey(survey.id);
                  router.push(`/tenant-admin/surveys/${res.surveyId}`);
                },
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </button>
          {survey.status !== "ARCHIVED" && (
            <button
              disabled={pending}
              onClick={() =>
                run(() => updateSurvey(survey.id, { status: "ARCHIVED" }), () =>
                  router.refresh(),
                )
              }
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
            >
              Archivar
            </button>
          )}
          {!hasResponses && (
            <button
              disabled={pending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                run(() => deleteSurvey(survey.id), () =>
                  router.push("/tenant-admin/surveys"),
                );
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-border bg-surface text-red-700 hover:bg-red-50"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? "Confirmar" : "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Configuración ───────────────────────────────────────────────────────────

function SurveySettings({
  survey,
  courses,
}: {
  survey: SurveyEditorData;
  courses: Option[];
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? "");
  const [duration, setDuration] = useState(survey.defaultDurationDays);
  const [reminders, setReminders] = useState(survey.defaultReminderDays.join(", "));
  const [trigger, setTrigger] = useState<Trigger>(survey.trigger);
  const [triggerCourseId, setTriggerCourseId] = useState(survey.triggerCourseId ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    run(
      () =>
        updateSurvey(survey.id, {
          title,
          description: description || null,
          defaultDurationDays: duration,
          defaultReminderDays: reminders
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v)),
          trigger,
          triggerCourseId: trigger === "MANUAL" ? null : triggerCourseId || null,
        }),
      () => {
        setSaved(true);
        router.refresh();
      },
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="font-heading text-base font-semibold text-text-primary">
        Configuración
      </h2>
      <ErrorBox error={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Título
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Duración sugerida (días)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Recordatorios (días antes del cierre)
          </label>
          <input
            value={reminders}
            onChange={(e) => setReminders(e.target.value)}
            placeholder="7, 2"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Zap className="h-4 w-4 text-primary-600" />
          Disparador automático
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          Con un disparador activo, la encuesta sale sola al alumno y se acumula
          en un lanzamiento mensual por curso y empresa.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as Trigger)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          >
            <option value="MANUAL">Envío manual</option>
            <option value="COURSE_COMPLETED">Al finalizar el curso</option>
            <option value="CERTIFICATE_ISSUED">Al emitir el diploma</option>
          </select>
          {trigger !== "MANUAL" && (
            <select
              value={triggerCourseId}
              onChange={(e) => setTriggerCourseId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {trigger !== "MANUAL" && survey.status !== "PUBLISHED" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            El disparador sólo actúa cuando la encuesta está Activa.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
        {saved && !pending && (
          <span className="text-sm text-emerald-700">Guardado</span>
        )}
      </div>
    </section>
  );
}

// ─── Preguntas ───────────────────────────────────────────────────────────────

function QuestionsCard({ survey }: { survey: SurveyEditorData }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Preguntas
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Las preguntas de estrellas alimentan el índice de satisfacción; el peso
          decide cuánto pesa cada una (0 la deja fuera del índice). La sección
          agrupa las métricas del informe.
        </p>
      </div>

      {survey.questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-tertiary">
          Todavía no hay preguntas.
        </p>
      ) : (
        <ul className="space-y-3">
          {survey.questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              isFirst={i === 0}
              isLast={i === survey.questions.length - 1}
            />
          ))}
        </ul>
      )}

      <AddQuestionForm surveyId={survey.id} />
    </section>
  );
}

function QuestionRow({
  question,
  index,
  isFirst,
  isLast,
}: {
  question: Question;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [label, setLabel] = useState(question.label);
  const [section, setSection] = useState(question.section ?? "");
  const [weight, setWeight] = useState(question.weight);
  const [options, setOptions] = useState(toOptions(question.options).join("\n"));

  const dirty =
    label !== question.label ||
    section !== (question.section ?? "") ||
    weight !== question.weight ||
    (question.type === "MULTIPLE_CHOICE" &&
      options !== toOptions(question.options).join("\n"));

  return (
    <li className="rounded-lg border border-border p-4">
      <ErrorBox error={error} />
      <div className="flex items-start gap-3">
        <span className="mt-2 shrink-0 text-xs font-semibold text-text-tertiary">
          {index + 1}
        </span>
        {question.type === "RATING_STARS" ? (
          <Star className="mt-2 h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <ListOrdered className="mt-2 h-4 w-4 shrink-0 text-primary-600" />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-tertiary">
                Sección
              </label>
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="General"
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-tertiary">
                Peso en el índice
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
          </div>
          {question.type === "MULTIPLE_CHOICE" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-tertiary">
                Opciones (una por línea)
              </label>
              <textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={Math.max(2, options.split("\n").length)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
              />
            </div>
          )}
          {dirty && (
            <button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    updateQuestion(question.id, {
                      label,
                      section: section || null,
                      weight,
                      ...(question.type === "MULTIPLE_CHOICE"
                        ? { options: options.split("\n") }
                        : {}),
                    }),
                  () => router.refresh(),
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Guardar pregunta
            </button>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            disabled={pending || isFirst}
            onClick={() => run(() => reorderQuestion(question.id, "up"), () => router.refresh())}
            className="rounded p-1 text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
            aria-label="Subir"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            disabled={pending || isLast}
            onClick={() => run(() => reorderQuestion(question.id, "down"), () => router.refresh())}
            className="rounded p-1 text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
            aria-label="Bajar"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => deleteQuestion(question.id), () => router.refresh())}
            className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function AddQuestionForm({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [type, setType] = useState<QuestionType>("RATING_STARS");
  const [label, setLabel] = useState("");
  const [section, setSection] = useState("");
  const [weight, setWeight] = useState(1);
  const [options, setOptions] = useState("");

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <ErrorBox error={error} />
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        >
          <option value="RATING_STARS">Estrellas (1–5)</option>
          <option value="MULTIPLE_CHOICE">Opción múltiple</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nueva pregunta"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="Sección (opcional)"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          placeholder="Peso"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
      </div>
      {type === "MULTIPLE_CHOICE" && (
        <textarea
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          rows={3}
          placeholder={"Una opción por línea\nMínimo 2"}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
      )}
      <button
        disabled={pending || label.trim().length < 2}
        onClick={() =>
          run(
            () =>
              addQuestion(surveyId, {
                type,
                label,
                section: section || null,
                weight,
                options: type === "MULTIPLE_CHOICE" ? options.split("\n") : null,
              }),
            () => {
              setLabel("");
              setOptions("");
              router.refresh();
            },
          )
        }
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Agregar pregunta
      </button>
    </div>
  );
}

// ─── Nuevo lanzamiento ───────────────────────────────────────────────────────

function LaunchCard({
  survey,
  companies,
  courses,
  workshops,
  advisory,
}: {
  survey: SurveyEditorData;
  companies: Array<Option & { leaderId: string | null; memberCount: number }>;
  courses: Option[];
  workshops: Option[];
  advisory: Option[];
}) {
  const router = useRouter();
  const { pending, error, run, setError } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [audience, setAudience] = useState<Audience>("COMPANY_ALL");
  const [contextKind, setContextKind] = useState<"none" | "course" | "workshop" | "advisory" | "project">("none");
  const [courseId, setCourseId] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [advisoryId, setAdvisoryId] = useState("");
  const [projectLabel, setProjectLabel] = useState("");
  const [duration, setDuration] = useState(survey.defaultDurationDays || DEFAULT_DURATION_DAYS);
  const [closesOn, setClosesOn] = useState("");
  const [reminders, setReminders] = useState(survey.defaultReminderDays.join(", "));
  const [members, setMembers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const selectedCompany = companies.find((c) => c.id === companyId);

  useEffect(() => {
    if (!open || audience !== "SPECIFIC_USERS" || !companyId) return;
    let cancelled = false;
    setLoadingMembers(true);
    fetchCompanyMembers(companyId)
      .then((res) => {
        if (cancelled) return;
        setMembers(res.members);
        setSelected([]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, audience, companyId, setError]);

  function submit() {
    // El cierre se construye en el navegador para que "30 de septiembre"
    // signifique el final de ese día donde está el administrador, no donde
    // corre el contenedor.
    let closesAt: string | null = null;
    if (closesOn) {
      const [y, m, d] = closesOn.split("-").map(Number);
      closesAt = new Date(y!, (m ?? 1) - 1, d ?? 1, 23, 59, 59).toISOString();
    }

    run(
      async () => {
        const res = await createCampaign({
          surveyId: survey.id,
          name,
          audience,
          companyId,
          courseId: contextKind === "course" ? courseId || null : null,
          workshopId: contextKind === "workshop" ? workshopId || null : null,
          advisorySessionId: contextKind === "advisory" ? advisoryId || null : null,
          projectLabel: contextKind === "project" ? projectLabel || null : null,
          closesAt,
          durationDays: closesAt ? null : duration,
          reminderDaysBefore: reminders
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v)),
          userIds: audience === "SPECIFIC_USERS" ? selected : undefined,
        });
        router.push(`/tenant-admin/surveys/campaigns/${res.campaignId}`);
      },
    );
  }

  if (companies.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-text-tertiary">
        Necesitas al menos una empresa para lanzar la encuesta.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Nuevo lanzamiento
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Elige la empresa, los destinatarios y la ventana de respuesta.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
        >
          {open ? "Cancelar" : "Configurar envío"}
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border pt-4">
          <ErrorBox error={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Nombre del lanzamiento
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Ej: "Bloque 1 — Acme, septiembre"'
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Empresa
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.memberCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Destinatarios
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              >
                <option value="COMPANY_LEADER">Sólo el usuario líder</option>
                <option value="SPECIFIC_USERS">Usuarios específicos</option>
                <option value="COMPANY_ALL">Todos los usuarios de la empresa</option>
              </select>
              {audience === "COMPANY_LEADER" && selectedCompany && !selectedCompany.leaderId && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Esta empresa no tiene líder asignado.
                </p>
              )}
            </div>
          </div>

          {audience === "SPECIFIC_USERS" && (
            <div className="rounded-lg border border-border bg-surface-secondary p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <Users className="h-4 w-4" />
                Elige a quién enviar ({selected.length} seleccionado
                {selected.length !== 1 ? "s" : ""})
              </p>
              {loadingMembers ? (
                <p className="mt-2 text-sm text-text-tertiary">Cargando…</p>
              ) : members.length === 0 ? (
                <p className="mt-2 text-sm text-text-tertiary">
                  Esta empresa no tiene usuarios activos.
                </p>
              ) : (
                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                  {members.map((m) => (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface">
                        <input
                          type="checkbox"
                          checked={selected.includes(m.id)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, m.id]
                                : prev.filter((id) => id !== m.id),
                            )
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-text-primary">{m.name ?? m.email}</span>
                        <span className="text-xs text-text-tertiary">{m.email}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Contexto
              </label>
              <select
                value={contextKind}
                onChange={(e) => setContextKind(e.target.value as typeof contextKind)}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              >
                <option value="none">Sin contexto</option>
                <option value="course">Curso</option>
                <option value="workshop">Workshop</option>
                <option value="advisory">Consultoría</option>
                <option value="project">Proyecto / evento</option>
              </select>
            </div>
            <div>
              {contextKind === "course" && (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Curso
                  </label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
                  >
                    <option value="">Selecciona…</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {contextKind === "workshop" && (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Workshop
                  </label>
                  <select
                    value={workshopId}
                    onChange={(e) => setWorkshopId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
                  >
                    <option value="">Selecciona…</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {contextKind === "advisory" && (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Sesión
                  </label>
                  <select
                    value={advisoryId}
                    onChange={(e) => setAdvisoryId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
                  >
                    <option value="">Selecciona…</option>
                    {advisory.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {contextKind === "project" && (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Proyecto / evento / etapa
                  </label>
                  <input
                    value={projectLabel}
                    onChange={(e) => setProjectLabel(e.target.value)}
                    placeholder="Proyecto Planta Norte — etapa 2"
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Duración (días)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={duration}
                disabled={Boolean(closesOn)}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                O fecha de vencimiento
              </label>
              <input
                type="date"
                value={closesOn}
                onChange={(e) => setClosesOn(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Recordatorios (días antes)
              </label>
              <input
                value={reminders}
                onChange={(e) => setReminders(e.target.value)}
                placeholder="7, 2"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <button
              onClick={submit}
              disabled={pending || name.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Crear lanzamiento
            </button>
            <p className="text-xs text-text-tertiary">
              Se crea en borrador: los correos salen cuando pulses «Enviar» en el
              lanzamiento.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Lanzamientos existentes ─────────────────────────────────────────────────

function CampaignsCard({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Lanzamientos
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {campaigns.map((c) => {
          const state = campaignState({
            status: c.status,
            opensAt: new Date(c.opensAt),
            closesAt: new Date(c.closesAt),
          });
          const context =
            c.course?.title ??
            c.workshop?.title ??
            c.advisorySession?.title ??
            c.projectLabel ??
            null;
          return (
            <li key={c.id}>
              <Link
                href={`/tenant-admin/surveys/campaigns/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {c.name}
                    </p>
                    <span
                      className={`rounded-pill px-2 py-0.5 text-xs font-medium ${STATE_COLORS[state]}`}
                    >
                      {CAMPAIGN_STATE_LABEL[state]}
                    </span>
                    {c.resultsPublishedAt && (
                      <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        Resultados publicados
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">
                    {[c.company?.name, context].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-text-tertiary">
                  <p>
                    {c._count.responses}/{c._count.recipients} respuestas
                  </p>
                  <p>
                    Cierra{" "}
                    {new Date(c.closesAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
