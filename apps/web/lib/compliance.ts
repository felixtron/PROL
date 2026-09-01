// Cálculo puro del módulo de Gestión Documental: estado de las actividades de
// la agenda, cálculo de la siguiente fecha de revisión y evaluación de la
// matriz de riesgos. Sin acceso a base de datos a propósito — las mismas
// funciones las usan la agenda del cliente, la del administrador y el barrido
// de recordatorios, y así los tres coinciden siempre.

import type {
  ComplianceActivityStatus,
  EvidencePeriodicity,
  EvidenceStatus,
  RiskItemType,
} from "@prol/db";

/** Días antes del vencimiento en los que sale cada recordatorio. */
export const DEFAULT_REMINDER_DAYS = [14, 3];

/** A partir de cuántos días una actividad se muestra como "próxima". */
export const DUE_SOON_DAYS = 14;

// ─── Estado de las actividades ───────────────────────────────────────────────

export type ActivityState =
  | "OPEN"
  | "DUE_SOON"
  | "OVERDUE"
  | "COMPLETED"
  | "NOT_APPLICABLE"
  | "CANCELLED";

export interface ActivityWindow {
  status: ComplianceActivityStatus;
  dueAt: Date | null;
}

/**
 * Estado real de una actividad en un instante dado.
 *
 * `OVERDUE` es el caso importante: la fila sigue OPEN en la base porque nadie
 * la ha cerrado, pero la fecha comprometida ya pasó. Resolverlo aquí —y no
 * guardar "vencida" como columna— es lo que garantiza que la agenda diga la
 * verdad aunque el cron de recordatorios lleve días caído.
 */
export function activityState(
  activity: ActivityWindow,
  now: Date = new Date(),
): ActivityState {
  if (activity.status === "CANCELLED") return "CANCELLED";
  if (activity.status === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (activity.status === "COMPLETED") return "COMPLETED";
  if (!activity.dueAt) return "OPEN";
  const days = daysUntil(activity.dueAt, now);
  if (days < 0) return "OVERDUE";
  if (days <= DUE_SOON_DAYS) return "DUE_SOON";
  return "OPEN";
}

export const ACTIVITY_STATE_LABEL: Record<ActivityState, string> = {
  OPEN: "Pendiente",
  DUE_SOON: "Próxima",
  OVERDUE: "Vencida",
  COMPLETED: "Completada",
  NOT_APPLICABLE: "No aplica",
  CANCELLED: "Cancelada",
};

/** Días restantes (hacia arriba) hasta la fecha. Negativo si ya pasó. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

// ─── Periodicidad ────────────────────────────────────────────────────────────

export const PERIODICITY_LABEL: Record<EvidencePeriodicity, string> = {
  ONCE: "Única",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

/** Meses que separan dos ciclos. `ONCE` no se repite. */
export function periodicityMonths(
  periodicity: EvidencePeriodicity,
): number | null {
  if (periodicity === "SEMIANNUAL") return 6;
  if (periodicity === "ANNUAL") return 12;
  return null;
}

/**
 * Fecha de la siguiente revisión a partir de la aprobación.
 *
 * Usa `setMonth` sobre una copia, que en JavaScript ya resuelve el
 * desbordamiento de año; el ajuste posterior evita el salto de mes cuando el
 * día no existe en el destino (31 de agosto + 6 meses caería en el 3 de marzo).
 */
export function nextDueDate(
  periodicity: EvidencePeriodicity,
  from: Date,
): Date | null {
  const months = periodicityMonths(periodicity);
  if (months === null) return null;
  const next = new Date(from.getTime());
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() !== day) {
    // Se desbordó al mes siguiente: retrocede al último día del mes correcto.
    next.setDate(0);
  }
  return next;
}

/**
 * Etiqueta legible del ciclo: "2027-S1" para semestral, "2027" para anual.
 * Sin fecha no hay etiqueta — el ciclo existe, pero todavía no está situado.
 */
export function periodLabel(
  periodicity: EvidencePeriodicity,
  dueAt: Date | null,
): string | null {
  if (!dueAt) return null;
  const year = dueAt.getFullYear();
  if (periodicity === "ANNUAL") return String(year);
  if (periodicity === "SEMIANNUAL") {
    return `${year}-S${dueAt.getMonth() < 6 ? 1 : 2}`;
  }
  return null;
}

// ─── Evidencias ──────────────────────────────────────────────────────────────

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  PENDING: "Pendiente",
  IN_REVIEW: "En revisión",
  NEEDS_CORRECTION: "Requiere corrección",
  APPROVED: "Aprobada",
};

/** Clases de color por estado, para insignias en tablas y fichas. */
export const EVIDENCE_STATUS_CLASS: Record<EvidenceStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  NEEDS_CORRECTION: "bg-rose-100 text-rose-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
};

/** ¿El cliente puede entregar algo nuevo en esta actividad? */
export function canSubmitEvidence(
  latestStatus: EvidenceStatus | null | undefined,
): boolean {
  if (!latestStatus) return true;
  return latestStatus === "NEEDS_CORRECTION";
}

// ─── Matriz de riesgos y oportunidades ───────────────────────────────────────

export interface RiskMatrixConfig {
  /** Valor máximo de las escalas de probabilidad y consecuencia. */
  scaleMax: number;
  /** Etiquetas de la escala, de menor a mayor. */
  probabilityLabels: string[];
  impactLabels: string[];
  /**
   * Umbrales de nivel por puntuación mínima, de mayor a menor. La primera
   * cuyo `min` no supere la puntuación es la que aplica.
   */
  levels: Array<{ min: number; label: string; className: string }>;
}

/**
 * Configuración por defecto: escala 1–5 y cuatro niveles sobre P×C (1–25).
 * Es lo que se copia a una matriz nueva cuando el requisito no trae la suya.
 */
export const DEFAULT_RISK_CONFIG: RiskMatrixConfig = {
  scaleMax: 5,
  probabilityLabels: ["Muy baja", "Baja", "Media", "Alta", "Muy alta"],
  impactLabels: ["Insignificante", "Menor", "Moderada", "Mayor", "Crítica"],
  levels: [
    { min: 15, label: "Crítico", className: "bg-rose-100 text-rose-700" },
    { min: 9, label: "Alto", className: "bg-orange-100 text-orange-700" },
    { min: 4, label: "Medio", className: "bg-amber-100 text-amber-800" },
    { min: 0, label: "Bajo", className: "bg-emerald-100 text-emerald-700" },
  ],
};

/**
 * Lee la configuración guardada en la matriz o en el requisito. Cualquier
 * cosa que no encaje cae a la configuración por defecto: una matriz con un
 * `config` corrupto debe seguir abriéndose, no romper la pantalla.
 */
export function parseRiskConfig(raw: unknown): RiskMatrixConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_RISK_CONFIG;
  const c = raw as Partial<RiskMatrixConfig>;
  const levels = Array.isArray(c.levels)
    ? c.levels.filter(
        (l): l is RiskMatrixConfig["levels"][number] =>
          Boolean(l) &&
          typeof l.min === "number" &&
          typeof l.label === "string" &&
          typeof l.className === "string",
      )
    : [];
  return {
    scaleMax:
      typeof c.scaleMax === "number" && c.scaleMax >= 2 && c.scaleMax <= 10
        ? c.scaleMax
        : DEFAULT_RISK_CONFIG.scaleMax,
    probabilityLabels: Array.isArray(c.probabilityLabels)
      ? c.probabilityLabels.filter((l): l is string => typeof l === "string")
      : DEFAULT_RISK_CONFIG.probabilityLabels,
    impactLabels: Array.isArray(c.impactLabels)
      ? c.impactLabels.filter((l): l is string => typeof l === "string")
      : DEFAULT_RISK_CONFIG.impactLabels,
    levels: levels.length ? levels : DEFAULT_RISK_CONFIG.levels,
  };
}

export function riskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function riskLevel(
  score: number,
  config: RiskMatrixConfig = DEFAULT_RISK_CONFIG,
): { label: string; className: string } {
  const ordered = [...config.levels].sort((a, b) => b.min - a.min);
  for (const level of ordered) {
    if (score >= level.min) return { label: level.label, className: level.className };
  }
  const last = ordered[ordered.length - 1];
  return last
    ? { label: last.label, className: last.className }
    : { label: "—", className: "bg-slate-100 text-slate-700" };
}

export const RISK_ITEM_TYPE_LABEL: Record<RiskItemType, string> = {
  RISK: "Riesgo",
  OPPORTUNITY: "Oportunidad",
};

// ─── Avance de la empresa ────────────────────────────────────────────────────

export interface ManualProgress {
  totalItems: number;
  checkedItems: number;
  totalRequirements: number;
  approvedRequirements: number;
  /** 0–100 combinando checklist y evidencias aprobadas. */
  percent: number;
}

/**
 * Avance de implantación de una empresa.
 *
 * Cuenta ítems marcados y requisitos aprobados en un solo porcentaje, en vez
 * de dos barras: para el cliente "cuánto llevo del manual" es una sola
 * pregunta, y las evidencias aprobadas son la parte que de verdad certifica.
 */
export function manualProgress(input: {
  totalItems: number;
  checkedItems: number;
  totalRequirements: number;
  approvedRequirements: number;
}): ManualProgress {
  const total = input.totalItems + input.totalRequirements;
  const done = input.checkedItems + input.approvedRequirements;
  return {
    ...input,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
