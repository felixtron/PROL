import { task } from "@trigger.dev/sdk/v3";
import { db } from "@prol/db";
import {
  submitVideoForTranscription,
  checkTranscriptionStatus,
  enhanceTranscript,
} from "@prol/content-factory";

export const processVideoTranscription = task({
  id: "process-video-transcription",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    lessonId: string;
    videoUrl: string;
    jobId: string;
    courseContext?: string;
  }) => {
    const { lessonId, videoUrl, jobId, courseContext } = payload;

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
      // 2. Submit to AssemblyAI
      const submission = await submitVideoForTranscription(videoUrl);

      // 3. Poll for completion
      let result = await checkTranscriptionStatus(submission.id);
      while (result.status === "queued" || result.status === "processing") {
        await new Promise((r) => setTimeout(r, 5000));
        result = await checkTranscriptionStatus(submission.id);
      }

      if (result.status === "error") {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      // 4. Get lesson title for context
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true },
      });

      // 5. Enhance with AI (generate interactive stops, quiz suggestions)
      const enhanced = await enhanceTranscript(
        result.text ?? "",
        result.summary,
        lesson?.title ?? "Leccion",
        courseContext,
      );

      // 6. Save results to DB
      await db.lesson.update({
        where: { id: lessonId },
        data: {
          transcript: (result.words ?? result.text) || undefined,
          summary: enhanced.summary ?? result.summary,
          aiGenerated: true,
          aiStatus: "completed",
        },
      });

      // 7. Mark job as COMPLETED
      const output = {
        transcriptLength: result.text?.length ?? 0,
        summary: enhanced.summary,
        suggestedStops: enhanced.suggestedStops,
        quizSuggestions: enhanced.quizSuggestions,
      };

      await db.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          output,
          completedAt: new Date(),
        },
      });

      return { success: true, output };
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
