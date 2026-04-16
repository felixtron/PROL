"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InteractiveStopType = "QUESTION" | "REFLECTION" | "EXERCISE" | "POLL";

interface QuestionContent {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ReflectionContent {
  prompt: string;
}

interface ExerciseContent {
  instructions: string;
}

interface PollContent {
  question: string;
  options: string[];
}

type StopContent = QuestionContent | ReflectionContent | ExerciseContent | PollContent;

interface QuestionResponse {
  selectedIndex: number;
}

interface ReflectionResponse {
  text: string;
}

interface ExerciseResponse {
  completed: true;
}

interface PollResponse {
  selectedIndex: number;
}

type StopResponse = QuestionResponse | ReflectionResponse | ExerciseResponse | PollResponse;

// ---------------------------------------------------------------------------
// Professor Actions — Create, Update, Delete Stops
// ---------------------------------------------------------------------------

export async function createInteractiveStop(
  lessonId: string,
  data: {
    timestampSeconds: number;
    type: InteractiveStopType;
    content: StopContent;
    isRequired?: boolean;
  }
) {
  const user = await requireUser();

  // Verify professor owns this lesson's course
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, professorId: true } },
        },
      },
    },
  });

  if (!lesson || lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  // Validate lesson is VIDEO type
  if (lesson.type !== "VIDEO") {
    throw new Error("Las paradas interactivas solo están disponibles para lecciones de video");
  }

  const stop = await db.interactiveStop.create({
    data: {
      lessonId,
      timestampSeconds: data.timestampSeconds,
      type: data.type,
      content: data.content as any,
      isRequired: data.isRequired ?? true,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true, stopId: stop.id };
}

export async function updateInteractiveStop(
  stopId: string,
  data: {
    timestampSeconds?: number;
    type?: InteractiveStopType;
    content?: StopContent;
    isRequired?: boolean;
  }
) {
  const user = await requireUser();

  // Verify professor owns this stop's course
  const stop = await db.interactiveStop.findFirst({
    where: { id: stopId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: { select: { id: true, professorId: true } },
            },
          },
        },
      },
    },
  });

  if (!stop || stop.lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  await db.interactiveStop.update({
    where: { id: stopId },
    data: {
      ...(data.timestampSeconds !== undefined && { timestampSeconds: data.timestampSeconds }),
      ...(data.type && { type: data.type }),
      ...(data.content && { content: data.content as any }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
    },
  });

  revalidatePath(`/professor/courses/${stop.lesson.module.course.id}/edit`);
  return { success: true };
}

export async function deleteInteractiveStop(stopId: string) {
  const user = await requireUser();

  // Verify professor owns this stop's course
  const stop = await db.interactiveStop.findFirst({
    where: { id: stopId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: { select: { id: true, professorId: true } },
            },
          },
        },
      },
    },
  });

  if (!stop || stop.lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }

  await db.interactiveStop.delete({ where: { id: stopId } });

  revalidatePath(`/professor/courses/${stop.lesson.module.course.id}/edit`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Student Actions — Submit Responses
// ---------------------------------------------------------------------------

export async function submitStopResponse(
  stopId: string,
  lessonProgressId: string,
  response: StopResponse
) {
  const user = await requireUser();

  // Verify student owns this lesson progress
  const lessonProgress = await db.lessonProgress.findFirst({
    where: {
      id: lessonProgressId,
      enrollment: { studentId: user.id },
    },
    include: {
      enrollment: { select: { studentId: true } },
    },
  });

  if (!lessonProgress) {
    throw new Error("Progreso de lección no encontrado");
  }

  // Get the interactive stop to check correctness for QUESTION type
  const stop = await db.interactiveStop.findUnique({
    where: { id: stopId },
  });

  if (!stop) {
    throw new Error("Parada interactiva no encontrada");
  }

  // Calculate isCorrect for QUESTION type
  let isCorrect: boolean | null = null;
  if (stop.type === "QUESTION") {
    const content = stop.content as unknown as QuestionContent;
    const questionResponse = response as QuestionResponse;
    isCorrect = questionResponse.selectedIndex === content.correctIndex;
  }

  // Check if response already exists
  const existingResponse = await db.interactiveStopResponse.findFirst({
    where: {
      lessonProgressId,
      interactiveStopId: stopId,
    },
  });

  if (existingResponse) {
    // Update existing response
    await db.interactiveStopResponse.update({
      where: { id: existingResponse.id },
      data: {
        response: response as any,
        isCorrect,
        respondedAt: new Date(),
      },
    });
  } else {
    // Create new response
    await db.interactiveStopResponse.create({
      data: {
        lessonProgressId,
        interactiveStopId: stopId,
        response: response as any,
        isCorrect,
      },
    });
  }

  return { success: true, isCorrect };
}
