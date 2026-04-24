import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// ─── Professor queries ────────────────────────────────────────────────────────

export const getProfessorWorkshops = cache(async () => {
  const user = await requireUser();

  const workshops = await db.workshop.findMany({
    where: { professorId: user.id },
    include: {
      course: { select: { title: true, slug: true } },
      _count: { select: { bookings: true, attendances: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return workshops.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    type: w.type,
    status: w.status,
    courseName: w.course.title,
    locationName: w.locationName,
    meetingUrl: w.meetingUrl,
    startTime: w.startTime,
    endTime: w.endTime,
    maxAttendees: w.maxAttendees,
    minAttendees: w.minAttendees,
    bookings: w._count.bookings,
    attendances: w._count.attendances,
  }));
});

export const getProfessorWorkshopDetail = cache(async (workshopId: string) => {
  const user = await requireUser();

  const workshop = await db.workshop.findFirst({
    where: { id: workshopId, professorId: user.id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      module: { select: { id: true, title: true, position: true } },
      bookings: {
        include: {
          student: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { bookedAt: "asc" },
      },
      attendances: {
        include: {
          student: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!workshop) return null;

  // Resolve recurring series: load all siblings (same parent or rooted at the
  // current workshop if it IS the parent), ordered by start time, so the UI
  // can render "Sesión X de Y" + sibling navigation.
  let series: { id: string; startTime: Date; status: string }[] = [];
  const rootId = workshop.parentWorkshopId ?? workshop.id;
  const isPartOfSeries =
    workshop.parentWorkshopId !== null ||
    workshop.recurrenceFrequency !== null;
  if (isPartOfSeries) {
    const siblings = await db.workshop.findMany({
      where: {
        OR: [{ id: rootId }, { parentWorkshopId: rootId }],
        professorId: user.id,
      },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, status: true },
    });
    series = siblings;
  }

  return {
    id: workshop.id,
    title: workshop.title,
    description: workshop.description,
    type: workshop.type,
    status: workshop.status,
    course: workshop.course,
    module: workshop.module,
    locationName: workshop.locationName,
    locationAddress: workshop.locationAddress,
    locationMapUrl: workshop.locationMapUrl,
    meetingUrl: workshop.meetingUrl,
    startTime: workshop.startTime,
    endTime: workshop.endTime,
    maxAttendees: workshop.maxAttendees,
    minAttendees: workshop.minAttendees,
    isRequired: workshop.isRequired,
    prerequisite: workshop.prerequisite,
    cancellationHrs: workshop.cancellationHrs,
    parentWorkshopId: workshop.parentWorkshopId,
    recurrenceFrequency: workshop.recurrenceFrequency,
    series,
    bookings: workshop.bookings.map((b) => ({
      id: b.id,
      student: b.student,
      status: b.status,
      waitlistPosition: b.waitlistPosition,
      bookedAt: b.bookedAt,
      cancelledAt: b.cancelledAt,
    })),
    attendances: workshop.attendances.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.name,
      checkedInAt: a.checkedInAt,
      checkedOutAt: a.checkedOutAt,
      feedback: a.feedback,
      rating: a.rating,
    })),
  };
});

export const getProfessorCourseOptions = cache(async () => {
  const user = await requireUser();

  const courses = await db.course.findMany({
    where: { professorId: user.id, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      title: true,
      modules: {
        select: { id: true, title: true, position: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  return courses;
});

// ─── Student queries ──────────────────────────────────────────────────────────

export const getStudentWorkshops = cache(async () => {
  const user = await requireUser();

  const bookings = await db.workshopBooking.findMany({
    where: { studentId: user.id, status: { not: "CANCELLED" } },
    include: {
      workshop: {
        include: {
          course: { select: { title: true } },
          professor: { select: { name: true, avatar: true } },
          _count: { select: { bookings: true } },
        },
      },
    },
    orderBy: { workshop: { startTime: "asc" } },
  });

  return bookings.map((b) => ({
    bookingId: b.id,
    bookingStatus: b.status,
    bookedAt: b.bookedAt,
    workshop: {
      id: b.workshop.id,
      title: b.workshop.title,
      description: b.workshop.description,
      type: b.workshop.type,
      status: b.workshop.status,
      courseName: b.workshop.course.title,
      professorName: b.workshop.professor.name ?? "Profesor",
      professorAvatar: b.workshop.professor.avatar,
      locationName: b.workshop.locationName,
      locationAddress: b.workshop.locationAddress,
      locationMapUrl: b.workshop.locationMapUrl,
      meetingUrl: b.workshop.meetingUrl,
      startTime: b.workshop.startTime,
      endTime: b.workshop.endTime,
      maxAttendees: b.workshop.maxAttendees,
      totalBookings: b.workshop._count.bookings,
    },
  }));
});

export const getAvailableWorkshops = cache(async () => {
  const user = await requireUser();

  const workshops = await db.workshop.findMany({
    where: {
      tenantId: user.tenantId!,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startTime: { gt: new Date() },
      bookings: { none: { studentId: user.id, status: { not: "CANCELLED" } } },
    },
    include: {
      course: { select: { title: true } },
      professor: { select: { name: true, avatar: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return workshops.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    type: w.type,
    status: w.status,
    courseName: w.course.title,
    professorName: w.professor.name ?? "Profesor",
    professorAvatar: w.professor.avatar,
    locationName: w.locationName,
    locationAddress: w.locationAddress,
    locationMapUrl: w.locationMapUrl,
    meetingUrl: w.meetingUrl,
    startTime: w.startTime,
    endTime: w.endTime,
    maxAttendees: w.maxAttendees,
    spotsLeft: w.maxAttendees - w._count.bookings,
  }));
});
