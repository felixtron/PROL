"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  ListOrdered,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Copy,
  Check,
  Share2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  updateSurvey,
  deleteSurvey,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestion,
  regenerateResultsToken,
  clearResultsToken,
} from "@/lib/actions/survey";

// ─── Types matching the server query result ──────────────────────────────────

type QuestionType = "RATING_STARS" | "MULTIPLE_CHOICE";
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  position: number;
  options: unknown;
}

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

interface SurveyData {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  publicSlug: string;
  resultsShareToken: string | null;
  companyId: string;
  company: { id: string; name: string; slug: string; leaderId: string | null };
  questions: Question[];
  _count: { responses: number };
}

const STATUS_COLORS: Record<Status, string> = {
  DRAFT: "bg-surface-tertiary text-text-tertiary",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-amber-50 text-amber-700",
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

export function SurveyEditor({
  survey,
  companies,
  baseUrl,
  listHref = "/professor/surveys",
}: {
  survey: SurveyData;
  companies: CompanyOption[];
  baseUrl: string;
  /** Where to redirect after deleting. Defaults to the professor list. */
  listHref?: string;
}) {
  return (
    <div className="space-y-6">
      <SurveyHeader survey={survey} companies={companies} />
      <PublicLinkCard survey={survey} baseUrl={baseUrl} />
      <QuestionsSection survey={survey} />
      <ShareResultsCard survey={survey} baseUrl={baseUrl} />
      <DangerZone survey={survey} listHref={listHref} />
    </div>
  );
}

// ─── Header: title/description/company/status ────────────────────────────────

function SurveyHeader({
  survey,
  companies,
}: {
  survey: SurveyData;
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? "");
  const [companyId, setCompanyId] = useState(survey.companyId);
  const [error, setError] = useState("");

  const dirty =
    title !== survey.title ||
    description !== (survey.description ?? "") ||
    companyId !== survey.companyId;

  function handleSave() {
    setError("");
    startTransition(async () => {
      try {
        await updateSurvey(survey.id, {
          title,
          description: description || null,
          companyId,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleStatusChange(status: Status) {
    setError("");
    startTransition(async () => {
      try {
        await updateSurvey(survey.id, { status });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-tertiary">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base font-semibold text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-tertiary">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-tertiary">
                Empresa asignada
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-tertiary">
                Estado
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {(["DRAFT", "PUBLISHED", "ARCHIVED"] as Status[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    disabled={pending || survey.status === s}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      survey.status === s
                        ? STATUS_COLORS[s]
                        : "border border-border bg-surface text-text-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {dirty && (
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setTitle(survey.title);
              setDescription(survey.description ?? "");
              setCompanyId(survey.companyId);
            }}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Public link ─────────────────────────────────────────────────────────────

function PublicLinkCard({
  survey,
  baseUrl,
}: {
  survey: SurveyData;
  baseUrl: string;
}) {
  const url = `${baseUrl}/surveys/${survey.publicSlug}`;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  const isPublished = survey.status === "PUBLISHED";

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Link público
          </h2>
          <p className="mt-0.5 text-sm text-text-tertiary">
            Compártelo por correo. {!isPublished && "Publica la encuesta para que sea respondible."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <code className="flex-1 truncate rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}

// ─── Questions ───────────────────────────────────────────────────────────────

function QuestionsSection({ survey }: { survey: SurveyData }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function move(questionId: string, direction: "up" | "down") {
    setError("");
    startTransition(async () => {
      try {
        await reorderQuestion(questionId, direction);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function remove(questionId: string) {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteQuestion(questionId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Preguntas
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar pregunta
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {adding && (
        <div className="mt-4">
          <NewQuestionForm
            surveyId={survey.id}
            onCancel={() => setAdding(false)}
            onCreated={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {survey.questions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-tertiary">
          Sin preguntas todavía. Agrega 3 o 4 sencillas.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {survey.questions.map((q, idx) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={idx}
              total={survey.questions.length}
              onMove={(dir) => move(q.id, dir)}
              onDelete={() => remove(q.id)}
              disabled={pending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  index,
  total,
  onMove,
  onDelete,
  disabled,
}: {
  question: Question;
  index: number;
  total: number;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(question.label);
  const [optionsText, setOptionsText] = useState(
    Array.isArray(question.options) ? (question.options as string[]).join("\n") : "",
  );
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    startTransition(async () => {
      try {
        if (question.type === "MULTIPLE_CHOICE") {
          const parsed = optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          await updateQuestion(question.id, { label, options: parsed });
        } else {
          await updateQuestion(question.id, { label });
        }
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface-secondary p-3">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove("up")}
            className="rounded p-0.5 text-text-tertiary hover:bg-surface hover:text-text-primary disabled:opacity-30"
            aria-label="Subir"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || index === total - 1}
            onClick={() => onMove("down")}
            className="rounded p-0.5 text-text-tertiary hover:bg-surface hover:text-text-primary disabled:opacity-30"
            aria-label="Bajar"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {question.type === "RATING_STARS" ? (
                <>
                  <Star className="h-3 w-3" />
                  Estrellas
                </>
              ) : (
                <>
                  <ListOrdered className="h-3 w-3" />
                  Opción múltiple
                </>
              )}
            </span>
            <span className="text-xs text-text-tertiary">#{index + 1}</span>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 block w-full text-left text-sm text-text-primary hover:underline"
            >
              {question.label}
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
              />
              {question.type === "MULTIPLE_CHOICE" && (
                <textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={Math.max(2, optionsText.split("\n").length)}
                  placeholder="Una opción por línea (mínimo 2)"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary"
                />
              )}
              {error && (
                <p className="text-xs text-red-700">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Guardar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setLabel(question.label);
                    setOptionsText(
                      Array.isArray(question.options)
                        ? (question.options as string[]).join("\n")
                        : "",
                    );
                    setEditing(false);
                  }}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {!editing &&
            question.type === "MULTIPLE_CHOICE" &&
            Array.isArray(question.options) && (
              <ul className="mt-1.5 space-y-0.5">
                {(question.options as string[]).map((opt, i) => (
                  <li
                    key={i}
                    className="text-xs text-text-tertiary"
                  >
                    · {opt}
                  </li>
                ))}
              </ul>
            )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="shrink-0 rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function NewQuestionForm({
  surveyId,
  onCancel,
  onCreated,
}: {
  surveyId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<QuestionType>("RATING_STARS");
  const [label, setLabel] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (type === "MULTIPLE_CHOICE") {
          const parsed = optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          await addQuestion(surveyId, { type, label, options: parsed });
        } else {
          await addQuestion(surveyId, { type, label });
        }
        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-primary-200 bg-primary-50/40 p-4"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setType("RATING_STARS")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              type === "RATING_STARS"
                ? "bg-primary-600 text-white"
                : "border border-border bg-surface text-text-secondary"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Estrellas (1-5)
          </button>
          <button
            type="button"
            onClick={() => setType("MULTIPLE_CHOICE")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              type === "MULTIPLE_CHOICE"
                ? "bg-primary-600 text-white"
                : "border border-border bg-surface text-text-secondary"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Opción múltiple
          </button>
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={200}
          placeholder="Texto de la pregunta"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
        {type === "MULTIPLE_CHOICE" && (
          <textarea
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            rows={3}
            placeholder="Una opción por línea (mínimo 2)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary"
          />
        )}
        {error && (
          <p className="text-xs text-red-700">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Agregar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Share results ───────────────────────────────────────────────────────────

function ShareResultsCard({
  survey,
  baseUrl,
}: {
  survey: SurveyData;
  baseUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const url = survey.resultsShareToken
    ? `${baseUrl}/surveys/results/${survey.resultsShareToken}`
    : null;

  function generate() {
    setError("");
    startTransition(async () => {
      try {
        await regenerateResultsToken(survey.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function clear() {
    setError("");
    startTransition(async () => {
      try {
        await clearResultsToken(survey.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Compartir resultados
          </h2>
          <p className="mt-0.5 text-sm text-text-tertiary">
            El líder de <strong>{survey.company.name}</strong> verá los
            resultados en su dashboard. Si necesitas mandarlos por correo a
            alguien externo, genera un link de solo lectura.
          </p>
        </div>
        <Share2 className="h-5 w-5 text-text-tertiary" />
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {!url ? (
        <button
          type="button"
          disabled={pending}
          onClick={generate}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Generar link compartible
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <code className="flex-1 truncate rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={generate}
              className="text-xs text-text-tertiary underline-offset-2 hover:underline disabled:opacity-50"
            >
              Regenerar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={clear}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary underline-offset-2 hover:underline disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Revocar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Danger zone (delete) ────────────────────────────────────────────────────

function DangerZone({
  survey,
  listHref,
}: {
  survey: SurveyData;
  listHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar la encuesta "${survey.title}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setError("");
    startTransition(async () => {
      try {
        await deleteSurvey(survey.id);
        router.push(listHref);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  const blocked = survey._count.responses > 0;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="font-heading text-sm font-semibold text-red-700">
        Eliminar encuesta
      </h2>
      <p className="mt-1 text-xs text-red-600/80">
        {blocked
          ? "No se puede eliminar porque ya tiene respuestas. Archívala en su lugar."
          : "Esta acción no se puede deshacer."}
      </p>
      {error && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}
      <button
        type="button"
        disabled={pending || blocked}
        onClick={handleDelete}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Eliminar
      </button>
    </div>
  );
}
