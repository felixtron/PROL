"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Search, GraduationCap, UserCheck } from "lucide-react";
import { manualEnrollStudent } from "@/lib/actions/enrollment";

export interface DialogCourse {
  id: string;
  title: string;
  priceInCents: number;
  currency: string;
}

export interface DialogStudent {
  id: string;
  name: string | null;
  email: string;
}

type Mode =
  | { kind: "pinned-course"; course: DialogCourse; students: DialogStudent[] }
  | { kind: "pinned-student"; student: DialogStudent; courses: DialogCourse[] };

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Gratis";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100
  );
}

export function ManualEnrollDialog({
  open,
  onClose,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");

  const [studentId, setStudentId] = useState<string | null>(
    mode.kind === "pinned-student" ? mode.student.id : null
  );
  const [courseId, setCourseId] = useState<string | null>(
    mode.kind === "pinned-course" ? mode.course.id : null
  );

  const [search, setSearch] = useState("");
  const [recordPayment, setRecordPayment] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [amountInput, setAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"SPEI" | "OXXO" | "CARD">(
    "SPEI"
  );

  // Curso seleccionado (para mostrar precio sugerido)
  const selectedCourse = useMemo<DialogCourse | null>(() => {
    if (mode.kind === "pinned-course") return mode.course;
    return mode.courses.find((c) => c.id === courseId) ?? null;
  }, [mode, courseId]);

  // Resetear el form cada vez que se abre el dialog (sin alterar pinned)
  useEffect(() => {
    if (!open) return;
    setError("");
    setOkMessage("");
    setSearch("");
    setRecordPayment(true);
    setSendWelcomeEmail(true);
    setPaymentMethod("SPEI");
    if (mode.kind === "pinned-student") setCourseId(null);
    if (mode.kind === "pinned-course") setStudentId(null);
  }, [open, mode.kind]);

  // Inicializar el monto con el precio del curso seleccionado
  useEffect(() => {
    if (selectedCourse) {
      setAmountInput((selectedCourse.priceInCents / 100).toFixed(2));
    } else {
      setAmountInput("");
    }
  }, [selectedCourse]);

  const filteredStudents = useMemo(() => {
    if (mode.kind !== "pinned-course") return [];
    const q = search.trim().toLowerCase();
    if (!q) return mode.students.slice(0, 30);
    return mode.students
      .filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [mode, search]);

  const filteredCourses = useMemo(() => {
    if (mode.kind !== "pinned-student") return [];
    const q = search.trim().toLowerCase();
    if (!q) return mode.courses;
    return mode.courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [mode, search]);

  function handleSubmit() {
    if (!studentId || !courseId) {
      setError("Selecciona alumno y curso");
      return;
    }
    setError("");
    setOkMessage("");
    const amountInCents = recordPayment
      ? Math.max(0, Math.round(parseFloat(amountInput || "0") * 100))
      : undefined;

    startTransition(async () => {
      try {
        const result = await manualEnrollStudent({
          studentId,
          courseId,
          recordPayment,
          amountInCents,
          paymentMethod,
          sendWelcomeEmail,
        });
        setOkMessage(
          result.alreadyEnrolled
            ? "El alumno ya estaba inscrito. " +
                (recordPayment ? "Pago manual registrado." : "Sin cambios.")
            : "Inscripción creada correctamente."
        );
        router.refresh();
        // Cierre automático después de un instante para que el usuario vea el OK
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al inscribir");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Inscripción manual
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Para pagos por transferencia, regalos o becas. El alumno NO pasa por Stripe.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Lado fijo (curso o alumno) */}
          {mode.kind === "pinned-course" ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3">
              <GraduationCap className="h-5 w-5 text-text-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {mode.course.title}
                </p>
                <p className="text-xs text-text-tertiary">
                  Precio del curso:{" "}
                  {formatPrice(mode.course.priceInCents, mode.course.currency)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3">
              <UserCheck className="h-5 w-5 text-text-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {mode.student.name ?? mode.student.email}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {mode.student.email}
                </p>
              </div>
            </div>
          )}

          {/* Lado a elegir */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              {mode.kind === "pinned-course" ? "Alumno" : "Curso"}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  mode.kind === "pinned-course"
                    ? "Buscar por email o nombre…"
                    : "Buscar curso por título…"
                }
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-border">
              {mode.kind === "pinned-course" ? (
                filteredStudents.length === 0 ? (
                  <p className="p-3 text-center text-xs text-text-tertiary">
                    {search ? "Sin resultados." : "Escribe para buscar."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredStudents.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setStudentId(s.id)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-secondary ${
                            studentId === s.id
                              ? "bg-primary-50 text-primary-800"
                              : "text-text-primary"
                          }`}
                        >
                          <span className="min-w-0 truncate">
                            {s.name ?? s.email}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-text-tertiary">
                            {s.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : filteredCourses.length === 0 ? (
                <p className="p-3 text-center text-xs text-text-tertiary">
                  Sin cursos disponibles.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredCourses.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setCourseId(c.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-secondary ${
                          courseId === c.id
                            ? "bg-primary-50 text-primary-800"
                            : "text-text-primary"
                        }`}
                      >
                        <span className="min-w-0 truncate">{c.title}</span>
                        <span className="ml-2 shrink-0 text-xs text-text-tertiary">
                          {formatPrice(c.priceInCents, c.currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Registrar pago + monto + método */}
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(e) => setRecordPayment(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">
                <span className="font-medium text-text-primary">
                  Registrar pago
                </span>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Crea un `CoursePayment` con estado COMPLETED para que aparezca en
                  los ingresos. Marca esta opción si cobraste por fuera del
                  checkout. Desmárcala si es regalo o beca.
                </p>
              </span>
            </label>
            {recordPayment && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Monto cobrado ({selectedCourse?.currency ?? "MXN"})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Método
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "SPEI" | "OXXO" | "CARD")
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value="SPEI">Transferencia (SPEI)</option>
                    <option value="OXXO">Efectivo / OXXO</option>
                    <option value="CARD">Tarjeta (manual)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Email */}
          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm">
              <span className="font-medium text-text-primary">
                Enviar email de bienvenida al curso
              </span>
              <p className="mt-0.5 text-xs text-text-tertiary">
                El alumno recibe el correo &laquo;Estás inscrito&raquo; con el enlace al curso.
              </p>
            </span>
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {okMessage && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {okMessage}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-surface-secondary px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !studentId || !courseId}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Inscribiendo…" : "Inscribir"}
          </button>
        </div>
      </div>
    </div>
  );
}
