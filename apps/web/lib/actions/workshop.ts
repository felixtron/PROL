"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

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

  const workshop = await db.workshop.create({
    data: {
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
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      maxAttendees,
      minAttendees,
    },
  });

  revalidatePath("/professor/workshops");
  return { success: true, workshopId: workshop.id };
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
      `No puedes cancelar con menos de ${booking.workshop.cancellationHrs} horas de anticipacion`,
    );
  }

  await db.workshopBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/dashboard/workshops");
  return { success: true };
}
