// Despacho del módulo de Gestión Documental: alta de actividades al activar
// un manual, programación del siguiente ciclo al aprobar una evidencia,
// notificaciones de revisión y barrido de recordatorios.
//
// Este archivo NO es `"use server"` a propósito. En el App Router cada export
// async de un módulo `"use server"` queda expuesto como RPC; si estas
// funciones vivieran ahí, un cliente autenticado podría mandar correos o
// programar actividades invocándolas con un id arbitrario. Los llamadores
// (server actions ya autorizadas y la ruta de cron) las importan directamente.

import { db } from "@prol/db";
import {
  activityReminderEmail,
  evidenceDeletionRequestedEmail,
  evidenceReviewedEmail,
  evidenceSubmittedEmail,
  sendBulkEmail,
} from "@prol/email";
import { APP_TIME_ZONE } from "@/lib/timezone";
import { createNotification } from "@/lib/notifications";
import { daysUntil, nextDueDate, periodLabel } from "@/lib/compliance";
import { APP_URL } from "@/lib/brand";

function appUrl(): string {
  return APP_URL;
}

/** Enlace del cliente a una sección de su manual. */
export function sectionUrl(assignmentId: string, sectionId: string): string {
  return `${appUrl()}/dashboard/manuals/${assignmentId}/sections/${sectionId}`;
}

/** Enlace del consultor a la ficha de revisión de una evidencia. */
export function evidenceReviewUrl(evidenceId: string): string {
  return `${appUrl()}/tenant-admin/evidence/${evidenceId}`;
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function log(
  level: "info" | "warn" | "error",
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const record = {
    ts: new Date().toISOString(),
    level,
    component: "compliance",
    msg,
    ...fields,
  };
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "log"](JSON.stringify(record));
  } else {
    console[level === "error" ? "error" : "log"](
      `[${level}] [compliance] ${msg}`,
      fields,
    );
  }
}

// ─── Alta y programación de actividades ──────────────────────────────────────

/**
 * Crea la primera actividad de cada requisito del manual para una empresa.
 *
 * Se crean por adelantado, y no cuando alguien entrega algo, porque la agenda
 * tiene que poder decir "esto es lo que te falta" desde el primer día. Son del
 * orden de cien filas por empresa: no compensa hacerlo perezoso.
 *
 * `skipDuplicates` la hace repetible: si el manual gana requisitos nuevos
 * después de activarse, volver a llamarla añade sólo lo que falta.
 */
export async function createActivitiesForAssignment(
  assignmentId: string,
  manualId: string,
): Promise<number> {
  const requirements = await db.evidenceRequirement.findMany({
    where: { section: { chapter: { manualId } } },
    select: { id: true, reminderDaysBefore: true },
  });
  if (!requirements.length) return 0;

  const result = await db.complianceActivity.createMany({
    data: requirements.map((r) => ({
      assignmentId,
      requirementId: r.id,
      periodNumber: 1,
      reminderDaysBefore: r.reminderDaysBefore,
    })),
    skipDuplicates: true,
  });
  log("info", "actividades creadas", { assignmentId, count: result.count });
  return result.count;
}

/**
 * Cierra la actividad aprobada y abre la del ciclo siguiente si el requisito
 * es periódico.
 *
 * El siguiente ciclo es una actividad NUEVA, no una versión más de la misma:
 * lo que se aprobó este semestre sigue siendo el registro válido de este
 * semestre, y mezclarlos haría imposible responder "¿qué entregamos en 2026-S1?".
 */
export async function completeActivityAndScheduleNext(
  activityId: string,
  approvedAt: Date,
): Promise<{ nextDueAt: Date | null }> {
  const activity = await db.complianceActivity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      assignmentId: true,
      requirementId: true,
      periodNumber: true,
      requirement: {
        select: { periodicity: true, reminderDaysBefore: true },
      },
    },
  });
  if (!activity) return { nextDueAt: null };

  await db.complianceActivity.update({
    where: { id: activityId },
    data: { status: "COMPLETED", completedAt: approvedAt },
  });

  const periodicity = activity.requirement.periodicity;
  const nextDueAt = nextDueDate(periodicity, approvedAt);
  if (!nextDueAt) return { nextDueAt: null };

  // `skipDuplicates` en vez de un create a secas: dos aprobaciones seguidas
  // sobre el mismo ciclo (una corrección aprobada dos veces por carrera) no
  // deben abrir dos actividades para el mismo periodo.
  await db.complianceActivity.createMany({
    data: [
      {
        assignmentId: activity.assignmentId,
        requirementId: activity.requirementId,
        periodNumber: activity.periodNumber + 1,
        periodLabel: periodLabel(periodicity, nextDueAt),
        dueAt: nextDueAt,
        reminderDaysBefore: activity.requirement.reminderDaysBefore,
      },
    ],
    skipDuplicates: true,
  });
  log("info", "siguiente ciclo programado", {
    activityId,
    nextDueAt: nextDueAt.toISOString(),
  });
  return { nextDueAt };
}

// ─── Destinatarios ───────────────────────────────────────────────────────────

interface Recipient {
  email: string;
  name: string | null;
  userId: string;
}

/**
 * A quién avisa una evidencia del lado de la consultora: al consultor
 * asignado, y si no hay ninguno, a todos los administradores del tenant.
 */
async function reviewersFor(assignment: {
  tenantId: string;
  consultantId: string | null;
}): Promise<Recipient[]> {
  if (assignment.consultantId) {
    const consultant = await db.user.findUnique({
      where: { id: assignment.consultantId },
      select: { id: true, email: true, name: true, disabledAt: true },
    });
    if (consultant && !consultant.disabledAt) {
      return [{ email: consultant.email, name: consultant.name, userId: consultant.id }];
    }
  }
  const admins = await db.user.findMany({
    where: { tenantId: assignment.tenantId, role: "ADMIN", disabledAt: null },
    select: { id: true, email: true, name: true },
  });
  return admins.map((a) => ({ email: a.email, name: a.name, userId: a.id }));
}

/** Quién recibe del lado del cliente: el líder de la empresa y, si procede, quien entregó. */
async function companyRecipients(
  companyId: string,
  extraUserId?: string | null,
): Promise<Recipient[]> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      leader: { select: { id: true, email: true, name: true, disabledAt: true } },
    },
  });
  const out: Recipient[] = [];
  const leader = company?.leader;
  if (leader && !leader.disabledAt) {
    out.push({ email: leader.email, name: leader.name, userId: leader.id });
  }
  if (extraUserId && extraUserId !== leader?.id) {
    const user = await db.user.findUnique({
      where: { id: extraUserId },
      select: { id: true, email: true, name: true, disabledAt: true },
    });
    if (user && !user.disabledAt) {
      out.push({ email: user.email, name: user.name, userId: user.id });
    }
  }
  return out;
}

interface EvidenceContext {
  evidenceId: string;
  assignmentId: string;
  sectionId: string;
  tenantId: string;
  tenantName: string;
  companyId: string;
  companyName: string;
  manualTitle: string;
  sectionTitle: string;
  requirementName: string;
  consultantId: string | null;
}

/**
 * Carga de una vez todo el contexto que necesitan los correos y las
 * notificaciones de una evidencia. Sin esto, cada aviso repetiría la misma
 * cadena de joins evidencia → actividad → requisito → sección → manual.
 */
export async function loadEvidenceContext(
  evidenceId: string,
): Promise<EvidenceContext | null> {
  const evidence = await db.evidence.findUnique({
    where: { id: evidenceId },
    select: {
      id: true,
      assignmentId: true,
      assignment: {
        select: {
          tenantId: true,
          companyId: true,
          consultantId: true,
          tenant: { select: { name: true } },
          company: { select: { name: true } },
          manual: { select: { title: true } },
        },
      },
      activity: {
        select: {
          requirement: {
            select: {
              name: true,
              section: { select: { id: true, title: true, code: true } },
            },
          },
        },
      },
    },
  });
  if (!evidence) return null;
  const req = evidence.activity.requirement;
  return {
    evidenceId: evidence.id,
    assignmentId: evidence.assignmentId,
    sectionId: req.section.id,
    tenantId: evidence.assignment.tenantId,
    tenantName: evidence.assignment.tenant.name,
    companyId: evidence.assignment.companyId,
    companyName: evidence.assignment.company.name,
    manualTitle: evidence.assignment.manual.title,
    sectionTitle: req.section.code
      ? `${req.section.code} — ${req.section.title}`
      : req.section.title,
    requirementName: req.name,
    consultantId: evidence.assignment.consultantId,
  };
}

// ─── Notificaciones del ciclo ────────────────────────────────────────────────

/** Avisa a los revisores de que hay una evidencia esperando. */
export async function notifyEvidenceSubmitted(
  ctx: EvidenceContext,
  submittedByName: string,
): Promise<void> {
  const recipients = await reviewersFor({
    tenantId: ctx.tenantId,
    consultantId: ctx.consultantId,
  });
  if (!recipients.length) return;

  const link = `/tenant-admin/evidence/${ctx.evidenceId}`;
  await Promise.all(
    recipients.map((r) =>
      createNotification({
        userId: r.userId,
        tenantId: ctx.tenantId,
        type: "DOCUMENT",
        title: "Evidencia por revisar",
        message: `${ctx.companyName} entregó "${ctx.requirementName}"`,
        link,
      }).catch((err) => log("warn", "notificación fallida", { err: String(err) })),
    ),
  );

  await sendBulkEmail(
    recipients.map((r) => ({
      to: r.email,
      ...evidenceSubmittedEmail({
        tenantName: ctx.tenantName,
        recipientName: r.name,
        companyName: ctx.companyName,
        manualTitle: ctx.manualTitle,
        sectionTitle: ctx.sectionTitle,
        requirementName: ctx.requirementName,
        submittedByName,
        reviewUrl: evidenceReviewUrl(ctx.evidenceId),
      }),
    })),
  );
}

/** Avisa al cliente del resultado de la revisión. */
export async function notifyEvidenceReviewed(
  ctx: EvidenceContext,
  opts: {
    approved: boolean;
    comment?: string | null;
    reviewerName: string;
    uploadedById?: string | null;
    nextDueAt?: Date | null;
  },
): Promise<void> {
  const recipients = await companyRecipients(ctx.companyId, opts.uploadedById);
  if (!recipients.length) return;

  const link = `/dashboard/manuals/${ctx.assignmentId}/sections/${ctx.sectionId}`;
  await Promise.all(
    recipients.map((r) =>
      createNotification({
        userId: r.userId,
        tenantId: ctx.tenantId,
        type: "DOCUMENT",
        title: opts.approved ? "Evidencia aprobada" : "Requiere corrección",
        message: `${ctx.requirementName} — ${ctx.sectionTitle}`,
        link,
      }).catch((err) => log("warn", "notificación fallida", { err: String(err) })),
    ),
  );

  await sendBulkEmail(
    recipients.map((r) => ({
      to: r.email,
      ...evidenceReviewedEmail({
        tenantName: ctx.tenantName,
        recipientName: r.name,
        manualTitle: ctx.manualTitle,
        sectionTitle: ctx.sectionTitle,
        requirementName: ctx.requirementName,
        approved: opts.approved,
        comment: opts.comment,
        reviewerName: opts.reviewerName,
        sectionUrl: sectionUrl(ctx.assignmentId, ctx.sectionId),
        nextReviewLabel: opts.nextDueAt ? formatDay(opts.nextDueAt) : null,
      }),
    })),
  );
}

/** Avisa a quien puede resolver una solicitud de eliminación. */
export async function notifyDeletionRequested(
  ctx: EvidenceContext,
  opts: { requestedByName: string; reason?: string | null },
): Promise<void> {
  // La baja sólo la resuelve un administrador, así que aquí no vale el
  // consultor-profesor: se avisa a los administradores del tenant.
  const admins = await db.user.findMany({
    where: { tenantId: ctx.tenantId, role: "ADMIN", disabledAt: null },
    select: { id: true, email: true, name: true },
  });
  if (!admins.length) return;

  const link = `/tenant-admin/evidence/${ctx.evidenceId}`;
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        tenantId: ctx.tenantId,
        type: "DOCUMENT",
        title: "Solicitud de eliminación",
        message: `${ctx.companyName} — ${ctx.requirementName}`,
        link,
      }).catch((err) => log("warn", "notificación fallida", { err: String(err) })),
    ),
  );

  await sendBulkEmail(
    admins.map((a) => ({
      to: a.email,
      ...evidenceDeletionRequestedEmail({
        tenantName: ctx.tenantName,
        recipientName: a.name,
        companyName: ctx.companyName,
        requirementName: ctx.requirementName,
        requestedByName: opts.requestedByName,
        reason: opts.reason,
        reviewUrl: evidenceReviewUrl(ctx.evidenceId),
      }),
    })),
  );
}

/** Avisa al cliente de que su empresa tiene un manual nuevo activo. */
export async function notifyManualActivated(input: {
  assignmentId: string;
  tenantId: string;
  companyId: string;
  manualTitle: string;
}): Promise<void> {
  const recipients = await companyRecipients(input.companyId);
  if (!recipients.length) return;
  await Promise.all(
    recipients.map((r) =>
      createNotification({
        userId: r.userId,
        tenantId: input.tenantId,
        type: "DOCUMENT",
        title: "Nuevo manual disponible",
        message: input.manualTitle,
        link: `/dashboard/manuals/${input.assignmentId}`,
      }).catch((err) => log("warn", "notificación fallida", { err: String(err) })),
    ),
  );
}

// ─── Recordatorios ───────────────────────────────────────────────────────────

/**
 * Barrido de recordatorios de actividades con fecha comprometida.
 *
 * Idempotente por diseño: `remindersSent` funciona como cursor sobre los
 * umbrales configurados. Se calcula cuántos umbrales ya se cruzaron y sólo se
 * avisa a quien lleva menos avisos que umbrales cruzados, actualizando el
 * contador en la misma pasada. Correr el barrido varias veces el mismo día no
 * manda nada de más; que no corra un día sólo retrasa el aviso, nunca lo pierde.
 */
export async function sendActivityReminders(
  now: Date = new Date(),
): Promise<{ activities: number; emails: number }> {
  const horizon = new Date(now.getTime() + 60 * 86_400_000);
  const activities = await db.complianceActivity.findMany({
    where: {
      status: "OPEN",
      dueAt: { not: null, lte: horizon },
      assignment: { status: "ACTIVE" },
    },
    select: {
      id: true,
      dueAt: true,
      reminderDaysBefore: true,
      remindersSent: true,
      assignment: {
        select: {
          id: true,
          tenantId: true,
          companyId: true,
          tenant: { select: { name: true, documentsEnabled: true } },
          company: { select: { name: true } },
          manual: { select: { title: true } },
        },
      },
      requirement: {
        select: {
          name: true,
          section: { select: { id: true, title: true, code: true } },
        },
      },
    },
  });

  let touched = 0;
  let emails = 0;

  for (const activity of activities) {
    const dueAt = activity.dueAt;
    if (!dueAt) continue;
    if (!activity.assignment.tenant.documentsEnabled) continue;

    const left = daysUntil(dueAt, now);
    // Umbrales de mayor a menor: cuántos ya se cruzaron.
    const thresholds = [...activity.reminderDaysBefore].sort((a, b) => b - a);
    const due = thresholds.filter((t) => left <= t).length;
    if (due <= activity.remindersSent) continue;

    const recipients = await companyRecipients(activity.assignment.companyId);
    if (recipients.length) {
      const section = activity.requirement.section;
      const sent = await sendBulkEmail(
        recipients.map((r) => ({
          to: r.email,
          ...activityReminderEmail({
            tenantName: activity.assignment.tenant.name,
            recipientName: r.name,
            companyName: activity.assignment.company.name,
            manualTitle: activity.assignment.manual.title,
            sectionTitle: section.code
              ? `${section.code} — ${section.title}`
              : section.title,
            requirementName: activity.requirement.name,
            dueAtLabel: formatDay(dueAt),
            daysLeft: left,
            sectionUrl: sectionUrl(activity.assignment.id, section.id),
          }),
        })),
      );
      emails += sent ?? 0;

      await Promise.all(
        recipients.map((r) =>
          createNotification({
            userId: r.userId,
            tenantId: activity.assignment.tenantId,
            type: "DOCUMENT",
            title: "Actividad próxima a vencer",
            message: `${activity.requirement.name} — vence ${formatDay(dueAt)}`,
            link: `/dashboard/manuals/${activity.assignment.id}/sections/${section.id}`,
          }).catch((err) =>
            log("warn", "notificación fallida", { err: String(err) }),
          ),
        ),
      );
    }

    // El contador sube aunque no hubiera destinatarios: si la empresa no
    // tiene líder, insistir cada día tampoco lo va a crear.
    await db.complianceActivity.update({
      where: { id: activity.id },
      data: { remindersSent: due, lastRemindedAt: now },
    });
    touched += 1;
  }

  log("info", "barrido de recordatorios", { activities: touched, emails });
  return { activities: touched, emails };
}
