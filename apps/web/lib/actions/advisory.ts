"use server";

import { revalidatePath } from "next/cache";
import { db, type RecurrenceFrequency } from "@prol/db";
import { requireUser } from "@/lib/auth";
import {
  ADVISORY_DISABLED_ERROR,
  isAdvisoryEnabled,
} from "@/lib/advisory-access";
import { createMeetLink } from "@/lib/google-calendar";
import {
  sendAdvisoryInvitations,
  sendAdvisoryReschedule,
} from "@/lib/advisory-notifications";

/**
 * Acciones del módulo de Sesiones de Asesoría.
 *
 * Devuelven `{ success: false, error }` en vez de lanzar: en producción Next
 * enmascara toda excepción de un server action con un mensaje genérico, así
 * que un `throw` deja al asesor sin saber qué corregir.
 */

const RECURRENCE_VALUES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
type RecurrenceLiteral = (typeof RECURRENCE_VALUES)[number];

const MAX_OCCURRENCES = 26;

function addRecurrence(date: Date, freq: RecurrenceLiteral): Date {
  const next = new Date(date);
  switch (freq) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export type AdvisoryActionResult =
  | { success: true; sessionId: string; notified: number }
  | { success: false; error: string };

export async function createAdvisorySession(
  formData: FormData,
): Promise<AdvisoryActionResult> {
  const user = await requireUser();
  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    return { success: false, error: "No tienes permiso para agendar asesorías." };
  }
  if (!user.tenantId) {
    return {
      success: false,
      error: "Tu usuario no pertenece a ninguna academia. Contacta al administrador.",
    };
  }
  if (!(await isAdvisoryEnabled(user.tenantId))) {
    return { success: false, error: ADVISORY_DISABLED_ERROR };
  }


  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as string) || "VIRTUAL";
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const locationMapUrl = (formData.get("locationMapUrl") as string) || null;

  const audience = (formData.get("audience") as string) === "USERS" ? "USERS" : "COMPANY";
  const companyId = (formData.get("companyId") as string) || null;
  const participantIds = formData
    .getAll("participantIds")
    .map((v) => String(v))
    .filter(Boolean);

  const autoMeet = formData.get("autoMeet") === "on";
  let meetingUrl = (formData.get("meetingUrl") as string) || null;
  // Un borrador se guarda sin publicar: no lo ve el cliente y no notifica.
  const saveAsDraft = formData.get("saveAsDraft") === "1";

  if (!title || !startTime || !endTime) {
    return { success: false, error: "Faltan campos obligatorios." };
  }
  if (title.length < 3 || title.length > 120) {
    return { success: false, error: "El título debe tener entre 3 y 120 caracteres." };
  }

  const baseStart = new Date(startTime);
  const baseEnd = new Date(endTime);
  if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
    return { success: false, error: "Las fechas ingresadas no son válidas." };
  }
  if (baseEnd.getTime() <= baseStart.getTime()) {
    return { success: false, error: "La hora de fin debe ser posterior a la de inicio." };
  }

  // Audiencia: se valida contra el tenant para que un POST manipulado no
  // pueda convocar a la empresa o a los usuarios de otra academia.
  if (audience === "COMPANY") {
    if (!companyId) {
      return { success: false, error: "Selecciona la empresa a la que va dirigida la asesoría." };
    }
    const company = await db.company.findFirst({
      where: { id: companyId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!company) {
      return { success: false, error: "La empresa seleccionada no existe o no es de tu academia." };
    }
  } else {
    if (participantIds.length === 0) {
      return { success: false, error: "Selecciona al menos un participante." };
    }
    const validUsers = await db.user.count({
      where: { id: { in: participantIds }, tenantId: user.tenantId },
    });
    if (validUsers !== participantIds.length) {
      return {
        success: false,
        error: "Alguno de los participantes no existe o no es de tu academia.",
      };
    }
  }

  const recurrenceRaw = (formData.get("recurrence") as string | null)?.trim();
  const recurrence: RecurrenceLiteral | null =
    recurrenceRaw && RECURRENCE_VALUES.includes(recurrenceRaw as RecurrenceLiteral)
      ? (recurrenceRaw as RecurrenceLiteral)
      : null;
  const occurrencesRaw = Number(formData.get("occurrences") || 1);
  const occurrences = recurrence
    ? Math.min(MAX_OCCURRENCES, Math.max(1, Math.floor(occurrencesRaw) || 1))
    : 1;

  // El Meet se genera antes de escribir: si Google falla no queda una
  // asesoría virtual sin enlace. Un solo evento recurrente cubre la serie.
  let googleEventId: string | null = null;
  if (autoMeet && type !== "IN_PERSON") {
    const meet = await createMeetLink({
      tenantId: user.tenantId,
      title,
      description,
      startTime: baseStart,
      endTime: baseEnd,
      recurrence: recurrence as RecurrenceFrequency | null,
      occurrences,
    });
    if (!meet.ok) return { success: false, error: meet.error };
    meetingUrl = meet.meetingUrl;
    googleEventId = meet.eventId;
  }

  const sharedData = {
    tenantId: user.tenantId,
    advisorId: user.id,
    title,
    description,
    type: type as "IN_PERSON" | "VIRTUAL" | "HYBRID",
    audience: audience as "COMPANY" | "USERS",
    companyId: audience === "COMPANY" ? companyId : null,
    locationName,
    locationAddress,
    locationMapUrl,
    meetingUrl,
    recurrenceFrequency: recurrence as RecurrenceFrequency | null,
    status: (saveAsDraft ? "DRAFT" : "SCHEDULED") as "DRAFT" | "SCHEDULED",
  };

  const participantData =
    audience === "USERS" ? participantIds.map((userId) => ({ userId })) : [];

  const parent = await db.$transaction(
    async (tx) => {
      const created = await tx.advisorySession.create({
        data: {
          ...sharedData,
          startTime: baseStart,
          endTime: baseEnd,
          googleEventId,
          participants: { create: participantData },
        },
      });

      if (recurrence && occurrences > 1) {
        let currentStart = baseStart;
        let currentEnd = baseEnd;
        for (let i = 1; i < occurrences; i++) {
          currentStart = addRecurrence(currentStart, recurrence);
          currentEnd = addRecurrence(currentEnd, recurrence);
          await tx.advisorySession.create({
            data: {
              ...sharedData,
              parentSessionId: created.id,
              startTime: currentStart,
              endTime: currentEnd,
              participants: { create: participantData },
            },
          });
        }
      }

      return created;
    },
    // 26 ocurrencias con sus participantes no caben en los 5s por defecto.
    { timeout: 20000 },
  );

  // La invitación sale sólo si se publicó. En una serie notifica el padre y
  // el correo menciona cuántas sesiones son, en vez de mandar una por fecha.
  let notified = 0;
  if (!saveAsDraft) {
    notified = await sendAdvisoryInvitations(parent, user.name ?? "Tu asesor");
    if (notified > 0) {
      await db.advisorySession.update({
        where: { id: parent.id },
        data: { invitedAt: new Date() },
      });
    }
  }

  revalidatePath("/professor/advisory");
  revalidatePath("/dashboard/advisory");
  return { success: true, sessionId: parent.id, notified };
}

/**
 * Edita una sesión existente.
 *
 * Tres transiciones que importan:
 *   - borrador → publicada: sale la invitación.
 *   - ya publicada y cambia el horario: sale aviso de reprogramación (sólo a
 *     quienes ya habían sido invitados).
 *   - publicada → borrador: no se hace; una vez avisado el cliente, retirarla
 *     es cancelar, no "despublicar".
 */
export async function updateAdvisorySession(
  sessionId: string,
  formData: FormData,
): Promise<AdvisoryActionResult> {
  const user = await requireUser();
  if (!(await isAdvisoryEnabled(user.tenantId))) {
    return { success: false, error: ADVISORY_DISABLED_ERROR };
  }

  const existing = await db.advisorySession.findFirst({
    where: { id: sessionId, advisorId: user.id },
  });
  if (!existing) {
    return { success: false, error: "Sesión no encontrada o no es tuya." };
  }
  if (existing.status === "CANCELLED") {
    return {
      success: false,
      error: "No se puede editar una sesión cancelada.",
    };
  }
  if (!user.tenantId) {
    return { success: false, error: "Tu usuario no pertenece a ninguna academia." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as string) || existing.type;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const locationMapUrl = (formData.get("locationMapUrl") as string) || null;
  const audience = (formData.get("audience") as string) === "USERS" ? "USERS" : "COMPANY";
  const companyId = (formData.get("companyId") as string) || null;
  const participantIds = formData
    .getAll("participantIds")
    .map((v) => String(v))
    .filter(Boolean);
  const saveAsDraft = formData.get("saveAsDraft") === "1";

  if (!title || !startTime || !endTime) {
    return { success: false, error: "Faltan campos obligatorios." };
  }
  if (title.length < 3 || title.length > 120) {
    return { success: false, error: "El título debe tener entre 3 y 120 caracteres." };
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);
  if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
    return { success: false, error: "Las fechas ingresadas no son válidas." };
  }
  if (newEnd.getTime() <= newStart.getTime()) {
    return { success: false, error: "La hora de fin debe ser posterior a la de inicio." };
  }

  if (audience === "COMPANY") {
    if (!companyId) {
      return { success: false, error: "Selecciona la empresa a la que va dirigida." };
    }
    const company = await db.company.findFirst({
      where: { id: companyId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!company) {
      return { success: false, error: "La empresa seleccionada no existe o no es de tu academia." };
    }
  } else {
    if (participantIds.length === 0) {
      return { success: false, error: "Selecciona al menos un participante." };
    }
    const validUsers = await db.user.count({
      where: { id: { in: participantIds }, tenantId: user.tenantId },
    });
    if (validUsers !== participantIds.length) {
      return {
        success: false,
        error: "Alguno de los participantes no existe o no es de tu academia.",
      };
    }
  }

  // Sólo un borrador puede seguir siendo borrador. Si ya se publicó, guardar
  // no lo devuelve a borrador aunque llegue la bandera.
  const wasDraft = existing.status === "DRAFT";
  const nextStatus = wasDraft && saveAsDraft ? "DRAFT" : "SCHEDULED";
  const isPublishing = wasDraft && !saveAsDraft;

  const scheduleChanged =
    existing.startTime.getTime() !== newStart.getTime() ||
    existing.endTime.getTime() !== newEnd.getTime();

  // El enlace de Meet no se regenera: sigue siendo válido aunque cambie la
  // hora. Lo que NO se actualiza es el evento en Google Calendar, que se
  // queda con el horario anterior.
  const meetingUrlRaw = (formData.get("meetingUrl") as string) || null;
  const meetingUrl = meetingUrlRaw ?? existing.meetingUrl;

  const updated = await db.$transaction(async (tx) => {
    if (audience === "USERS") {
      await tx.advisorySessionParticipant.deleteMany({ where: { sessionId } });
      if (participantIds.length > 0) {
        await tx.advisorySessionParticipant.createMany({
          data: participantIds.map((userId) => ({ sessionId, userId })),
        });
      }
    } else {
      // Cambió a audiencia por empresa: los participantes sueltos sobran.
      await tx.advisorySessionParticipant.deleteMany({ where: { sessionId } });
    }

    return tx.advisorySession.update({
      where: { id: sessionId },
      data: {
        title,
        description,
        type: type as "IN_PERSON" | "VIRTUAL" | "HYBRID",
        audience: audience as "COMPANY" | "USERS",
        companyId: audience === "COMPANY" ? companyId : null,
        locationName,
        locationAddress,
        locationMapUrl,
        meetingUrl,
        startTime: newStart,
        endTime: newEnd,
        status: nextStatus,
      },
    });
  });

  const advisorName = user.name ?? "Tu asesor";
  let notified = 0;

  if (isPublishing) {
    notified = await sendAdvisoryInvitations(updated, advisorName);
    if (notified > 0) {
      await db.advisorySession.update({
        where: { id: sessionId },
        data: { invitedAt: new Date() },
      });
    }
  } else if (scheduleChanged && existing.invitedAt) {
    // Sólo avisamos a quien ya había recibido la invitación; si nunca salió,
    // no tiene sentido notificar un cambio que nadie conocía.
    notified = await sendAdvisoryReschedule(
      updated,
      advisorName,
      existing.startTime,
      existing.endTime,
    );
  }

  revalidatePath("/professor/advisory");
  revalidatePath(`/professor/advisory/${sessionId}`);
  revalidatePath("/dashboard/advisory");
  return { success: true, sessionId, notified };
}

export async function cancelAdvisorySession(
  sessionId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  if (!(await isAdvisoryEnabled(user.tenantId))) {
    return { success: false, error: ADVISORY_DISABLED_ERROR };
  }

  const existing = await db.advisorySession.findFirst({
    where: { id: sessionId, advisorId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Sesión no encontrada." };
  }

  await db.advisorySession.update({
    where: { id: sessionId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/professor/advisory");
  revalidatePath(`/professor/advisory/${sessionId}`);
  revalidatePath("/dashboard/advisory");
  return { success: true };
}
