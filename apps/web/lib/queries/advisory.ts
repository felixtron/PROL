import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * Consultas del módulo de Sesiones de Asesoría.
 *
 * Regla de acceso, en un solo lugar: una sesión con audiencia COMPANY la ven
 * los miembros de esa empresa; una con audiencia USERS, sólo los usuarios
 * convocados. El asesor ve siempre las suyas.
 */

// ─── Asesor (profesor / admin) ────────────────────────────────────────────────

export const getAdvisorSessions = cache(async () => {
  const user = await requireUser();

  const sessions = await db.advisorySession.findMany({
    where: { advisorId: user.id },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    type: s.type,
    status: s.status,
    audience: s.audience,
    company: s.company,
    participantCount: s._count.participants,
    locationName: s.locationName,
    meetingUrl: s.meetingUrl,
    startTime: s.startTime,
    endTime: s.endTime,
    recurrenceFrequency: s.recurrenceFrequency,
    parentSessionId: s.parentSessionId,
  }));
});

export const getAdvisorSessionDetail = cache(async (sessionId: string) => {
  const user = await requireUser();

  const session = await db.advisorySession.findFirst({
    where: { id: sessionId, advisorId: user.id },
    include: {
      company: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!session) return null;

  // Serie recurrente: cargamos las hermanas para poder mostrar "Sesión X de Y".
  const rootId = session.parentSessionId ?? session.id;
  const isSeries =
    session.parentSessionId !== null || session.recurrenceFrequency !== null;
  const series = isSeries
    ? await db.advisorySession.findMany({
        where: {
          OR: [{ id: rootId }, { parentSessionId: rootId }],
          advisorId: user.id,
        },
        orderBy: { startTime: "asc" },
        select: { id: true, startTime: true, status: true },
      })
    : [];

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    type: session.type,
    status: session.status,
    audience: session.audience,
    company: session.company,
    participants: session.participants.map((p) => p.user),
    locationName: session.locationName,
    locationAddress: session.locationAddress,
    locationMapUrl: session.locationMapUrl,
    meetingUrl: session.meetingUrl,
    startTime: session.startTime,
    endTime: session.endTime,
    recurrenceFrequency: session.recurrenceFrequency,
    parentSessionId: session.parentSessionId,
    series,
  };
});

/** Empresas y usuarios del tenant, para elegir audiencia al crear. */
export const getAdvisoryAudienceOptions = cache(async () => {
  const user = await requireUser();
  if (!user.tenantId) return { companies: [], users: [] };

  const [companies, users] = await Promise.all([
    db.company.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { tenantId: user.tenantId, role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        company: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    companies,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      companyName: u.company?.name ?? null,
    })),
  };
});

// ─── Cliente (alumno / miembro de empresa) ────────────────────────────────────

/**
 * Sesiones que le corresponden al usuario: las dirigidas a su empresa más
 * aquellas a las que fue convocado por nombre.
 */
export const getMyAdvisorySessions = cache(async () => {
  const user = await requireUser();
  if (!user.tenantId) return [];

  const sessions = await db.advisorySession.findMany({
    where: {
      tenantId: user.tenantId,
      status: { not: "CANCELLED" },
      OR: [
        ...(user.companyId
          ? [{ audience: "COMPANY" as const, companyId: user.companyId }]
          : []),
        { audience: "USERS" as const, participants: { some: { userId: user.id } } },
      ],
    },
    include: {
      advisor: { select: { name: true, avatar: true } },
      company: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    type: s.type,
    status: s.status,
    advisorName: s.advisor.name ?? "Asesor",
    advisorAvatar: s.advisor.avatar,
    companyName: s.company?.name ?? null,
    locationName: s.locationName,
    locationAddress: s.locationAddress,
    locationMapUrl: s.locationMapUrl,
    meetingUrl: s.meetingUrl,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
});
