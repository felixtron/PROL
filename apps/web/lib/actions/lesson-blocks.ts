"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import {
  multiLessonContentSchema,
  lessonBlockSchema,
  type LessonBlock,
  type MultiLessonContent,
  type MultiLessonProgressMetadata,
} from "@prol/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOwnedMultiLesson(lessonId: string, userId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, professorId: true } },
        },
      },
    },
  });
  if (!lesson) throw new Error("Lección no encontrada");
  if (lesson.module.course.professorId !== userId) {
    throw new Error("No autorizado");
  }
  return lesson;
}

function readContent(content: unknown): MultiLessonContent {
  const parsed = multiLessonContentSchema.safeParse(content);
  return parsed.success ? parsed.data : { blocks: [] };
}

function genBlockId(): string {
  return "blk_" + crypto.randomBytes(8).toString("hex");
}

async function writeBlocks(
  lessonId: string,
  blocks: LessonBlock[],
  courseId: string
) {
  const content: MultiLessonContent = { blocks };
  // Validate before persisting
  multiLessonContentSchema.parse(content);
  await db.lesson.update({
    where: { id: lessonId },
    data: { content: content as unknown as Prisma.InputJsonValue },
  });
  revalidatePath(`/professor/courses/${courseId}/edit`);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

// A block payload without the id (server generates it). Plain Omit on the
// union collapses to a non-discriminated shape and breaks type narrowing,
// so we Omit each member of the union explicitly.
export type NewBlockInput =
  | Omit<Extract<LessonBlock, { type: "video" }>, "id">
  | Omit<Extract<LessonBlock, { type: "pdf" }>, "id">
  | Omit<Extract<LessonBlock, { type: "text" }>, "id">
  | Omit<Extract<LessonBlock, { type: "quiz" }>, "id">;

export async function addBlockToLesson(
  lessonId: string,
  input: NewBlockInput
) {
  const user = await requireUser();
  const lesson = await getOwnedMultiLesson(lessonId, user.id);
  if (lesson.type !== "MULTI") {
    throw new Error("Esta acción solo aplica a lecciones multiformato");
  }

  const blockWithId = { ...input, id: genBlockId() } as LessonBlock;
  lessonBlockSchema.parse(blockWithId); // validate

  const existing = readContent(lesson.content);
  if (existing.blocks.length >= 20) {
    throw new Error("Una lección no puede tener más de 20 bloques");
  }

  // Quiz blocks must reference a real quiz owned by the professor's course.
  if (blockWithId.type === "quiz") {
    const quiz = await db.quiz.findUnique({
      where: { id: blockWithId.quizId },
      include: {
        lesson: {
          select: { module: { select: { courseId: true } } },
        },
      },
    });
    if (!quiz || quiz.lesson.module.courseId !== lesson.module.course.id) {
      throw new Error("Quiz no encontrado en este curso");
    }
  }

  const blocks: LessonBlock[] = [...existing.blocks, blockWithId];
  await writeBlocks(lessonId, blocks, lesson.module.course.id);

  return { success: true, blockId: blockWithId.id };
}

export async function updateBlock(
  lessonId: string,
  blockId: string,
  patch: Partial<Omit<LessonBlock, "id" | "type">>
) {
  const user = await requireUser();
  const lesson = await getOwnedMultiLesson(lessonId, user.id);

  const existing = readContent(lesson.content);
  const idx = existing.blocks.findIndex((b) => b.id === blockId);
  if (idx < 0) throw new Error("Bloque no encontrado");

  const current = existing.blocks[idx]!;
  const updated = { ...current, ...patch } as LessonBlock;
  lessonBlockSchema.parse(updated); // validate

  const blocks = [...existing.blocks];
  blocks[idx] = updated;
  await writeBlocks(lessonId, blocks, lesson.module.course.id);
  return { success: true };
}

export async function removeBlock(lessonId: string, blockId: string) {
  const user = await requireUser();
  const lesson = await getOwnedMultiLesson(lessonId, user.id);

  const existing = readContent(lesson.content);
  const blocks = existing.blocks.filter((b) => b.id !== blockId);
  await writeBlocks(lessonId, blocks, lesson.module.course.id);
  return { success: true };
}

export async function reorderBlocks(
  lessonId: string,
  orderedIds: string[]
) {
  const user = await requireUser();
  const lesson = await getOwnedMultiLesson(lessonId, user.id);

  const existing = readContent(lesson.content);
  const map = new Map(existing.blocks.map((b) => [b.id, b]));
  const reordered: LessonBlock[] = [];
  for (const id of orderedIds) {
    const b = map.get(id);
    if (b) reordered.push(b);
  }
  // Append any blocks not included in orderedIds (defensive)
  for (const b of existing.blocks) {
    if (!orderedIds.includes(b.id)) reordered.push(b);
  }

  await writeBlocks(lessonId, reordered, lesson.module.course.id);
  return { success: true };
}

// ─── Student block-progress tracking ──────────────────────────────────────────

/**
 * Called by the student's course player when a block is completed.
 * Persists the flag under LessonProgress.metadata.blockProgress[blockId].
 * When ALL blocks are complete, marks the lesson COMPLETED.
 */
export async function markBlockComplete(
  enrollmentId: string,
  lessonId: string,
  blockId: string
) {
  const user = await requireUser();

  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, studentId: user.id },
    select: { id: true, tenantId: true, courseId: true },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson || lesson.module.courseId !== enrollment.courseId) {
    throw new Error("Lección inválida");
  }

  const content = readContent(lesson.content);
  if (!content.blocks.some((b) => b.id === blockId)) {
    throw new Error("Bloque no encontrado");
  }

  // Upsert progress + merge metadata
  const progress = await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    create: {
      enrollmentId,
      lessonId,
      status: "IN_PROGRESS",
      metadata: {
        blockProgress: { [blockId]: true },
      } as unknown as Prisma.InputJsonValue,
    },
    update: {}, // handled below to merge existing metadata
  });

  const currentMeta =
    (progress.metadata as unknown as MultiLessonProgressMetadata | null) ?? {};
  const nextBlockProgress = {
    ...(currentMeta.blockProgress ?? {}),
    [blockId]: true,
  };

  const allDone = content.blocks.every((b) => nextBlockProgress[b.id] === true);

  await db.lessonProgress.update({
    where: { id: progress.id },
    data: {
      metadata: {
        ...currentMeta,
        blockProgress: nextBlockProgress,
      } as unknown as Prisma.InputJsonValue,
      ...(allDone
        ? { status: "COMPLETED", completedAt: new Date() }
        : progress.status === "NOT_STARTED"
          ? { status: "IN_PROGRESS" }
          : {}),
    },
  });

  revalidatePath(`/dashboard/courses/${enrollment.courseId}`);
  return { success: true, allDone };
}
