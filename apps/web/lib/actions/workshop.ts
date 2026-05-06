"use server";

import { revalidatePath } from "next/cache";
import { db, type RecurrenceFrequency } from "@prol/db";
import { requireUser } from "@/lib/auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RECURRENCE_VALUES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
type RecurrenceLiteral = (typeof RECURRENCE_VALUES)[number];

const MAX_OCCURRENCES = 26;

/** Add one period of the given frequency to a Date (returns a new Date). */
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

// ─── Professor actions ────────────────────────────────────────────────────────

export async function createWorkshop(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const courseId = formData.get("courseId") as string;
  const moduleId = (formData.get("moduleId") as string) || null;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as string) || "IN_PERSON";
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const locationMapUrl = (formData.get("locationMapUrl") as string) || null;
  const meetingUrl = (formData.get("meetingUrl") as string) || null;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const maxAttendees = Number(formData.get("maxAttendees") || 20);
  const minAttendees = Number(formData.get("minAttendees") || 3);

  if (!courseId || !title || !startTime || !endTime) {
    throw new Error("Faltan campos obligatorios");
  }
  if (title.length < 3 || title.length > 120) {
    throw new Error("El título debe tener entre 3 y 120 caracteres");
  }
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Fechas inválidas");
  }
  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("La hora de fin debe ser posterior a la de inicio");
  }
  if (!Number.isFinite(maxAttendees) || maxAttendees < 1 || maxAttendees > 1000) {
    throw new Error("Cupo máximo inválido");
  }
  if (!Number.isFinite(minAttendees) || minAttendees < 0 || minAttendees > maxAttendees) {
    throw new Error("Mínimo de asistentes inválido");
  }

  // Recurrence is optional. When set, generate `occurrences` workshops total
  // (the first one is the "parent", the rest are children that link back).
  const recurrenceRaw = (formData.get("recurrence") as string | null)?.trim();
  const recurrence: RecurrenceLiteral | null =
    recurrenceRaw && RECURRENCE_VALUES.includes(recurrenceRaw as RecurrenceLiteral)
      ? (recurrenceRaw as RecurrenceLiteral)
      : null;
  const occurrencesRaw = Number(formData.get("occurrences") || 1);
  const occurrences = recurrence
    ? Math.min(MAX_OCCURRENCES, Math.max(1, Math.floor(occurrencesRaw) || 1))
    : 1;

  const baseStart = new Date(startTime);
  const baseEnd = new Date(endTime);

  const sharedData = {
    tenantId: user.tenantId!,
    professorId: user.id,
    courseId,
    moduleId,
    title,
    description,
    type: type as "IN_PERSON" | "VIRTUAL" | "HYBRID",
    locationName,
    locationAddress,
    locationMapUrl,
    meetingUrl,
    maxAttendees,
    minAttendees,
    recurrenceFrequency: recurrence as RecurrenceFrequency | null,
  };

  const parent = await db.workshop.create({
    data: {
      ...sharedData,
      startTime: baseStart,
      endTime: baseEnd,
    },
  });

  if (recurrence && occurrences > 1) {
    let currentStart = baseStart;
    let currentEnd = baseEnd;
    const children = [];
    for (let i = 1; i < occurrences; i++) {
      currentStart = addRecurrence(currentStart, recurrence);
      currentEnd = addRecurrence(currentEnd, recurrence);
      children.push({
        ...sharedData,
        parentWorkshopId: parent.id,
        startTime: currentStart,
        endTime: currentEnd,
      });
    }
    await db.workshop.createMany({ data: children });
  }

  revalidatePath("/professor/workshops");
  return { success: true, workshopId: parent.id };
}

export async function updateWorkshop(workshopId: string, formData: FormData) {
  const user = await requireUser();

  const existing = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
  });
  if (!existing) throw new Error("Workshop no encontrado");

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as string) || existing.type;
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const locationMapUrl = (formData.get("locationMapUrl") as string) || null;
  const meetingUrl = (formData.get("meetingUrl") as string) || null;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const maxAttendees = Number(formData.get("maxAttendees") || existing.maxAttendees);
  const status = (formData.get("status") as string) || undefined;

  // Coherent time range — required because both fields default to undefined
  // when the form omits them, so we only validate what was sent.
  const effectiveStart = startTime ? new Date(startTime) : existing.startTime;
  const effectiveEnd = endTime ? new Date(endTime) : existing.endTime;
  if (Number.isNaN(effectiveStart.getTime()) || Number.isNaN(effectiveEnd.getTime())) {
    throw new Error("Fechas inválidas");
  }
  if (effectiveEnd.getTime() <= effectiveStart.getTime()) {
    throw new Error("La hora de fin debe ser posterior a la de inicio");
  }
  if (title !== undefined && (title.length < 3 || title.length > 120)) {
    throw new Error("El título debe tener entre 3 y 120 caracteres");
  }
  if (!Number.isFinite(maxAttendees) || maxAttendees < 1 || maxAttendees > 1000) {
    throw new Error("Cupo máximo inválido");
  }

  await db.workshop.update({
    where: { id: workshopId },
    data: {
      title,
      description,
      type: type as "IN_PERSON" | "VIRTUAL" | "HYBRID",
      locationName,
      locationAddress,
      locationMapUrl,
      meetingUrl,
      ...(startTime ? { startTime: new Date(startTime) } : {}),
      ...(endTime ? { endTime: new Date(endTime) } : {}),
      maxAttendees,
      ...(status ? { status: status as "SCHEDULED" | "CONFIRMED" | "CANCELLED" } : {}),
    },
  });

  revalidatePath("/professor/workshops");
  revalidatePath(`/professor/workshops/${workshopId}`);
  return { success: true };
}

export async function cancelWorkshop(workshopId: string) {
  const user = await requireUser();

  const existing = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
  });
  if (!existing) throw new Error("Workshop no encontrado");

  await db.workshop.update({
    where: { id: workshopId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/professor/workshops");
  revalidatePath(`/professor/workshops/${workshopId}`);
  return { success: true };
}

export async function checkInStudent(workshopId: string, studentId: string) {
  const user = await requireUser();

  const workshop = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
  });
  if (!workshop) throw new Error("Workshop no encontrado");

  const booking = await db.workshopBooking.findUnique({
    where: {
      workshopId_studentId: { workshopId, studentId },
    },
  });
  if (!booking || booking.status !== "CONFIRMED") {
    throw new Error("Reserva no encontrada o no confirmada");
  }

  await db.workshopAttendance.upsert({
    where: {
      workshopId_studentId: { workshopId, studentId },
    },
    create: {
      workshopId,
      studentId,
      checkedInAt: new Date(),
      checkedInBy: user.id,
    },
    update: {
      checkedInAt: new Date(),
      checkedInBy: user.id,
    },
  });

  revalidatePath(`/professor/workshops/${workshopId}`);
  return { success: true };
}

/**
 * Bulk-grade attendance for a workshop. The professor passes one entry per
 * student, where `attended=true` records an attendance row and clears any
 * NO_SHOW flag, and `attended=false` removes the attendance (if any) and
 * marks the booking as NO_SHOW.
 *
 * Only the workshop's professor can grade.
 */
export async function bulkMarkAttendance(
  workshopId: string,
  entries: { studentId: string; attended: boolean }[]
) {
  const user = await requireUser();

  const workshop = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
    select: { id: true },
  });
  if (!workshop) throw new Error("Workshop no encontrado");

  if (!Array.isArray(entries) || entries.length === 0) {
    return { success: true, updated: 0 };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    for (const { studentId, attended } of entries) {
      if (attended) {
        await tx.workshopAttendance.upsert({
          where: { workshopId_studentId: { workshopId, studentId } },
          create: {
            workshopId,
            studentId,
            checkedInAt: now,
            checkedInBy: user.id,
          },
          update: {
            checkedInAt: now,
            checkedInBy: user.id,
          },
        });
        // If a previous "no-show" flag was set, restore the booking.
        await tx.workshopBooking.updateMany({
          where: { workshopId, studentId, status: "NO_SHOW" },
          data: { status: "CONFIRMED" },
        });
      } else {
        await tx.workshopAttendance.deleteMany({
          where: { workshopId, studentId },
        });
        await tx.workshopBooking.updateMany({
          where: { workshopId, studentId, status: { not: "CANCELLED" } },
          data: { status: "NO_SHOW" },
        });
      }
    }
  });

  revalidatePath(`/professor/workshops/${workshopId}`);
  return { success: true, updated: entries.length };
}

export async function markNoShow(workshopId: string, studentId: string) {
  const user = await requireUser();

  const workshop = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
  });
  if (!workshop) throw new Error("Workshop no encontrado");

  await db.workshopBooking.update({
    where: {
      workshopId_studentId: { workshopId, studentId },
    },
    data: { status: "NO_SHOW" },
  });

  revalidatePath(`/professor/workshops/${workshopId}`);
  return { success: true };
}

// ─── Student actions ──────────────────────────────────────────────────────────

export async function bookWorkshop(workshopId: string) {
  const user = await requireUser();

  const workshop = await db.workshop.findFirst({
    where: {
      id: workshopId,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startTime: { gt: new Date() },
    },
    include: { _count: { select: { bookings: true } } },
  });
  if (!workshop) throw new Error("Workshop no disponible");

  const existingBooking = await db.workshopBooking.findUnique({
    where: {
      workshopId_studentId: { workshopId, studentId: user.id },
    },
  });
  if (existingBooking && existingBooking.status !== "CANCELLED") {
    throw new Error("Ya tienes una reserva para este workshop");
  }

  // Use transaction to prevent race condition on last spot
  const isWaitlisted = await db.$transaction(async (tx) => {
    // Re-count confirmed bookings inside transaction for accuracy
    const confirmedCount = await tx.workshopBooking.count({
      where: { workshopId, status: { in: ["CONFIRMED"] } },
    });
    const spotsLeft = workshop.maxAttendees - confirmedCount;
    const waitlisted = spotsLeft <= 0;

    if (existingBooking) {
      await tx.workshopBooking.update({
        where: { id: existingBooking.id },
        data: {
          status: waitlisted ? "WAITLISTED" : "CONFIRMED",
          waitlistPosition: waitlisted ? confirmedCount + 1 : null,
          cancelledAt: null,
        },
      });
    } else {
      await tx.workshopBooking.create({
        data: {
          workshopId,
          studentId: user.id,
          status: waitlisted ? "WAITLISTED" : "CONFIRMED",
          waitlistPosition: waitlisted ? confirmedCount + 1 : null,
        },
      });
    }

    return waitlisted;
  });

  revalidatePath("/dashboard/workshops");
  return { success: true, waitlisted: isWaitlisted };
}

export async function cancelBooking(workshopId: string) {
  const user = await requireUser();

  const booking = await db.workshopBooking.findUnique({
    where: {
      workshopId_studentId: { workshopId, studentId: user.id },
    },
    include: { workshop: true },
  });

  if (!booking) throw new Error("Reserva no encontrada");

  const hoursUntilStart =
    (booking.workshop.startTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilStart < booking.workshop.cancellationHrs) {
    throw new Error(
      `No puedes cancelar con menos de ${booking.workshop.cancellationHrs} horas de anticipación`,
    );
  }

  await db.workshopBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/dashboard/workshops");
  return { success: true };
}
