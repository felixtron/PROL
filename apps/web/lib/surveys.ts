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
  allowNotApplicable?: boolean;
}

export interface AggregatableAnswer {
  questionId: string;
  ratingValue: number | null;
  selectedOptionIndex: number | null;
  text?: string | null;
  notApplicable?: boolean;
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
  /** Promedio normalizado a 0–100. Estrellas y escala etiquetada. */
  score: number | null;
  /** Estrellas: 5 cubos (1★…5★). Opción/escala: un cubo por opción. */
  distribution: number[];
  /** Cuántos marcaron "No aplica". Quedan fuera del promedio. */
  notApplicableCount: number;
  /**
   * Respuestas de texto libre. Son datos individuales: `aggregate()` solo
   * las rellena cuando se le pide explícitamente, y quien lo pide es el
   * panel del administrador. El consolidado que ve el cliente las recibe
   * siempre vacías.
   */
  textAnswers: string[];
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
 * Puntuación 0–100 de una opción de escala etiquetada.
 *
 * Las opciones van ordenadas de mejor a peor, así que la primera vale 100 y
 * la última 0, repartiendo el resto en partes iguales. Con las cuatro de
 * Ibiza (Excelente/Bueno/Regular/Deficiente) sale 100 / 66.7 / 33.3 / 0.
 */
export function scaleOptionScore(index: number, optionCount: number): number {
  if (optionCount <= 1) return 100;
  return (100 * (optionCount - 1 - index)) / (optionCount - 1);
}

/**
 * Estadística por pregunta, por sección e índice general.
 *
 * Puntúan al índice las preguntas con un orden de "mejor a peor" conocido:
 * estrellas y escala etiquetada. La opción múltiple aporta su distribución
 * al informe pero no puntúa, porque ahí el sistema no sabe cuál opción es
 * "buena"; el texto libre tampoco. `weight = 0` saca a una pregunta del
 * índice sin sacarla del informe.
 *
 * Los "No aplica" se cuentan aparte y no entran en el promedio: marcar que
 * un ítem no aplica no debe bajar la puntuación, igual que en el formulario
 * en papel.
 *
 * `opts.includeText` es lo único que destapa las respuestas de texto libre.
 * Va apagado por defecto a propósito: son datos individuales y el
 * consolidado que ve el cliente nunca debe llevarlos.
 */
export function aggregate(
  questions: AggregatableQuestion[],
  answers: AggregatableAnswer[],
  totalResponses: number,
  opts: { includeText?: boolean } = {},
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
    const base = {
      id: q.id,
      label: q.label,
      section,
      type: q.type,
      weight: q.weight,
    };

    if (q.type === "OPEN_TEXT") {
      const texts = rows
        .map((r) => r.text?.trim())
        .filter((t): t is string => Boolean(t));
      return {
        ...base,
        options: [],
        answeredCount: texts.length,
        average: null,
        score: null,
        distribution: [],
        notApplicableCount: 0,
        // Solo el administrador recibe los verbatims. Por defecto van
        // vacíos para que un consolidado publicado no pueda filtrarlos
        // aunque alguien olvide filtrarlos aguas abajo.
        textAnswers: opts.includeText ? texts : [],
      };
    }

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
        ...base,
        options: [],
        answeredCount: count,
        average,
        score: average !== null ? ratingToScore(average) : null,
        distribution,
        notApplicableCount: 0,
        textAnswers: [],
      };
    }

    // MULTIPLE_CHOICE y SCALE_LABELED comparten almacenamiento: la
    // diferencia es que la escala tiene un orden conocido, así que puntúa.
    const options = toOptions(q.options);
    const distribution = new Array<number>(options.length).fill(0);
    let count = 0;
    let notApplicableCount = 0;
    for (const r of rows) {
      if (r.notApplicable) {
        notApplicableCount += 1;
        continue;
      }
      const idx = r.selectedOptionIndex;
      if (typeof idx !== "number" || idx < 0 || idx >= distribution.length) continue;
      distribution[idx] = (distribution[idx] ?? 0) + 1;
      count += 1;
    }

    let score: number | null = null;
    if (q.type === "SCALE_LABELED" && count > 0) {
      // Promedio de las puntuaciones de cada opción elegida. Los "No aplica"
      // ya quedaron fuera del conteo, así que no arrastran el resultado.
      let sum = 0;
      for (let i = 0; i < distribution.length; i += 1) {
        sum += (distribution[i] ?? 0) * scaleOptionScore(i, options.length);
      }
      score = sum / count;
    }

    return {
      ...base,
      options,
      answeredCount: count,
      average: null,
      score,
      distribution,
      notApplicableCount,
      textAnswers: [],
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
