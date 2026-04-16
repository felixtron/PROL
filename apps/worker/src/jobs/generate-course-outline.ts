import { task } from "@trigger.dev/sdk/v3";
import { db } from "@prol/db";
import { generateCourseOutline } from "@prol/content-factory";

export const generateCourseOutlineJob = task({
  id: "generate-course-outline",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    jobId: string;
    tenantId: string;
    professorId: string;
    topic: string;
    audience: string;
    moduleCount: number;
    lessonsPerModule: number;
    level?: "beginner" | "intermediate" | "advanced";
  }) => {
    const { jobId, tenantId, professorId, topic, audience, moduleCount, lessonsPerModule, level } = payload;

    // 1. Mark job as PROCESSING
    await db.aIGenerationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    try {
      // 2. Generate course outline via AI
      const outline = await generateCourseOutline({
        topic,
        audience,
        moduleCount,
        lessonsPerModule,
        level,
      });

      // 3. Create course + modules + lessons in DB
      const course = await db.course.create({
        data: {
          tenantId,
          professorId,
          title: outline.title,
          slug: outline.title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          description: outline.description,
          status: "DRAFT",
          priceInCents: 0,
          totalLessons: outline.modules.reduce((sum, m) => sum + m.lessons.length, 0),
          modules: {
            create: outline.modules.map((mod, mi) => ({
              title: mod.title,
              description: mod.description,
              position: mi + 1,
              isPublished: false,
              lessons: {
                create: mod.lessons.map((lesson, li) => ({
                  title: lesson.title,
                  type: lesson.type,
                  position: li + 1,
                  isPublished: false,
                  aiGenerated: true,
                  aiStatus: "completed",
                })),
              },
            })),
          },
        },
      });

      // 4. Mark job as COMPLETED
      await db.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          output: outline,
          entityType: "course",
          entityId: course.id,
          completedAt: new Date(),
        },
      });

      return { success: true, courseId: course.id, outline };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

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
