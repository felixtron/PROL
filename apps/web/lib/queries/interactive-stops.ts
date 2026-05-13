import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Professor Queries
// ---------------------------------------------------------------------------

export const getInteractiveStopsForLesson = cache(async (lessonId: string) => {
  const user = await requireUser();

  // Verify professor owns this lesson's course
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { professorId: true } },
        },
      },
    },
  });

  if (!lesson || lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  const stops = await db.interactiveStop.findMany({
    where: { lessonId },
    orderBy: { timestampSeconds: "asc" },
    select: {
      id: true,
      timestampSeconds: true,
      type: true,
      content: true,
      isRequired: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return stops;
});

// ---------------------------------------------------------------------------
// Student Queries
// ---------------------------------------------------------------------------

export const getInteractiveStopsForPlayer = cache(
  async (lessonId: string, lessonProgressId?: string) => {
    const user = await requireUser();

    // Verify the lesson belongs to a course of the caller's tenant before
    // returning anything. Without this, any authenticated user could read
    // the interactive stop content of any lesson in any tenant by guessing
    // the `lessonId`. SUPER_ADMIN bypasses the tenant check.
    const lesson = await db.lesson.findFirst({
      where: {
        id: lessonId,
        ...(user.role === "SUPER_ADMIN"
          ? {}
          : {
              module: {
                course: { tenantId: user.tenantId ?? "__none__" },
              },
            }),
      },
      select: { id: true },
    });
    if (!lesson) {
      throw new Error("Lección no encontrada");
    }

    // Get all stops for this lesson
    const stops = await db.interactiveStop.findMany({
      where: { lessonId },
      orderBy: { timestampSeconds: "asc" },
      select: {
        id: true,
        timestampSeconds: true,
        type: true,
        content: true,
        isRequired: true,
      },
    });

    // If no lesson progress ID, return stops without responses
    if (!lessonProgressId) {
      return stops.map((stop) => ({
        ...stop,
        response: null,
      }));
    }

    // Verify student owns this lesson progress
    const lessonProgress = await db.lessonProgress.findFirst({
      where: {
        id: lessonProgressId,
        enrollment: { studentId: user.id },
      },
    });

    if (!lessonProgress) {
      throw new Error("Progreso de lección no encontrado");
    }

    // Get student's responses for these stops
    const responses = await db.interactiveStopResponse.findMany({
      where: {
        lessonProgressId,
        interactiveStopId: { in: stops.map((s) => s.id) },
      },
      select: {
        interactiveStopId: true,
        response: true,
        isCorrect: true,
        respondedAt: true,
      },
    });

    // Create a map of responses by stop ID
    const responseMap = new Map(
      responses.map((r) => [
        r.interactiveStopId,
        {
          response: r.response,
          isCorrect: r.isCorrect,
          respondedAt: r.respondedAt,
        },
      ])
    );

    // Merge stops with responses
    return stops.map((stop) => ({
      ...stop,
      response: responseMap.get(stop.id) ?? null,
    }));
  }
);
