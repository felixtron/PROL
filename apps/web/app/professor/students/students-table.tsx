"use client";

import { useMemo, useState } from "react";
import { Building2, Calendar, Search, Users, X } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { normalize } from "@/lib/normalize";
import { weightedProgress } from "@/lib/weighted-progress";
import type { ProfessorStudentRow } from "@/lib/queries/students";

/** Empresas y "sin empresa" comparten selector; este es el valor del segundo. */
const NO_COMPANY = "__none__";

type Stage = "all" | "not_started" | "in_progress" | "completed";

const STAGES: { value: Stage; label: string }[] = [
  { value: "all", label: "Todo el avance" },
  { value: "not_started", label: "Sin empezar" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completado" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function companyKey(row: ProfessorStudentRow): string {
  return row.student.company?.id ?? NO_COMPANY;
}

function companyName(row: ProfessorStudentRow): string {
  return row.student.company?.name ?? "Sin empresa";
}

export function StudentsTable({ rows }: { rows: ProfessorStudentRow[] }) {
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("all");

  /** Texto indexado por alumno, calculado una sola vez. */
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(
        row.student.id,
        normalize(
          [row.student.name ?? "", row.student.email, companyName(row)].join(
            " ",
          ),
        ),
      );
    }
    return map;
  }, [rows]);

  /** Cursos con al menos un alumno, para el selector. */
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      for (const e of row.enrollments) map.set(e.courseId, e.courseTitle);
    }
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title, "es"),
    );
  }, [rows]);

  /**
   * Fila de trabajo por alumno: sus inscripciones ya recortadas al curso
   * filtrado y su avance ponderado sobre ese recorte. Al filtrar por curso el
   * porcentaje pasa a ser el de ese curso, no el global del alumno.
   */
  const scoped = useMemo(
    () =>
      rows
        .map((row) => {
          const enrollments = course
            ? row.enrollments.filter((e) => e.courseId === course)
            : row.enrollments;
          return { row, enrollments, ...weightedProgress(enrollments) };
        })
        .filter((r) => r.enrollments.length > 0),
    [rows, course],
  );

  /**
   * Resumen por empresa. Se calcula sobre el curso filtrado pero ignorando el
   * filtro de empresa: las tarjetas tienen que seguir visibles para poder
   * cambiar de una a otra.
   */
  const companies = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        students: number;
        completed: number;
        total: number;
      }
    >();
    for (const s of scoped) {
      const id = companyKey(s.row);
      const entry = map.get(id) ?? {
        id,
        name: companyName(s.row),
        students: 0,
        completed: 0,
        total: 0,
      };
      entry.students += 1;
      entry.completed += s.completed;
      entry.total += s.total;
      map.set(id, entry);
    }
    return Array.from(map.values())
      .map((c) => ({
        ...c,
        // Avance de la empresa: lecciones completadas de todos sus alumnos
        // entre lecciones asignadas. No es el promedio de los promedios, así
        // que un alumno con un solo curso corto no pesa igual que otro con
        // cinco largos.
        percent: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
      }))
      .sort((a, b) => {
        // "Sin empresa" siempre al final; el resto por avance descendente.
        if (a.id === NO_COMPANY) return 1;
        if (b.id === NO_COMPANY) return -1;
        return b.percent - a.percent;
      });
  }, [scoped]);

  const visible = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean);
    return scoped
      .filter((s) => {
        if (company && companyKey(s.row) !== company) return false;
        if (stage === "not_started" && s.percent !== 0) return false;
        if (stage === "in_progress" && (s.percent === 0 || s.percent >= 100))
          return false;
        if (stage === "completed" && s.percent < 100) return false;
        if (tokens.length > 0) {
          const haystack = haystacks.get(s.row.student.id) ?? "";
          if (!tokens.every((t) => haystack.includes(t))) return false;
        }
        return true;
      })
      .sort((a, b) =>
        (a.row.student.name ?? a.row.student.email).localeCompare(
          b.row.student.name ?? b.row.student.email,
          "es",
        ),
      );
  }, [scoped, company, stage, search, haystacks]);

  const hasFilters =
    search.trim() !== "" ||
    company !== null ||
    course !== null ||
    stage !== "all";

  function clearFilters() {
    setSearch("");
    setCompany(null);
    setCourse(null);
    setStage("all");
  }

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-text-tertiary" />
        <p className="mt-3 text-sm font-medium text-text-secondary">
          Aún no tienes alumnos
        </p>
        <p className="mt-1 text-sm text-text-tertiary">
          Los alumnos aparecerán aquí cuando se inscriban a tus cursos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Avance por empresa ─── */}
      <section>
        <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Avance por empresa
        </h2>
        {/* Fila desplazable: con muchas empresas envolvía a varias líneas y
            empujaba la tabla fuera de pantalla. */}
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {companies.map((c) => {
            const active = company === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCompany(active ? null : c.id)}
                aria-pressed={active}
                className={`w-52 shrink-0 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-primary-600 bg-primary-50"
                    : "border-border bg-surface hover:border-primary-300"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Building2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      active ? "text-primary-600" : "text-text-tertiary"
                    }`}
                  />
                  <span
                    className="truncate text-sm font-semibold text-text-primary"
                    title={c.name}
                  >
                    {c.name}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {c.students} alumno{c.students !== 1 ? "s" : ""} ·{" "}
                  {c.completed}/{c.total} lecciones
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar
                    value={c.percent}
                    label={`Avance de ${c.name}`}
                    size="sm"
                  />
                  <span className="shrink-0 text-xs font-semibold text-text-secondary">
                    {c.percent}%
                  </span>
                </div>
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
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={course ?? ""}
          onChange={(e) => setCourse(e.target.value || null)}
          aria-label="Filtrar por curso"
          className={selectClass}
        >
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
          aria-label="Filtrar por estado de avance"
          className={selectClass}
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-sm text-text-tertiary">
          {visible.length} de {rows.length} alumno
          {rows.length !== 1 ? "s" : ""}
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
                  <Th>{course ? "Curso" : "Cursos inscritos"}</Th>
                  <Th>Avance</Th>
                  <Th>Talleres</Th>
                  <Th>Miembro desde</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map(
                  ({ row, enrollments, percent, completed, total }) => {
                    const { student, workshops } = row;
                    const courseNames = enrollments
                      .map((e) => e.courseTitle)
                      .join(", ");
                    const memberSince = new Date(
                      student.createdAt,
                    ).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-surface-secondary"
                      >
                        {/* Avatar + nombre + correo */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                                {getInitials(student.name ?? "E")}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-primary">
                                {student.name ?? "Sin nombre"}
                              </p>
                              <p className="truncate text-xs text-text-tertiary">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Empresa */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {student.company ? (
                            <span className="text-text-secondary">
                              {student.company.name}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">
                              Sin empresa
                            </span>
                          )}
                        </td>

                        {/* Cursos */}
                        <td className="max-w-xs px-4 py-3">
                          <p
                            className="truncate text-sm text-text-secondary"
                            title={courseNames}
                          >
                            {courseNames}
                          </p>
                        </td>

                        {/* Avance ponderado */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 shrink-0">
                              <ProgressBar
                                value={percent}
                                label={`Avance de ${student.name ?? student.email}`}
                                size="sm"
                              />
                            </div>
                            <span className="text-sm font-medium text-text-secondary">
                              {percent}%
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-text-tertiary">
                            {total > 0
                              ? `${completed}/${total} lecciones`
                              : "sin lecciones"}
                          </p>
                        </td>

                        {/* Talleres */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {workshops.total === 0 ? (
                            <span className="text-sm text-text-tertiary">
                              Sin talleres
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                              <Calendar className="h-3.5 w-3.5 text-primary-600" />
                              <span className="font-medium text-text-primary">
                                {workshops.attended}
                              </span>
                              <span className="text-text-tertiary">
                                / {workshops.total}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Miembro desde */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-tertiary">
                          {memberSince}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
      {children}
    </th>
  );
}
