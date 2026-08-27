// Cálculo puro del módulo de Encuestas: ventana de respuesta y agregación
// ponderada. Sin acceso a base de datos a propósito — las mismas funciones
// las usan las queries del administrador, la página de resultados publicados
// y el informe consolidado, y así los tres números coinciden siempre.

import type { SurveyQuestionType } from "@prol/db";

/** Duración por defecto de un lanzamiento, en días. Editable al lanzar. */
export const DEFAULT_DURATION_DAYS = 30;
/** Límites de la duración editable. */
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 365;
/** Recordatorios por defecto: días antes del cierre. */
export const DEFAULT_REMINDER_DAYS = [7, 2];
/** Escala de las preguntas de estrellas. */
export const RATING_MAX = 5;

export type CampaignState =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "EXPIRED"
  | "CLOSED"
  | "CANCELLED";

export interface CampaignWindow {
  status: string;
  opensAt: Date;
  closesAt: Date;
}

/**
 * Estado real de un lanzamiento en un instante dado.
 *
 * `EXPIRED` es el caso importante: la campaña sigue marcada ACTIVE en la
 * base porque el barrido de cierre todavía no corrió, pero la fecha ya pasó.
 * Resolverlo aquí —y no confiar en la columna— es lo que garantiza que una
 * encuesta vencida deje de aceptar respuestas aunque el cron esté caído.
 */
export function campaignState(
  campaign: CampaignWindow,
  now: Date = new Date(),
): CampaignState {
  if (campaign.status === "CANCELLED") return "CANCELLED";
  if (campaign.status === "CLOSED") return "CLOSED";
  if (campaign.status === "DRAFT") return "DRAFT";
  if (now < campaign.opensAt) return "SCHEDULED";
  if (now > campaign.closesAt) return "EXPIRED";
  return "OPEN";
}

/** ¿Acepta respuestas nuevas ahora mismo? */
export function isCampaignOpen(
  campaign: CampaignWindow,
  now: Date = new Date(),
): boolean {
  return campaignState(campaign, now) === "OPEN";
}

export const CAMPAIGN_STATE_LABEL: Record<CampaignState, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  OPEN: "Abierta",
  EXPIRED: "Vencida",
  CLOSED: "Cerrada",
  CANCELLED: "Anulada",
};

/** Días restantes (hacia arriba) hasta el cierre. Negativo si ya venció. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

// ─── Agregación ──────────────────────────────────────────────────────────────

export const UNSECTIONED = "General";

export interface AggregatableQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
  section: string | null;
  weight: number;
  options: unknown;
  position: number;
}

export interface AggregatableAnswer {
  questionId: string;
  ratingValue: number | null;
  selectedOptionIndex: number | null;
}

export interface QuestionStats {
  id: string;
  label: string;
  section: string;
  type: SurveyQuestionType;
  weight: number;
  options: string[];
  answeredCount: number;
  /** Promedio 1–5. Solo para preguntas de estrellas. */
  average: number | null;
  /** Promedio normalizado a 0–100. Solo para preguntas de estrellas. */
  score: number | null;
  /** Estrellas: 5 cubos (1★…5★). Opción múltiple: un cubo por opción. */
  distribution: number[];
}

export interface SectionStats {
  name: string;
  questionCount: number;
  answeredCount: number;
  /** Índice 0–100 ponderado por `weight`. Null si la sección no puntúa. */
  score: number | null;
}

export interface AggregatedResults {
  totalResponses: number;
  /** Índice general de satisfacción 0–100, ponderado por `weight`. */
  satisfactionIndex: number | null;
  sections: SectionStats[];
  questions: QuestionStats[];
}

function toOptions(raw: unknown): string[] {
  return Array.isArray(raw)
    ? (raw as unknown[]).filter((o): o is string => typeof o === "string")
    : [];
}

/** Convierte un promedio de estrellas (1–5) a un índice 0–100. */
export function ratingToScore(average: number): number {
  return ((average - 1) / (RATING_MAX - 1)) * 100;
}

/**
 * Estadística por pregunta, por sección e índice general.
 *
 * El índice de satisfacción solo lo alimentan las preguntas de estrellas:
 * son las únicas con un orden de "mejor a peor" conocido. Una pregunta de
 * opción múltiple aporta su distribución al informe pero no puntúa, porque
 * el sistema no sabe qué opción es "buena". `weight = 0` saca a una pregunta
 * del índice sin sacarla del informe.
 */
export function aggregate(
  questions: AggregatableQuestion[],
  answers: AggregatableAnswer[],
  totalResponses: number,
): AggregatedResults {
  const byQuestion = new Map<string, AggregatableAnswer[]>();
  for (const a of answers) {
    const bucket = byQuestion.get(a.questionId);
    if (bucket) bucket.push(a);
    else byQuestion.set(a.questionId, [a]);
  }

  const ordered = [...questions].sort((a, b) => a.position - b.position);

  const stats: QuestionStats[] = ordered.map((q) => {
    const rows = byQuestion.get(q.id) ?? [];
    const section = q.section?.trim() || UNSECTIONED;

    if (q.type === "RATING_STARS") {
      const distribution = [0, 0, 0, 0, 0];
      let sum = 0;
      let count = 0;
      for (const r of rows) {
        const v = r.ratingValue;
        if (typeof v !== "number" || v < 1 || v > RATING_MAX) continue;
        sum += v;
        count += 1;
        distribution[v - 1] = (distribution[v - 1] ?? 0) + 1;
      }
      const average = count ? sum / count : null;
      return {
        id: q.id,
        label: q.label,
        section,
        type: q.type,
        weight: q.weight,
        options: [],
        answeredCount: count,
        average,
        score: average !== null ? ratingToScore(average) : null,
        distribution,
      };
    }

    const options = toOptions(q.options);
    const distribution = new Array<number>(options.length).fill(0);
    let count = 0;
    for (const r of rows) {
      const idx = r.selectedOptionIndex;
      if (typeof idx !== "number" || idx < 0 || idx >= distribution.length) continue;
      distribution[idx] = (distribution[idx] ?? 0) + 1;
      count += 1;
    }
    return {
      id: q.id,
      label: q.label,
      section,
      type: q.type,
      weight: q.weight,
      options,
      answeredCount: count,
      average: null,
      score: null,
      distribution,
    };
  });

  // Índice por sección y general: media ponderada de los `score` disponibles.
  const sectionOrder: string[] = [];
  const sectionRows = new Map<string, QuestionStats[]>();
  for (const s of stats) {
    const bucket = sectionRows.get(s.section);
    if (bucket) bucket.push(s);
    else {
      sectionRows.set(s.section, [s]);
      sectionOrder.push(s.section);
    }
  }

  const weightedScore = (rows: QuestionStats[]): number | null => {
    let num = 0;
    let den = 0;
    for (const r of rows) {
      if (r.score === null || r.weight <= 0 || r.answeredCount === 0) continue;
      num += r.score * r.weight;
      den += r.weight;
    }
    return den > 0 ? num / den : null;
  };

  const sections: SectionStats[] = sectionOrder.map((name) => {
    const rows = sectionRows.get(name) ?? [];
    return {
      name,
      questionCount: rows.length,
      answeredCount: rows.reduce((max, r) => Math.max(max, r.answeredCount), 0),
      score: weightedScore(rows),
    };
  });

  return {
    totalResponses,
    satisfactionIndex: weightedScore(stats),
    sections,
    questions: stats,
  };
}

/**
 * Combina índices de varias campañas ponderando por número de respuestas.
 * Sin esto, un lanzamiento con 2 respuestas pesaría lo mismo que uno con 200
 * en el informe por curso, empresa o periodo.
 */
export function weightedIndex(
  entries: Array<{ satisfactionIndex: number | null; totalResponses: number }>,
): number | null {
  let num = 0;
  let den = 0;
  for (const e of entries) {
    if (e.satisfactionIndex === null || e.totalResponses <= 0) continue;
    num += e.satisfactionIndex * e.totalResponses;
    den += e.totalResponses;
  }
  return den > 0 ? num / den : null;
}

// ─── Contexto mostrado al destinatario ───────────────────────────────────────

export interface CampaignContextSource {
  company?: { name: string } | null;
  course?: { title: string } | null;
  workshop?: { title: string } | null;
  advisorySession?: { title: string } | null;
  projectLabel?: string | null;
}

export interface CampaignContext {
  companyName: string | null;
  /** Curso, workshop, sesión o proyecto asociado. */
  subject: string | null;
  subjectKind: "Curso" | "Workshop" | "Consultoría" | "Proyecto" | null;
  /** Línea lista para el correo y el panel. */
  line: string;
}

/**
 * Empresa + curso/proyecto/evento de un lanzamiento, en una línea. El correo
 * y el panel del usuario lo muestran para que nadie tenga que adivinar de
 * qué encuesta se trata cuando le llegan varias.
 */
export function describeCampaignContext(
  src: CampaignContextSource,
): CampaignContext {
  const companyName = src.company?.name ?? null;
  let subject: string | null = null;
  let subjectKind: CampaignContext["subjectKind"] = null;
  if (src.course?.title) {
    subject = src.course.title;
    subjectKind = "Curso";
  } else if (src.workshop?.title) {
    subject = src.workshop.title;
    subjectKind = "Workshop";
  } else if (src.advisorySession?.title) {
    subject = src.advisorySession.title;
    subjectKind = "Consultoría";
  } else if (src.projectLabel?.trim()) {
    subject = src.projectLabel.trim();
    subjectKind = "Proyecto";
  }

  const parts: string[] = [];
  if (companyName) parts.push(companyName);
  if (subject) parts.push(`${subjectKind}: ${subject}`);

  return {
    companyName,
    subject,
    subjectKind,
    line: parts.join(" · "),
  };
}
