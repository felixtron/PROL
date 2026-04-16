import { task } from "@trigger.dev/sdk/v3";
import { db } from "@prol/db";
import { generateLessonContent } from "@prol/content-factory";

export const generateLessonContentJob = task({
  id: "generate-lesson-content",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    jobId: string;
    lessonId: string;
  }) => {
    const { jobId, lessonId } = payload;

    // 1. Mark job as PROCESSING
    await db.aIGenerationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    await db.lesson.update({
      where: { id: lessonId },
      data: { aiStatus: "processing" },
    });

    try {
      // 2. Get lesson context from DB
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: {
            include: {
              course: { select: { title: true, description: true } },
              lessons: {
                where: { position: { lt: 999 } },
                orderBy: { position: "asc" },
                select: { title: true, position: true },
              },
            },
          },
        },
      });

      if (!lesson) throw new Error("Leccion no encontrada");
      if (lesson.type === "VIDEO") throw new Error("No se puede generar contenido de texto para lecciones de video");

      // Get previous lesson titles for context
      const previousLessonTitles = lesson.module.lessons
        .filter((l) => l.position < lesson.position)
        .map((l) => l.title);

      // 3. Generate content via AI
      const result = await generateLessonContent({
        lessonTitle: lesson.title,
        lessonType: lesson.type as "TEXT" | "QUIZ" | "ASSIGNMENT",
        moduleTitle: lesson.module.title,
        courseTitle: lesson.module.course.title,
        courseDescription: lesson.module.course.description ?? undefined,
        previousLessonTitles,
      });

      // 4. Save content to lesson
      await db.lesson.update({
        where: { id: lessonId },
        data: {
          content: result.content,
          aiGenerated: true,
          aiStatus: "completed",
        },
      });

      // 5. Mark job as COMPLETED
      await db.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          output: { contentLength: result.content.length, type: result.type },
          entityType: "lesson",
          entityId: lessonId,
          completedAt: new Date(),
        },
      });

      return { success: true, contentLength: result.content.length };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      await db.lesson.update({
        where: { id: lessonId },
        data: { aiStatus: "failed" },
      });

      await db.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: errorMsg,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  },
});
