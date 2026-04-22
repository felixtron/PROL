import { z } from "zod";

// ─── Block definitions for MULTI lessons ──────────────────────────────────────

/**
 * Every block shares an id and a type. The UI renders them sequentially,
 * and completion tracking happens per-block via LessonProgress.metadata.
 *
 * PDF block embeds a URL directly (uploaded via /api/upload/pdf or pasted).
 * Video block reuses the same provider system as top-level lesson videos.
 * Quiz block references an existing Quiz by id (created by the QuizBuilder).
 * Text block stores short markdown inline.
 */

export const videoBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  title: z.string().optional(),
  provider: z.enum(["CLOUDFLARE", "VIMEO_URL", "VIMEO_UPLOAD", "YOUTUBE"]),
  videoUrl: z.string(), // CF uid, Vimeo video id, or YouTube video id
  // Vimeo: privacy hash. YouTube: serialized start offset (seconds).
  videoHash: z.string().nullable().optional(),
  durationSeconds: z.number().int().positive().nullable().optional(),
});

export const pdfBlockSchema = z.object({
  id: z.string(),
  type: z.literal("pdf"),
  title: z.string().min(1),
  url: z.string().url(),
  sizeBytes: z.number().int().positive().nullable().optional(),
  filename: z.string().optional(),
});

export const textBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  title: z.string().optional(),
  content: z.string(), // markdown
});

export const quizBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quiz"),
  quizId: z.string(),
  title: z.string().optional(),
});

export const lessonBlockSchema = z.discriminatedUnion("type", [
  videoBlockSchema,
  pdfBlockSchema,
  textBlockSchema,
  quizBlockSchema,
]);

export const multiLessonContentSchema = z.object({
  blocks: z.array(lessonBlockSchema).max(20),
});

export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type PdfBlock = z.infer<typeof pdfBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type QuizBlock = z.infer<typeof quizBlockSchema>;
export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type MultiLessonContent = z.infer<typeof multiLessonContentSchema>;

// ─── Block completion tracking ────────────────────────────────────────────────

/**
 * Stored in LessonProgress.metadata for MULTI lessons.
 * `blockProgress[blockId] = true` when the block is considered done.
 */
export interface MultiLessonProgressMetadata {
  blockProgress?: Record<string, boolean>;
}

export function isMultiLessonContent(
  content: unknown
): content is MultiLessonContent {
  return multiLessonContentSchema.safeParse(content).success;
}

export function allBlocksComplete(
  content: MultiLessonContent,
  metadata: MultiLessonProgressMetadata | null | undefined
): boolean {
  if (!metadata?.blockProgress) return false;
  return content.blocks.every((b) => metadata.blockProgress![b.id] === true);
}
