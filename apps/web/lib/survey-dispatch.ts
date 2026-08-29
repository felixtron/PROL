// Despacho del módulo de Encuestas: destinatarios, envíos, recordatorios,
// cierre por vencimiento y disparadores automáticos.
//
// Este archivo NO es `"use server"` a propósito. En el App Router cada export
// async de un módulo `"use server"` queda expuesto como RPC; si estas
// funciones vivieran ahí, un cliente autenticado podría mandar correos o
// cerrar campañas invocándolas con un id arbitrario. Los llamadores
// (server actions ya autorizadas, la ruta de cron y el emisor de diplomas)
// las importan directamente.

import { randomBytes } from "crypto";
import { db, type Prisma } from "@prol/db";
import {
  sendBulkEmail,
  surveyInvitationEmail,
  surveyReminderEmail,
  surveyResultsPublishedEmail,
} from "@prol/email";
import { APP_TIME_ZONE } from "@/lib/timezone";
import { campaignState, daysUntil } from "@/lib/surveys";

/** Token URL-safe de 32 caracteres para enlaces de respuesta y resultados. */
export function surveyToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
}

/** Enlace personal de respuesta de un destinatario. */
export function answerUrl(token: string): string {
  return `${appUrl()}/surveys/answer/${token}`;
}

/** Enlace compartible de un lanzamiento (identificación por correo). */
export function shareUrl(token: string): string {
  return `${appUrl()}/surveys/open/${token}`;
}

/** Enlace de sólo lectura del consolidado publicado. */
export function resultsUrl(token: string): string {
  return `${appUrl()}/surveys/results/${token}`;
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  const record = { ts: new Date().toISOString(), level, component: "surveys", msg, ...fields };
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "log"](JSON.stringify(record));
  } else {
    console[level === "error" ? "error" : "log"](`[${level}] [surveys] ${msg}`, fields);
  }
}

// ─── Destinatarios ───────────────────────────────────────────────────────────

const CAMPAIGN_FOR_DISPATCH = {
  id: true,
  tenantId: true,
  name: true,
  audience: true,
  companyId: true,
  status: true,
  opensAt: true,
  closesAt: true,
  reminderDaysBefore: true,
  projectLabel: true,
  survey: { select: { id: true, title: true, description: true } },
  company: { select: { id: true, name: true, leaderId: true } },
  course: { select: { title: true } },
  workshop: { select: { title: true } },
  advisorySession: { select: { title: true } },
  tenant: { select: { name: true } },
} satisfies Prisma.SurveyCampaignSelect;

type CampaignForDispatch = Prisma.SurveyCampaignGetPayload<{
  select: typeof CAMPAIGN_FOR_DISPATCH;
}>;

async function loadCampaign(campaignId: string): Promise<CampaignForDispatch> {
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    select: CAMPAIGN_FOR_DISPATCH,
  });
  if (!campaign) throw new Error("Lanzamiento no encontrado");
  return campaign;
}

/**
 * Usuarios que determina la audiencia del lanzamiento.
 *
 * SPECIFIC_USERS no se resuelve aquí: esa lista la fija el administrador a
 * mano y vive ya en la tabla de destinatarios. Las otras dos audiencias se
 * recalculan en cada sincronización para que un alta en la empresa entre en
 * un lanzamiento que todavía no se envió.
 */
async function resolveAudienceUsers(campaign: CampaignForDispatch) {
  if (!campaign.companyId) return [];

  if (campaign.audience === "COMPANY_LEADER") {
    const leaderId = campaign.company?.leaderId;
    if (!leaderId) return [];
    const leader = await db.user.findFirst({
      where: { id: leaderId, disabledAt: null },
      select: { id: true, email: true, name: true },
    });
    return leader ? [leader] : [];
  }

  if (campaign.audience === "COMPANY_ALL") {
    return db.user.findMany({
      where: {
        companyId: campaign.companyId,
        tenantId: campaign.tenantId,
        disabledAt: null,
      },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    });
  }

  return [];
}

/**
 * Crea los destinatarios que falten según la audiencia. Idempotente: nunca
 * duplica ni pisa el token de alguien que ya recibió su enlace.
 */
export async function syncCampaignRecipients(campaignId: string): Promise<number> {
  const campaign = await loadCampaign(campaignId);
  const users = await resolveAudienceUsers(campaign);
  if (users.length === 0) return 0;

  const existing = await db.surveyRecipient.findMany({
    where: { campaignId },
    select: { email: true },
  });
  const known = new Set(existing.map((r) => r.email.toLowerCase()));

  const toCreate = users
    .filter((u) => !known.has(u.email.toLowerCase()))
    .map((u) => ({
      campaignId,
      userId: u.id,
      email: u.email.toLowerCase(),
      name: u.name,
      token: surveyToken(),
    }));
  if (toCreate.length === 0) return 0;

  const res = await db.surveyRecipient.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return res.count;
}

/**
 * Fija la lista de destinatarios concretos (audiencia SPECIFIC_USERS).
 *
 * Los que se quitan quedan REVOKED en vez de borrarse: si ya respondieron,
 * borrarlos perdería la respuesta, y si ya recibieron el correo, revocar es
 * lo que invalida su enlace.
 */
export async function setSpecificRecipients(
  campaignId: string,
  userIds: string[],
): Promise<{ added: number; revoked: number }> {
  const campaign = await loadCampaign(campaignId);

  const users = await db.user.findMany({
    where: {
      id: { in: userIds },
      tenantId: campaign.tenantId,
      disabledAt: null,
      // Aislamiento: si el lanzamiento apunta a una empresa, sólo entran
      // personas de esa empresa.
      ...(campaign.companyId ? { companyId: campaign.companyId } : {}),
    },
    select: { id: true, email: true, name: true },
  });
  if (users.length !== userIds.length) {
    throw new Error("Algún usuario no pertenece a la empresa seleccionada");
  }

  const wanted = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const existing = await db.surveyRecipient.findMany({
    where: { campaignId },
    select: { id: true, email: true, status: true },
  });

  const toRevoke = existing.filter(
    (r) => !wanted.has(r.email.toLowerCase()) && r.status !== "RESPONDED",
  );
  const known = new Set(existing.map((r) => r.email.toLowerCase()));
  const toCreate = [...wanted.values()]
    .filter((u) => !known.has(u.email.toLowerCase()))
    .map((u) => ({
      campaignId,
      userId: u.id,
      email: u.email.toLowerCase(),
      name: u.name,
      token: surveyToken(),
    }));

  const [created] = await db.$transaction([
    db.surveyRecipient.createMany({ data: toCreate, skipDuplicates: true }),
    db.surveyRecipient.updateMany({
      where: { id: { in: toRevoke.map((r) => r.id) } },
      data: { status: "REVOKED" },
    }),
    // Un destinatario revocado antes y vuelto a elegir regresa a PENDING.
    db.surveyRecipient.updateMany({
      where: {
        campaignId,
        status: "REVOKED",
        email: { in: [...wanted.keys()] },
      },
      data: { status: "PENDING" },
    }),
  ]);

  return { added: created.count, revoked: toRevoke.length };
}

// ─── Envío ───────────────────────────────────────────────────────────────────

function invitationPayload(
  campaign: CampaignForDispatch,
  recipient: { email: string; name: string | null; token: string },
) {
  const { subject, html } = surveyInvitationEmail({
    tenantName: campaign.tenant.name,
    recipientName: recipient.name,
    surveyTitle: campaign.survey.title,
    description: campaign.survey.description,
    answerUrl: answerUrl(recipient.token),
    closesAtLabel: formatDay(campaign.closesAt),
  });
  return { to: recipient.email, subject, html };
}

export interface DispatchResult {
  recipients: number;
  sent: number;
}

/**
 * Manda la invitación a los destinatarios que aún no la recibieron y marca
 * el lanzamiento como ACTIVE. Un fallo de correo no revierte el envío: el
 * destinatario conserva su enlace y el panel se lo sigue mostrando.
 */
export async function sendCampaignInvitations(
  campaignId: string,
): Promise<DispatchResult> {
  const campaign = await loadCampaign(campaignId);
  await syncCampaignRecipients(campaignId);

  const pending = await db.surveyRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    select: { id: true, email: true, name: true, token: true, userId: true },
  });

  const now = new Date();
  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: {
      status: "ACTIVE",
      sentAt: campaign.status === "DRAFT" ? now : undefined,
    },
  });

  if (pending.length === 0) return { recipients: 0, sent: 0 };

  let sent = 0;
  try {
    sent = await sendBulkEmail(pending.map((r) => invitationPayload(campaign, r)));
  } catch (err) {
    log("error", "Falló el envío de invitaciones", {
      campaignId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  await db.surveyRecipient.updateMany({
    where: { id: { in: pending.map((r) => r.id) } },
    data: { status: "SENT", sentAt: now },
  });

  await notifyInPanel(
    campaign,
    pending.filter((r) => r.userId).map((r) => r.userId as string),
    `Tienes una encuesta por responder: ${campaign.survey.title}`,
  );

  return { recipients: pending.length, sent };
}

/** Reenvía la invitación a quien todavía no respondió. */
export async function resendCampaignInvitations(
  campaignId: string,
  recipientIds?: string[],
): Promise<DispatchResult> {
  const campaign = await loadCampaign(campaignId);
  if (campaignState(campaign) !== "OPEN") {
    throw new Error("El lanzamiento no está abierto");
  }

  const targets = await db.surveyRecipient.findMany({
    where: {
      campaignId,
      status: { in: ["PENDING", "SENT"] },
      ...(recipientIds?.length ? { id: { in: recipientIds } } : {}),
    },
    select: { id: true, email: true, name: true, token: true },
  });
  if (targets.length === 0) return { recipients: 0, sent: 0 };

  const sent = await sendBulkEmail(
    targets.map((r) => invitationPayload(campaign, r)),
  );
  const now = new Date();
  await db.surveyRecipient.updateMany({
    where: { id: { in: targets.map((r) => r.id) } },
    data: { status: "SENT", sentAt: now },
  });
  return { recipients: targets.length, sent };
}

/** Aviso en el panel. Nunca tumba el envío de correo si falla. */
async function notifyInPanel(
  campaign: CampaignForDispatch,
  userIds: string[],
  message: string,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        tenantId: campaign.tenantId,
        type: "SYSTEM" as const,
        title: "Encuesta de satisfacción",
        message,
        link: "/dashboard/surveys",
      })),
    });
  } catch (err) {
    log("warn", "No se pudo crear la notificación en panel", {
      campaignId: campaign.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Barridos programados ────────────────────────────────────────────────────

/**
 * Recordatorios automáticos.
 *
 * Se dispara un recordatorio cuando los días restantes hasta el cierre bajan
 * de uno de los umbrales configurados. `remindersSent` cuenta los umbrales ya
 * consumidos, así que ejecutar el barrido varias veces al día no reenvía: el
 * segundo pase ve el contador ya avanzado.
 */
export async function sendCampaignReminders(
  now: Date = new Date(),
): Promise<{ campaigns: number; sent: number }> {
  const campaigns = await db.surveyCampaign.findMany({
    where: { status: "ACTIVE", opensAt: { lte: now }, closesAt: { gt: now } },
    select: CAMPAIGN_FOR_DISPATCH,
  });

  let touched = 0;
  let totalSent = 0;

  for (const campaign of campaigns) {
    const thresholds = [...campaign.reminderDaysBefore].sort((a, b) => b - a);
    if (thresholds.length === 0) continue;
    const left = daysUntil(campaign.closesAt, now);

    // Cuántos umbrales ya se cruzaron a día de hoy.
    const due = thresholds.filter((t) => left <= t).length;
    if (due === 0) continue;

    const targets = await db.surveyRecipient.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ["PENDING", "SENT"] },
        remindersSent: { lt: due },
      },
      select: { id: true, email: true, name: true, token: true },
    });
    if (targets.length === 0) continue;

    let sent = 0;
    try {
      sent = await sendBulkEmail(
        targets.map((r) => {
          const { subject, html } = surveyReminderEmail({
            tenantName: campaign.tenant.name,
            recipientName: r.name,
            surveyTitle: campaign.survey.title,
            answerUrl: answerUrl(r.token),
            closesAtLabel: formatDay(campaign.closesAt),
            daysLeft: Math.max(0, left),
          });
          return { to: r.email, subject, html };
        }),
      );
    } catch (err) {
      log("error", "Falló un lote de recordatorios", {
        campaignId: campaign.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await db.surveyRecipient.updateMany({
      where: { id: { in: targets.map((r) => r.id) } },
      data: { remindersSent: due, lastRemindedAt: now },
    });

    touched += 1;
    totalSent += sent;
  }

  return { campaigns: touched, sent: totalSent };
}

/**
 * Cierra los lanzamientos vencidos y marca como EXPIRED a quien no respondió.
 *
 * Es housekeeping, no la barrera de seguridad: el rechazo de respuestas
 * vencidas lo decide `campaignState` en el momento de responder, así que una
 * encuesta sigue sin aceptar respuestas aunque este barrido no corra.
 */
export async function closeExpiredCampaigns(
  now: Date = new Date(),
): Promise<{ campaigns: number; expiredRecipients: number }> {
  const expired = await db.surveyCampaign.findMany({
    where: { status: "ACTIVE", closesAt: { lt: now } },
    select: { id: true },
  });
  if (expired.length === 0) return { campaigns: 0, expiredRecipients: 0 };

  const ids = expired.map((c) => c.id);
  const [, recipients] = await db.$transaction([
    db.surveyCampaign.updateMany({
      where: { id: { in: ids } },
      data: { status: "CLOSED", closedAt: now },
    }),
    db.surveyRecipient.updateMany({
      where: { campaignId: { in: ids }, status: { in: ["PENDING", "SENT"] } },
      data: { status: "EXPIRED" },
    }),
  ]);

  return { campaigns: ids.length, expiredRecipients: recipients.count };
}

// ─── Publicación de resultados ───────────────────────────────────────────────

/**
 * Avisa de que el consolidado ya está publicado. El destinatario depende de
 * hasta dónde aprobó publicar el administrador: sólo el líder, o líder y
 * participantes.
 */
export async function notifyResultsPublished(
  campaignId: string,
): Promise<DispatchResult> {
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    select: {
      ...CAMPAIGN_FOR_DISPATCH,
      resultsAudience: true,
      resultsNote: true,
      resultsShareToken: true,
      _count: { select: { responses: true } },
    },
  });
  if (!campaign) throw new Error("Lanzamiento no encontrado");
  if (campaign.resultsAudience === "NONE") return { recipients: 0, sent: 0 };

  const audience: { id: string; email: string; name: string | null }[] = [];

  if (campaign.company?.leaderId) {
    const leader = await db.user.findFirst({
      where: { id: campaign.company.leaderId, disabledAt: null },
      select: { id: true, email: true, name: true },
    });
    if (leader) audience.push(leader);
  }

  if (campaign.resultsAudience === "PARTICIPANTS") {
    const participants = await db.surveyRecipient.findMany({
      where: { campaignId, status: { not: "REVOKED" }, userId: { not: null } },
      select: { user: { select: { id: true, email: true, name: true } } },
    });
    for (const p of participants) {
      if (p.user && !audience.some((a) => a.id === p.user!.id)) audience.push(p.user);
    }
  }

  if (audience.length === 0) return { recipients: 0, sent: 0 };

  const link = campaign.resultsShareToken
    ? resultsUrl(campaign.resultsShareToken)
    : `${appUrl()}/dashboard/surveys/${campaign.id}/results`;

  let sent = 0;
  try {
    sent = await sendBulkEmail(
      audience.map((u) => {
        const { subject, html } = surveyResultsPublishedEmail({
          tenantName: campaign.tenant.name,
          recipientName: u.name,
          surveyTitle: campaign.survey.title,
          resultsUrl: link,
          totalResponses: campaign._count.responses,
          note: campaign.resultsNote,
        });
        return { to: u.email, subject, html };
      }),
    );
  } catch (err) {
    log("error", "Falló el aviso de resultados publicados", {
      campaignId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  await notifyInPanel(
    campaign,
    audience.map((u) => u.id),
    `Resultados disponibles: ${campaign.survey.title}`,
  );

  return { recipients: audience.length, sent };
}

// ─── Disparadores automáticos ────────────────────────────────────────────────

/** Primer día del mes siguiente, en UTC. */
function startOfNextMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Lanzamiento automático acumulador para un disparador.
 *
 * Se agrupa por (encuesta, curso, empresa, mes). El mes acota la ventana —si
 * no, la campaña crecería para siempre y nunca vencería— y de paso da la
 * agregación por periodo que pide el informe. La empresa va en la clave
 * porque mezclar empresas en una campaña dejaría al líder de una viendo el
 * consolidado de las demás.
 */
async function findOrCreateAutoCampaign(
  survey: {
    id: string;
    tenantId: string;
    title: string;
    professorId: string;
    defaultDurationDays: number;
    defaultReminderDays: number[];
  },
  courseId: string,
  courseTitle: string,
  companyId: string | null,
  now: Date,
): Promise<string> {
  const periodStart = startOfMonth(now);
  const periodLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(periodStart);

  const existing = await db.surveyCampaign.findFirst({
    where: {
      surveyId: survey.id,
      courseId,
      companyId,
      status: "ACTIVE",
      opensAt: { gte: periodStart },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const closesAt = new Date(
    startOfNextMonth(now).getTime() + survey.defaultDurationDays * 86_400_000,
  );

  const campaign = await db.surveyCampaign.create({
    data: {
      surveyId: survey.id,
      tenantId: survey.tenantId,
      createdById: survey.professorId,
      name: `${courseTitle} — ${periodLabel}`,
      // La lista la arma el disparador persona a persona, no la audiencia.
      audience: "SPECIFIC_USERS",
      companyId,
      courseId,
      opensAt: periodStart > now ? periodStart : now,
      closesAt,
      reminderDaysBefore: survey.defaultReminderDays,
      status: "ACTIVE",
      sentAt: now,
    },
    select: { id: true },
  });
  return campaign.id;
}

/**
 * Dispara las encuestas configuradas para un evento del alumno: terminar el
 * curso o recibir su diploma.
 *
 * Idempotente por destinatario: si la persona ya está en la campaña del
 * periodo, no se le vuelve a mandar. Nunca lanza — el llamador está emitiendo
 * un diploma o cerrando un curso y eso no puede fallar por una encuesta.
 */
export async function triggerSurveysForStudent(input: {
  userId: string;
  courseId: string;
  reason: "COURSE_COMPLETED" | "CERTIFICATE_ISSUED";
}): Promise<{ launched: number }> {
  try {
    const [user, course] = await Promise.all([
      db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          tenantId: true,
          companyId: true,
          disabledAt: true,
        },
      }),
      db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, title: true, tenantId: true },
      }),
    ]);
    if (!user || !course || user.disabledAt || !user.tenantId) return { launched: 0 };
    if (user.tenantId !== course.tenantId) return { launched: 0 };

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant?.surveysEnabled) return { launched: 0 };

    const surveys = await db.survey.findMany({
      where: {
        tenantId: user.tenantId,
        status: "PUBLISHED",
        trigger: input.reason,
        // Una encuesta sin curso configurado aplica a todos los cursos.
        OR: [{ triggerCourseId: course.id }, { triggerCourseId: null }],
      },
      select: {
        id: true,
        tenantId: true,
        title: true,
        description: true,
        professorId: true,
        defaultDurationDays: true,
        defaultReminderDays: true,
      },
    });
    if (surveys.length === 0) return { launched: 0 };

    const now = new Date();
    let launched = 0;

    for (const survey of surveys) {
      const campaignId = await findOrCreateAutoCampaign(
        survey,
        course.id,
        course.title,
        user.companyId,
        now,
      );

      const already = await db.surveyRecipient.findUnique({
        where: {
          campaignId_email: { campaignId, email: user.email.toLowerCase() },
        },
        select: { id: true },
      });
      if (already) continue;

      const recipient = await db.surveyRecipient.create({
        data: {
          campaignId,
          userId: user.id,
          email: user.email.toLowerCase(),
          name: user.name,
          token: surveyToken(),
          status: "SENT",
          sentAt: now,
        },
        select: { id: true, email: true, name: true, token: true },
      });

      const campaign = await loadCampaign(campaignId);
      try {
        await sendBulkEmail([invitationPayload(campaign, recipient)]);
      } catch (err) {
        log("error", "Falló la invitación disparada automáticamente", {
          campaignId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await notifyInPanel(
        campaign,
        [user.id],
        `Tienes una encuesta por responder: ${campaign.survey.title}`,
      );
      launched += 1;
    }

    return { launched };
  } catch (err) {
    log("error", "Error en el disparador de encuestas", {
      userId: input.userId,
      courseId: input.courseId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { launched: 0 };
  }
}
