"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Save, Settings2 } from "lucide-react";
import { DC3_THEMATIC_AREAS } from "@/lib/dc3/catalogs";
import { updateCourseDc3Config } from "@/lib/actions/dc3";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export interface Dc3CourseConfig {
  id: string;
  title: string;
  dc3Enabled: boolean;
  dc3CourseName: string | null;
  dc3ThematicAreaCode: string | null;
  dc3DurationHours: number | null;
  dc3DeliveryMode: string;
  dc3InstructorName: string | null;
  dc3TrainingAgentId: string | null;
}

/**
 * Bloque del programa de capacitación (el naranja del formato), a cargo
 * de la administración.
 *
 * La modalidad no es cosmética: decide de dónde sale el periodo de
 * ejecución que se imprime, y por eso se explica en el propio formulario.
 */
export function Dc3ConfigForm({
  course,
  agents,
}: {
  course: Dc3CourseConfig;
  agents: { id: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(course.dc3Enabled);
  const [courseName, setCourseName] = useState(course.dc3CourseName ?? "");
  const [thematic, setThematic] = useState(course.dc3ThematicAreaCode ?? "");
  const [duration, setDuration] = useState(
    course.dc3DurationHours ? String(course.dc3DurationHours) : ""
  );
  const [mode, setMode] = useState(course.dc3DeliveryMode);
  const [instructor, setInstructor] = useState(course.dc3InstructorName ?? "");
  const [agentId, setAgentId] = useState(course.dc3TrainingAgentId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const formData = new FormData();
    formData.set("dc3Enabled", String(enabled));
    formData.set("dc3CourseName", courseName);
    formData.set("dc3ThematicAreaCode", thematic);
    formData.set("dc3DurationHours", duration);
    formData.set("dc3DeliveryMode", mode);
    formData.set("dc3InstructorName", instructor);
    formData.set("dc3TrainingAgentId", agentId);

    startTransition(async () => {
      try {
        await updateCourseDc3Config(course.id, formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  // Un agente desactivado sigue apareciendo si es el que ya tiene este
  // curso: quitarlo del select en silencio lo borraría al guardar.
  const selectableAgents = agents.filter(
    (a) => a.isActive || a.id === course.dc3TrainingAgentId
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary-500" />
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Datos del programa de capacitación
        </h2>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        Se imprimen en el bloque naranja del formato DC-3.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {saved && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Configuración guardada</p>
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3.5 py-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-text-primary">
          Este curso emite constancia DC-3
          <span className="mt-0.5 block text-xs text-text-tertiary">
            Sólo la verán los alumnos inscritos a través de una empresa con
            patrón registrado.
          </span>
        </span>
      </label>

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="dc3-course-name"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Nombre oficial del curso en el DC-3
            {enabled && <span className="ml-1 text-red-600">*</span>}
          </label>
          <input
            id="dc3-course-name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            maxLength={200}
            required={enabled}
            placeholder="Seguridad e higiene en el trabajo"
            className={INPUT}
          />
          {/* Sin este dato, la constancia imprimiría el título interno del
              curso. Se dice explícitamente porque el título interno se ve
              a dos centímetros de aquí y la tentación es dejarlo vacío. */}
          <p className="mt-1 text-xs text-text-tertiary">
            Obligatorio para emitir. Es el nombre que se imprime en la
            constancia, no el título interno de la plataforma
            {course.title && ` ("${course.title}")`}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="dc3-thematic"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Área temática
            </label>
            <select
              id="dc3-thematic"
              value={thematic}
              onChange={(e) => setThematic(e.target.value)}
              className={INPUT}
            >
              <option value="">Selecciona…</option>
              {DC3_THEMATIC_AREAS.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.code} — {area.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-tertiary">
              Catálogo oficial (nota 2 del formato).
            </p>
          </div>

          <div>
            <label
              htmlFor="dc3-duration"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Duración en horas
            </label>
            <input
              id="dc3-duration"
              type="number"
              min={1}
              max={9999}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Horas declaradas del programa, no la duración de los vídeos.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="dc3-agent"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Agente capacitador
          </label>
          <select
            id="dc3-agent"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className={INPUT}
          >
            <option value="">Selecciona…</option>
            {selectableAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? "" : " (inactivo)"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-tertiary">
            Quien impartió la formación. No se asume: elígelo de los agentes
            registrados.
          </p>
        </div>

        <div>
          <label
            htmlFor="dc3-instructor"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Instructor o tutor
          </label>
          <input
            id="dc3-instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            maxLength={120}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Firma la primera casilla del bloque de firmas. Cada edición puede
            sobrescribirlo.
          </p>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-text-primary">
            Modalidad y periodo de ejecución
          </span>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3.5 py-3">
              <input
                type="radio"
                name="dc3-mode"
                value="ONLINE"
                checked={mode === "ONLINE"}
                onChange={() => setMode("ONLINE")}
                className="mt-0.5 h-4 w-4 border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-primary">
                En línea / pregrabado
                <span className="mt-0.5 block text-xs text-text-tertiary">
                  El periodo se toma de la ventana real de cada alumno: de su
                  inscripción a la fecha en que concluyó el curso. Es distinto
                  para cada persona.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3.5 py-3">
              <input
                type="radio"
                name="dc3-mode"
                value="LIVE"
                checked={mode === "LIVE"}
                onChange={() => setMode("LIVE")}
                className="mt-0.5 h-4 w-4 border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-primary">
                En vivo (presencial o virtual)
                <span className="mt-0.5 block text-xs text-text-tertiary">
                  El periodo lo fija la edición a la que asistió el alumno. Hay
                  que registrar las fechas reales y asignar a cada alumno su
                  edición.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Guardar configuración
      </button>
    </form>
  );
}
