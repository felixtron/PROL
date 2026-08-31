"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Lock,
  MinusCircle,
  Search,
  Unlock,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { normalize } from "@/lib/normalize";
import type {
  CourseQuizResults,
  QuizResultCell,
  StudentQuizRow,
} from "@/lib/queries/quiz-results";

const NO_COMPANY = "__none__";

type Stage =
  | "all"
  | "not_taken"
  | "failed"
  | "passed"
  | "gate_blocked"
  | "can_take_final";

const STAGES: { value: Stage; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "not_taken", label: "Sin presentar" },
  { value: "failed", label: "Reprobado" },
  { value: "passed", label: "Aprobado" },
  { value: "gate_blocked", label: "Bloqueado por el gate" },
  { value: "can_take_final", label: "Puede presentar el final" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function companyOf(row: StudentQuizRow) {
  return {
    id: row.student.company?.id ?? NO_COMPANY,
    name: row.student.company?.name ?? "Sin empresa",
  };
}

/** ¿Este alumno aprobó algún intermedio pero por debajo del umbral del gate? */
function isGateBlocked(
  row: StudentQuizRow,
  quizzes: CourseQuizResults["quizzes"],
  hasFinalExam: boolean,
): boolean {
  if (!hasFinalExam || row.canTakeFinal) return false;
  return quizzes.some((q) => {
    const c = row.results[q.id];
    return !q.isFinalExam && c !== undefined && c.passed && !c.meetsGate;
  });
}

export function ResultsTable({ data }: { data: CourseQuizResults }) {
  const { quizzes, students, gateMinScore, intermediateCount, hasFinalExam } =
    data;

  const [search, setSearch] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("all");

  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of students) {
      map.set(
        r.student.id,
        normalize(
          [r.student.name ?? "", r.student.email, companyOf(r).name].join(" "),
        ),
      );
    }
    return map;
  }, [students]);

  const companies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of students) {
      const c = companyOf(r);
      const e = map.get(c.id) ?? { ...c, count: 0 };
      e.count += 1;
      map.set(c.id, e);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === NO_COMPANY) return 1;
      if (b.id === NO_COMPANY) return -1;
      return a.name.localeCompare(b.name, "es");
    });
  }, [students]);

  const selectedQuiz = quizzes.find((q) => q.id === quizId) ?? null;

  const visible = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean);
    return students
      .filter((r) => {
        if (company && companyOf(r).id !== company) return false;
        if (tokens.length > 0) {
          const h = haystacks.get(r.student.id) ?? "";
          if (!tokens.every((t) => h.includes(t))) return false;
        }
        if (stage === "all") return true;
        if (stage === "can_take_final") return r.canTakeFinal;

        // Con un quiz seleccionado el estado se evalúa sobre ese quiz; sin él,
        // sobre el conjunto del curso.
        if (selectedQuiz) {
          const c = r.results[selectedQuiz.id];
          if (!c) return false;
          if (stage === "not_taken") return c.bestScore === null;
          if (stage === "failed") return c.bestScore !== null && !c.passed;
          if (stage === "passed") return c.passed;
          if (stage === "gate_blocked")
            return !selectedQuiz.isFinalExam && c.passed && !c.meetsGate;
          return true;
        }

        if (stage === "not_taken")
          return !quizzes.some(
            (q) => (r.results[q.id]?.bestScore ?? null) !== null,
          );
        if (stage === "failed")
          return quizzes.some((q) => {
            const c = r.results[q.id];
            return c !== undefined && c.bestScore !== null && !c.passed;
          });
        if (stage === "passed")
          return quizzes.every((q) => r.results[q.id]?.passed);
        if (stage === "gate_blocked")
          return isGateBlocked(r, quizzes, hasFinalExam);
        return true;
      })
      .sort((a, b) =>
        (a.student.name ?? a.student.email).localeCompare(
          b.student.name ?? b.student.email,
          "es",
        ),
      );
  }, [
    students,
    company,
    search,
    stage,
    haystacks,
    selectedQuiz,
    quizzes,
    hasFinalExam,
  ]);

  const hasFilters =
    search.trim() !== "" ||
    company !== null ||
    quizId !== null ||
    stage !== "all";

  function clearFilters() {
    setSearch("");
    setCompany(null);
    setQuizId(null);
    setStage("all");
  }

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

  if (quizzes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <Award className="mx-auto h-10 w-10 text-text-tertiary" />
        <p className="mt-3 text-sm font-medium text-text-secondary">
          Este curso todavía no tiene quizzes
        </p>
        <p className="mt-1 text-sm text-text-tertiary">
          Agrega una lección de tipo Quiz desde el editor del curso y aquí verás
          los resultados de tus alumnos.
        </p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-text-tertiary" />
        <p className="mt-3 text-sm font-medium text-text-secondary">
          Nadie está inscrito en este curso todavía
        </p>
      </div>
    );
  }

  const blocked = students.filter((r) =>
    isGateBlocked(r, quizzes, hasFinalExam),
  ).length;

  return (
    <div className="space-y-4">
      {blocked > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-amber-900">
              {blocked} alumno{blocked !== 1 ? "s" : ""} con el examen final
              cerrado pese a tener quizzes aprobados
            </p>
            <p className="mt-0.5 text-amber-800">
              Aprobar un quiz usa su puntaje mínimo, pero para abrir el examen
              final hace falta {gateMinScore} en todos los intermedios. Si
              quieres que coincidan, sube el puntaje mínimo a {gateMinScore} en
              el editor del curso.
            </p>
          </div>
        </div>
      )}

      {/* ─── Un recuadro por quiz; al pulsarlo, filtra la tabla ─── */}
      <section>
        <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Quizzes del curso
        </h2>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {quizzes.map((q) => {
            const active = quizId === q.id;
            const rate =
              q.taken > 0 ? Math.round((q.passed / q.taken) * 100) : 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuizId(active ? null : q.id)}
                aria-pressed={active}
                className={`w-60 shrink-0 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-primary-600 bg-primary-50"
                    : "border-border bg-surface hover:border-primary-300"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {q.isFinalExam ? (
                    <Award className="h-3.5 w-3.5 shrink-0 text-accent-600" />
                  ) : (
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? "text-primary-600" : "text-text-tertiary"
                      }`}
                    />
                  )}
                  <span
                    className="truncate text-sm font-semibold text-text-primary"
                    title={q.title}
                  >
                    {q.title}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-tertiary">
                  {q.isFinalExam ? "Examen final · " : ""}mínimo{" "}
                  {q.passingScore} · {q.taken}/{students.length} presentaron
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar
                    value={rate}
                    label={`Aprobación de ${q.title}`}
                    size="sm"
                    tone={rate >= 70 ? "success" : "primary"}
                  />
                  <span className="shrink-0 text-xs font-semibold text-text-secondary">
                    {rate}%
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-text-tertiary">
                  {q.averageBest !== null
                    ? `promedio ${q.averageBest}`
                    : "sin intentos"}
                  {q.passedButBelowGate > 0 && (
                    <span className="text-amber-700">
                      {" "}
                      · {q.passedButBelowGate} bajo {gateMinScore}
                    </span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Filtros ─── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            aria-label="Buscar alumno"
            className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <select
          value={company ?? ""}
          onChange={(e) => setCompany(e.target.value || null)}
          aria-label="Filtrar por empresa"
          className={selectClass}
        >
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>

        <select
          value={quizId ?? ""}
          onChange={(e) => setQuizId(e.target.value || null)}
          aria-label="Filtrar por quiz"
          className={selectClass}
        >
          <option value="">Todos los quizzes</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.isFinalExam ? "★ " : ""}
              {q.title}
            </option>
          ))}
        </select>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
          aria-label="Filtrar por estado"
          className={selectClass}
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-sm text-text-tertiary">
          {visible.length} de {students.length} alumno
          {students.length !== 1 ? "s" : ""}
        </span>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* ─── Tabla ─── */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            Ningún alumno coincide con esos filtros
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <Th>Alumno</Th>
                  <Th>Empresa</Th>
                  {selectedQuiz ? (
                    <>
                      <Th>Mejor puntaje</Th>
                      <Th>Intentos</Th>
                      <Th>Último intento</Th>
                    </>
                  ) : (
                    <>
                      <Th>Quizzes aprobados</Th>
                      <Th>Rumbo al examen final</Th>
                    </>
                  )}
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className="hover:bg-surface-secondary"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.student.avatar ? (
                          <img
                            src={r.student.avatar}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {initials(r.student.name ?? "E")}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {r.student.name ?? "Sin nombre"}
                          </p>
                          <p className="truncate text-xs text-text-tertiary">
                            {r.student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {r.student.company ? (
                        <span className="text-text-secondary">
                          {r.student.company.name}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">Sin empresa</span>
                      )}
                    </td>

                    {selectedQuiz ? (
                      <QuizCells
                        cell={r.results[selectedQuiz.id]}
                        passingScore={selectedQuiz.passingScore}
                        maxAttempts={selectedQuiz.maxAttempts}
                      />
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                          {
                            quizzes.filter((q) => r.results[q.id]?.passed)
                              .length
                          }{" "}
                          <span className="text-text-tertiary">
                            de {quizzes.length}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {intermediateCount === 0 ? (
                            <span className="text-sm text-text-tertiary">
                              Sin intermedios
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-16 shrink-0">
                                <ProgressBar
                                  value={
                                    (r.gatePassed / intermediateCount) * 100
                                  }
                                  label={`Intermedios con ${gateMinScore} o más`}
                                  size="sm"
                                  tone={
                                    r.gatePassed === intermediateCount
                                      ? "success"
                                      : "primary"
                                  }
                                />
                              </div>
                              <span className="text-xs text-text-tertiary">
                                {r.gatePassed}/{intermediateCount} con{" "}
                                {gateMinScore}+
                              </span>
                            </div>
                          )}
                        </td>
                      </>
                    )}

                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge
                        row={r}
                        quiz={selectedQuiz}
                        hasFinalExam={hasFinalExam}
                        gateMinScore={gateMinScore}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCells({
  cell,
  passingScore,
  maxAttempts,
}: {
  cell: QuizResultCell | undefined;
  passingScore: number;
  maxAttempts: number;
}) {
  if (!cell) return null;
  return (
    <>
      <td className="whitespace-nowrap px-4 py-3">
        {cell.bestScore === null ? (
          <span className="text-sm text-text-tertiary">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-14 shrink-0">
              <ProgressBar
                value={cell.bestScore}
                label="Mejor puntaje"
                size="sm"
                tone={cell.passed ? "success" : "primary"}
              />
            </div>
            <span
              className={`text-sm font-semibold ${
                cell.passed ? "text-emerald-700" : "text-text-secondary"
              }`}
            >
              {cell.bestScore}
            </span>
            <span className="text-xs text-text-tertiary">
              mín. {passingScore}
            </span>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
        {cell.attempts}{" "}
        <span className="text-text-tertiary">de {maxAttempts}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-tertiary">
        {cell.lastAttemptAt
          ? new Date(cell.lastAttemptAt).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—"}
      </td>
    </>
  );
}

function StatusBadge({
  row,
  quiz,
  hasFinalExam,
  gateMinScore,
}: {
  row: StudentQuizRow;
  quiz: { id: string; isFinalExam: boolean } | null;
  hasFinalExam: boolean;
  gateMinScore: number;
}) {
  const pill =
    "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-xs font-medium";

  if (quiz) {
    const c = row.results[quiz.id];
    if (!c || c.bestScore === null) {
      return (
        <span className={`${pill} bg-surface-tertiary text-text-tertiary`}>
          <MinusCircle className="h-3 w-3" />
          Sin presentar
        </span>
      );
    }
    if (!c.passed) {
      return (
        <span className={`${pill} bg-red-50 text-red-700`}>
          <XCircle className="h-3 w-3" />
          Reprobado
          {c.attemptsLeft === 0 && " · sin intentos"}
        </span>
      );
    }
    // Aprobó el quiz pero no llega al umbral que abre el examen final.
    if (!quiz.isFinalExam && !c.meetsGate) {
      return (
        <span
          className={`${pill} bg-amber-50 text-amber-700`}
          title={`Aprobado, pero el examen final exige ${gateMinScore}`}
        >
          <Lock className="h-3 w-3" />
          Aprobado, bajo {gateMinScore}
        </span>
      );
    }
    return (
      <span className={`${pill} bg-emerald-50 text-emerald-700`}>
        <CheckCircle2 className="h-3 w-3" />
        Aprobado
      </span>
    );
  }

  if (row.finalPassed) {
    return (
      <span className={`${pill} bg-emerald-50 text-emerald-700`}>
        <Award className="h-3 w-3" />
        Examen final aprobado
      </span>
    );
  }
  if (!hasFinalExam) {
    return (
      <span className={`${pill} bg-surface-tertiary text-text-tertiary`}>
        Sin examen final
      </span>
    );
  }
  if (row.canTakeFinal) {
    return (
      <span className={`${pill} bg-blue-50 text-blue-700`}>
        <Unlock className="h-3 w-3" />
        Puede presentar el final
      </span>
    );
  }
  return (
    <span className={`${pill} bg-amber-50 text-amber-700`}>
      <Lock className="h-3 w-3" />
      Le faltan {row.gatePending}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
      {children}
    </th>
  );
}
