"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Building2,
  ArrowRight,
  FileQuestion,
  BarChart3,
} from "lucide-react";
import {
  updateEvaluation,
  deleteEvaluation,
  createSection,
  updateSection,
  deleteSection,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  assignEvaluationToCompany,
  unassignEvaluationFromCompany,
} from "@/lib/actions/evaluation";
import type {
  EvaluationSectionType,
  EvaluationStatus,
  EvaluationQuestionType,
  EvaluationKind,
} from "@prol/db";

type Question = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  position: number;
  type: EvaluationQuestionType;
};

type Section = {
  id: string;
  title: string;
  type: EvaluationSectionType;
  position: number;
  questions: Question[];
};

type Assignment = {
  id: string;
  company: { id: string; name: string; slug: string };
  assignedAt: Date;
  _count: { participants: number };
};

interface EvaluationData {
  id: string;
  title: string;
  description: string | null;
  methodology: string | null;
  status: EvaluationStatus;
  kind: EvaluationKind;
  sections: Section[];
  assignments: Assignment[];
}

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
  leaderId: string | null;
  _count: { members: number };
}

const TYPE_LABEL: Record<EvaluationSectionType, string> = {
  INTERNAL: "Cuestiones Internas (Fortaleza/Debilidad)",
  EXTERNAL: "Cuestiones Externas (Oportunidad/Amenaza)",
};

const KIND_LABEL: Record<EvaluationKind, string> = {
  DAFO: "DAFO",
  DIAGNOSTIC: "Diagnóstico",
  GUIDELINES: "Directrices",
  STAKEHOLDERS: "Partes interesadas",
  ROLES: "Cargos y roles",
};

const KIND_HINT: Record<EvaluationKind, string> = {
  DAFO: "Respuesta única F/D/O/A. Reporte DAFO consolidado.",
  DIAGNOSTIC: "Respuesta única Sí / Parcialmente / No. Reporte de barras GAP.",
  GUIDELINES: "Sólo texto abierto. Reporte sin gráfico.",
  STAKEHOLDERS: "Opción múltiple F/D/O/A. Reporte sin gráfico.",
  ROLES: "Sólo texto abierto. Reporte sin gráfico.",
};

/** Tipos de pregunta disponibles según el kind. El default va primero. */
function questionTypesFor(kind: EvaluationKind): {
  value: EvaluationQuestionType;
  label: string;
}[] {
  switch (kind) {
    case "DAFO":
      return [
        { value: "MULTIPLE_CHOICE", label: "Opción única (F/D/O/A por sección)" },
        { value: "OPEN_TEXT", label: "Texto abierto" },
      ];
    case "DIAGNOSTIC":
      return [
        { value: "MULTIPLE_CHOICE", label: "Opción única (Sí/Parcial/No)" },
        { value: "OPEN_TEXT", label: "Texto abierto" },
      ];
    case "STAKEHOLDERS":
      return [
        { value: "MULTI_FACTOR", label: "Opción múltiple (F/D/O/A)" },
        { value: "OPEN_TEXT", label: "Texto abierto" },
      ];
    case "GUIDELINES":
    case "ROLES":
      return [{ value: "OPEN_TEXT", label: "Texto abierto" }];
  }
}

const Q_TYPE_BADGE: Record<EvaluationQuestionType, { label: string; cls: string }> = {
  MULTIPLE_CHOICE: { label: "Opción", cls: "bg-primary-50 text-primary-700" },
  MULTI_FACTOR: { label: "Multi", cls: "bg-indigo-50 text-indigo-700" },
  OPEN_TEXT: { label: "Texto", cls: "bg-amber-50 text-amber-700" },
};

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

export function EvaluationEditor({
  evaluation,
  companies,
}: {
  evaluation: EvaluationData;
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Header/meta fields
  const [title, setTitle] = useState(evaluation.title);
  const [description, setDescription] = useState(evaluation.description ?? "");
  const [methodology, setMethodology] = useState(evaluation.methodology ?? "");
  const [metaDirty, setMetaDirty] = useState(false);

  function runAction(fn: () => Promise<unknown>) {
    setError("");
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function saveMeta() {
    runAction(async () => {
      await updateEvaluation(evaluation.id, { title, description, methodology });
      setMetaDirty(false);
    });
  }

  function togglePublish() {
    const next: EvaluationStatus =
      evaluation.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    runAction(async () => {
      await updateEvaluation(evaluation.id, { status: next });
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la evaluación "${evaluation.title}"?`)) return;
    runAction(async () => {
      await deleteEvaluation(evaluation.id);
      router.push("/professor/evaluations");
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header / meta */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-pill bg-primary-100 px-2 py-0.5 font-medium text-primary-700">
            {STATUS_LABEL[evaluation.status]}
          </span>
          <span
            className="rounded-pill bg-surface-tertiary px-2 py-0.5 font-medium text-text-secondary"
            title={KIND_HINT[evaluation.kind]}
          >
            Tipo · {KIND_LABEL[evaluation.kind]}
          </span>
          <button
            type="button"
            onClick={togglePublish}
            disabled={pending}
            className="rounded-md border border-border px-2 py-0.5 font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {evaluation.status === "PUBLISHED"
              ? "Volver a borrador"
              : "Publicar"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="ml-auto rounded-md px-2 py-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
        <div className="mt-3 space-y-3">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setMetaDirty(true);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 font-heading text-xl font-bold text-text-primary"
          />
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setMetaDirty(true);
            }}
            rows={2}
            placeholder="Descripción (opcional)"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text-primary"
          />
          <textarea
            value={methodology}
            onChange={(e) => {
              setMethodology(e.target.value);
              setMetaDirty(true);
            }}
            rows={4}
            placeholder="Metodología / instrucciones para los participantes"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text-primary"
          />
          {metaDirty && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveMeta}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sections */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Secciones y preguntas
          </h2>
          <AddSectionButton
            evaluationId={evaluation.id}
            onDone={() => router.refresh()}
          />
        </div>
        {evaluation.sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-tertiary">
            Agrega una sección para empezar. Típicamente "Cuestiones Internas"
            y "Cuestiones Externas".
          </div>
        ) : (
          evaluation.sections.map((s) => (
            <SectionBlock
              key={s.id}
              section={s}
              kind={evaluation.kind}
              onChange={() => router.refresh()}
            />
          ))
        )}
      </section>

      {/* Assignments */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <Building2 className="h-4 w-4 text-primary-600" />
            Empresas asignadas
          </h2>
          {evaluation.status !== "PUBLISHED" && (
            <span className="text-xs text-text-tertiary">
              Publica la evaluación para poder asignarla
            </span>
          )}
        </div>

        {evaluation.assignments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-text-tertiary">
            Aún no se ha asignado a ninguna empresa.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {evaluation.assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {a.company.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {a._count.participants} participante
                    {a._count.participants !== 1 ? "s" : ""} · asignada{" "}
                    {new Date(a.assignedAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/professor/evaluations/${evaluation.id}/results/${a.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50"
                    title="Ver resultados"
                  >
                    <BarChart3 className="h-3 w-3" />
                    Resultados
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm("¿Quitar la asignación de esta empresa?")) return;
                      runAction(async () => {
                        await unassignEvaluationFromCompany(
                          evaluation.id,
                          a.company.id,
                        );
                      });
                    }}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Quitar asignación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {evaluation.status === "PUBLISHED" && (
          <AssignCompanyPicker
            evaluationId={evaluation.id}
            companies={companies.filter(
              (c) => !evaluation.assignments.some((a) => a.company.id === c.id),
            )}
            onAssigned={() => router.refresh()}
          />
        )}
      </section>
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  kind,
  onChange,
}: {
  section: Section;
  kind: EvaluationKind;
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [type, setType] = useState<EvaluationSectionType>(section.type);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [error, setError] = useState("");

  function run(fn: () => Promise<unknown>) {
    setError("");
    startTransition(async () => {
      try {
        await fn();
        onChange();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        {editing ? (
          <div className="flex flex-1 gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as EvaluationSectionType)
              }
              className="rounded-lg border border-border bg-surface px-2 text-xs"
            >
              <option value="INTERNAL">Internas</option>
              <option value="EXTERNAL">Externas</option>
            </select>
            <button
              type="button"
              onClick={() =>
                run(async () => {
                  await updateSection(section.id, { title, type });
                  setEditing(false);
                })
              }
              disabled={pending}
              className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(section.title);
                setType(section.type);
                setEditing(false);
              }}
              className="rounded-lg px-2 py-1 text-xs text-text-secondary"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <div>
              <h3 className="font-heading text-base font-semibold text-text-primary">
                {section.title}
              </h3>
              <p className="text-xs text-text-tertiary">{TYPE_LABEL[section.type]}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`¿Eliminar la sección "${section.title}"?`)) return;
                  run(() => deleteSection(section.id));
                }}
                disabled={pending}
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <ul className="divide-y divide-border">
        {section.questions.map((q) => (
          <QuestionRow key={q.id} question={q} kind={kind} onChange={onChange} />
        ))}
      </ul>

      {showAddQuestion ? (
        <AddQuestionForm
          sectionId={section.id}
          kind={kind}
          onDone={() => {
            setShowAddQuestion(false);
            onChange();
          }}
          onCancel={() => setShowAddQuestion(false)}
        />
      ) : (
        <div className="px-5 py-2">
          <button
            type="button"
            onClick={() => setShowAddQuestion(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar pregunta
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Question row ────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  kind,
  onChange,
}: {
  question: Question;
  kind: EvaluationKind;
  onChange: () => void;
}) {
  const typeOptions = questionTypesFor(kind);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(question.code ?? "");
  const [label, setLabel] = useState(question.label);
  const [description, setDescription] = useState(question.description ?? "");
  const [qType, setQType] = useState<EvaluationQuestionType>(question.type);
  const [error, setError] = useState("");

  function run(fn: () => Promise<unknown>) {
    setError("");
    startTransition(async () => {
      try {
        await fn();
        onChange();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 bg-surface-secondary px-5 py-3">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="1.1"
            className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Etiqueta"
            maxLength={500}
            className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </div>
        <p
          className={`text-right text-[10px] ${
            label.length > 450 ? "text-amber-700" : "text-text-tertiary"
          }`}
        >
          {label.length}/500
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Descripción / ayuda para el participante (opcional)"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
        />
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-text-tertiary">Tipo:</label>
          <select
            value={qType}
            onChange={(e) =>
              setQType(e.target.value as EvaluationQuestionType)
            }
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-[11px] text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCode(question.code ?? "");
              setLabel(question.label);
              setDescription(question.description ?? "");
              setQType(question.type);
              setEditing(false);
            }}
            className="rounded-md px-2 py-1 text-xs text-text-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                await updateQuestion(question.id, {
                  code: code || null,
                  label,
                  description: description || null,
                  type: qType,
                });
                setEditing(false);
              })
            }
            disabled={
              pending || label.trim().length < 2 || label.length > 500
            }
            className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 px-5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">
          {question.code && (
            <span className="mr-1 font-semibold text-text-secondary">
              {question.code}.
            </span>
          )}
          {question.label}
        </p>
        {question.description && (
          <p className="mt-0.5 text-xs text-text-tertiary">
            {question.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${Q_TYPE_BADGE[question.type].cls}`}
          title={Q_TYPE_BADGE[question.type].label}
        >
          {Q_TYPE_BADGE[question.type].label}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("¿Eliminar esta pregunta?")) return;
            run(() => deleteQuestion(question.id));
          }}
          disabled={pending}
          className="rounded-md p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

// ─── Add section / Add question ──────────────────────────────────────────────

function AddSectionButton({
  evaluationId,
  onDone,
}: {
  evaluationId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EvaluationSectionType>("INTERNAL");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-primary-50 hover:text-primary-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Nueva sección
      </button>
    );
  }

  return (
    <div className="flex gap-2 rounded-lg border border-border bg-surface-secondary p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la sección"
        className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as EvaluationSectionType)}
        className="rounded-lg border border-border bg-surface px-2 text-xs"
      >
        <option value="INTERNAL">Internas</option>
        <option value="EXTERNAL">Externas</option>
      </select>
      <button
        type="button"
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              await createSection(evaluationId, { title, type });
              setTitle("");
              setOpen(false);
              onDone();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error");
            }
          });
        }}
        disabled={pending || title.length < 2}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        Agregar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-2 py-1.5 text-xs text-text-secondary"
      >
        Cancelar
      </button>
      {error && <span className="self-center text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

function AddQuestionForm({
  sectionId,
  kind,
  onDone,
  onCancel,
}: {
  sectionId: string;
  kind: EvaluationKind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const typeOptions = questionTypesFor(kind);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [qType, setQType] = useState<EvaluationQuestionType>(
    typeOptions[0]!.value,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="space-y-2 border-t border-border bg-surface-secondary px-5 py-3">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="1.1"
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='Etiqueta (ej. "Estructura de la organización")'
          maxLength={500}
          className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </div>
      <p
        className={`text-right text-[10px] ${
          label.length > 450 ? "text-amber-700" : "text-text-tertiary"
        }`}
      >
        {label.length}/500
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Descripción / ayuda para el participante (opcional). Para texto largo usa este campo en lugar de la etiqueta."
        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      />
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-text-tertiary">Tipo:</label>
        <select
          value={qType}
          onChange={(e) =>
            setQType(e.target.value as EvaluationQuestionType)
          }
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[11px] text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-xs text-text-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            setError("");
            startTransition(async () => {
              try {
                await createQuestion(sectionId, {
                  code: code || null,
                  label,
                  description: description || null,
                  type: qType,
                });
                onDone();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Error");
              }
            });
          }}
          disabled={pending || label.length < 2}
          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          Agregar pregunta
        </button>
      </div>
    </div>
  );
}

// ─── Assign company picker ───────────────────────────────────────────────────

function AssignCompanyPicker({
  evaluationId,
  companies,
  onAssigned,
}: {
  evaluationId: string;
  companies: CompanyOption[];
  onAssigned: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (companies.length === 0) {
    return (
      <p className="border-t border-border px-5 py-3 text-xs text-text-tertiary">
        Todas las empresas del tenant ya tienen esta evaluación asignada.
      </p>
    );
  }

  return (
    <div className="border-t border-border px-5 py-3">
      <p className="mb-2 text-xs font-medium text-text-secondary">
        Asignar a otra empresa
      </p>
      {error && (
        <p className="mb-2 text-xs text-red-700">{error}</p>
      )}
      <ul className="space-y-1">
        {companies.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">{c.name}</p>
              <p className="text-xs text-text-tertiary">
                {c._count.members} miembro{c._count.members !== 1 ? "s" : ""}
                {!c.leaderId && (
                  <span className="ml-2 text-amber-700">
                    ⚠ sin líder — los participantes quedarán vacíos
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={pending && addingId === c.id}
              onClick={() => {
                setError("");
                setAddingId(c.id);
                startTransition(async () => {
                  try {
                    await assignEvaluationToCompany(evaluationId, c.id);
                    onAssigned();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Error");
                  } finally {
                    setAddingId(null);
                  }
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-primary hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
            >
              {pending && addingId === c.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
              Asignar
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-tertiary">
        <FileQuestion className="h-3 w-3" />
        Al asignar, el líder de la empresa se agrega automáticamente como
        participante.
      </p>
    </div>
  );
}
