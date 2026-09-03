import { db } from "@prol/db";
import { APP_TIME_ZONE } from "@/lib/timezone";
import { APP_URL, BRAND_NAME } from "@/lib/brand";

/**
 * Envío de correos del módulo de Consultoría Online.
 *
 * Regla: un borrador nunca notifica. La invitación sale al publicar, y si
 * después cambia el horario se manda un aviso de reprogramación.
 *
 * Ningún fallo de correo tumba la acción que lo disparó: si Resend falla, la
 * sesión igual queda guardada y el error se registra. Preferimos una sesión
 * creada sin correo a perder la sesión por un problema de terceros.
 */

const MODALITY_LABEL: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
};

/** "lunes 18 de agosto de 2026, 10:00 – 12:00" */
export function formatWhen(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(start);
  const time = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
  return `${day}, ${time.format(start)} – ${time.format(end)}`;
}

type SessionForEmail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  audience: string;
  companyId: string | null;
  startTime: Date;
  endTime: Date;
  meetingUrl: string | null;
  locationName: string | null;
  locationAddress: string | null;
  tenantId: string;
  parentSessionId: string | null;
};

/**
 * Destinatarios de una sesión.
 *
 * La lista de participantes manda siempre que exista, sin importar la
 * audiencia: una sesión de empresa puede ir a toda la plantilla (sin
 * participantes) o sólo a los miembros que el asesor convocó (con ellos).
 * Así, acotar la lista acota el correo, sin necesidad de un campo aparte.
 */
async function resolveRecipients(
  session: SessionForEmail,
): Promise<{ email: string; name: string | null }[]> {
  const participants = await db.advisorySessionParticipant.findMany({
    where: { sessionId: session.id },
    select: { user: { select: { email: true, name: true } } },
  });
  if (participants.length > 0) return participants.map((p) => p.user);

  if (session.audience === "COMPANY" && session.companyId) {
    return db.user.findMany({
      where: { companyId: session.companyId, tenantId: session.tenantId },
      select: { email: true, name: true },
    });
  }

  return [];
}

async function buildParams(session: SessionForEmail, advisorName: string) {
  const [tenant, seriesCount] = await Promise.all([
    db.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    }),
    // Si es el padre de una serie, contamos las ocurrencias para mencionarlo
    // en el correo en vez de mandar un mensaje por cada fecha.
    session.parentSessionId
      ? Promise.resolve(1)
      : db.advisorySession.count({
          where: { OR: [{ id: session.id }, { parentSessionId: session.id }] },
        }),
  ]);

  const locationLabel = session.locationName
    ? session.locationAddress
      ? `${session.locationName} — ${session.locationAddress}`
      : session.locationName
    : null;

  return {
    tenantName: tenant?.name ?? BRAND_NAME,
    title: session.title,
    description: session.description,
    advisorName,
    whenLabel: formatWhen(session.startTime, session.endTime),
    modalityLabel: MODALITY_LABEL[session.type] ?? session.type,
    meetingUrl: session.meetingUrl,
    locationLabel,
    sessionCount: seriesCount,
    panelUrl: `${APP_URL}/dashboard/advisory`,
  };
}

export type AdvisoryInvitationResult = {
  /** Personas que resolvió la sesión. 0 = no hay a quién invitar todavía. */
  recipients: number;
  /** Correos que aceptó el proveedor. */
  sent: number;
};

/**
 * Invitación inicial.
 *
 * Devuelve los dos números por separado a propósito: "no había destinatarios"
 * y "había pero el correo falló" se veían igual desde afuera (ambos 0) y son
 * problemas distintos — uno se arregla dando de alta usuarios en la empresa y
 * el otro revisando Resend.
 */
export async function sendAdvisoryInvitations(
  session: SessionForEmail,
  advisorName: string,
): Promise<AdvisoryInvitationResult> {
  let recipientCount = 0;
  try {
    const recipients = await resolveRecipients(session);
    recipientCount = recipients.length;
    if (recipientCount === 0) return { recipients: 0, sent: 0 };

    const { sendBulkEmail, advisorySessionInvitation } = await import("@prol/email");
    const params = await buildParams(session, advisorName);
    const { subject, html } = advisorySessionInvitation(params);

    // Envío por lotes: una empresa puede tener decenas de miembros y una
    // petición por persona choca contra el límite de tasa de Resend.
    const sent = await sendBulkEmail(
      recipients.map((r) => ({ to: r.email, subject, html })),
    );
    return { recipients: recipientCount, sent };
  } catch (e) {
    console.error("[advisory] no se pudieron enviar las invitaciones", e);
    return { recipients: recipientCount, sent: 0 };
  }
}

/** Aviso de cambio de horario a quienes ya habían sido invitados. */
export async function sendAdvisoryReschedule(
  session: SessionForEmail,
  advisorName: string,
  previousStart: Date,
  previousEnd: Date,
): Promise<number> {
  try {
    const recipients = await resolveRecipients(session);
    if (recipients.length === 0) return 0;

    const { sendBulkEmail, advisorySessionRescheduled } = await import("@prol/email");
    const params = await buildParams(session, advisorName);
    const { subject, html } = advisorySessionRescheduled({
      ...params,
      previousWhenLabel: formatWhen(previousStart, previousEnd),
    });

    return sendBulkEmail(recipients.map((r) => ({ to: r.email, subject, html })));
  } catch (e) {
    console.error("[advisory] no se pudo avisar de la reprogramación", e);
    return 0;
  }
}
