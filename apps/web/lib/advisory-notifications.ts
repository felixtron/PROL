import { db } from "@prol/db";

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

const TIME_ZONE = process.env.WORKSHOP_TIME_ZONE || "America/Mexico_City";

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
    timeZone: TIME_ZONE,
  }).format(start);
  const time = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
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
 * Destinatarios de una sesión: los miembros de la empresa, o las personas
 * convocadas. Se descartan los que no tengan correo utilizable.
 */
async function resolveRecipients(
  session: SessionForEmail,
): Promise<{ email: string; name: string | null }[]> {
  if (session.audience === "COMPANY") {
    if (!session.companyId) return [];
    return db.user.findMany({
      where: { companyId: session.companyId, tenantId: session.tenantId },
      select: { email: true, name: true },
    });
  }

  const participants = await db.advisorySessionParticipant.findMany({
    where: { sessionId: session.id },
    select: { user: { select: { email: true, name: true } } },
  });
  return participants.map((p) => p.user);
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
    tenantName: tenant?.name ?? "PROL",
    title: session.title,
    description: session.description,
    advisorName,
    whenLabel: formatWhen(session.startTime, session.endTime),
    modalityLabel: MODALITY_LABEL[session.type] ?? session.type,
    meetingUrl: session.meetingUrl,
    locationLabel,
    sessionCount: seriesCount,
    panelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro"}/dashboard/advisory`,
  };
}

/** Invitación inicial. Devuelve cuántos correos se enviaron. */
export async function sendAdvisoryInvitations(
  session: SessionForEmail,
  advisorName: string,
): Promise<number> {
  try {
    const recipients = await resolveRecipients(session);
    if (recipients.length === 0) return 0;

    const { sendBulkEmail, advisorySessionInvitation } = await import("@prol/email");
    const params = await buildParams(session, advisorName);
    const { subject, html } = advisorySessionInvitation(params);

    // Envío por lotes: una empresa puede tener decenas de miembros y una
    // petición por persona choca contra el límite de tasa de Resend.
    return sendBulkEmail(recipients.map((r) => ({ to: r.email, subject, html })));
  } catch (e) {
    console.error("[advisory] no se pudieron enviar las invitaciones", e);
    return 0;
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
