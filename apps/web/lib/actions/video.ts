"use server";

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import {
  createDirectUploadUrl,
  getVideoDetails,
} from "@/lib/cloudflare-stream";
import { revalidatePath } from "next/cache";
import { parseVimeoUrl, parseYouTubeUrl, detectVideoUrl } from "@prol/shared";

/** Helper: verify the lesson belongs to a course owned by this professor */
async function getOwnedLesson(lessonId: string, userId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: { professorId: true, id: true },
          },
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

/** Create a direct upload URL for a lesson video (Cloudflare Stream) */
export async function createVideoUploadUrl(lessonId: string) {
  const user = await requireUser();
  const lesson = await getOwnedLesson(lessonId, user.id);

  const { uploadUrl, uid } = await createDirectUploadUrl({
    lessonId,
    courseId: lesson.module.course.id,
  });

  // Save the video UID and mark provider as CLOUDFLARE
  await db.lesson.update({
    where: { id: lessonId },
    data: {
      videoUrl: uid,
      videoProvider: "CLOUDFLARE",
      videoRawUrl: null,
      videoHash: null,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);

  return { uploadUrl, uid };
}

/**
 * Set a Vimeo video on a lesson from a pasted URL.
 * Fetches oEmbed metadata to validate the video exists and obtain duration.
 */
export async function setVideoFromVimeoUrl(lessonId: string, url: string) {
  const user = await requireUser();
  const lesson = await getOwnedLesson(lessonId, user.id);

  const parsed = parseVimeoUrl(url);
  if (!parsed) {
    throw new Error("URL de Vimeo inválida");
  }

  // Validate the video exists + get duration via Vimeo's oEmbed endpoint
  // (no API key required, works for any public/unlisted Vimeo video).
  let durationSeconds: number | undefined;
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(parsed.rawUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { duration?: number };
      if (typeof data.duration === "number" && data.duration > 0) {
        durationSeconds = data.duration;
      }
    } else if (res.status === 403 || res.status === 404) {
      throw new Error(
        "No se pudo acceder al video. Verifica que sea público o 'unlisted'."
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No se pudo")) {
      throw err;
    }
    // Network/parse errors: continue without duration
    console.warn("Vimeo oEmbed failed:", err);
  }

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      videoUrl: parsed.videoId,
      videoProvider: "VIMEO_URL",
      videoRawUrl: parsed.rawUrl,
      videoHash: parsed.hash,
      ...(durationSeconds
        ? { videoDurationSeconds: Math.round(durationSeconds) }
        : {}),
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);

  return {
    success: true,
    videoId: parsed.videoId,
    durationSeconds,
  };
}

/**
 * Set a YouTube video on a lesson from a pasted URL.
 * Uses YouTube's public oEmbed endpoint to validate existence.
 * Duration requires the YouTube Data API which needs a key — we skip it
 * and let the embed report its own length at playback time.
 */
export async function setVideoFromYouTubeUrl(lessonId: string, url: string) {
  const user = await requireUser();
  const lesson = await getOwnedLesson(lessonId, user.id);

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    throw new Error("URL de YouTube inválida");
  }

  // Validate existence via YouTube oEmbed (no API key required, public only).
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${parsed.videoId}`
    )}&format=json`;
    const res = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
    if (res.status === 401 || res.status === 404) {
      throw new Error(
        "No se pudo acceder al video. Verifica que sea público o 'no listado'."
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No se pudo")) {
      throw err;
    }
    console.warn("YouTube oEmbed failed:", err);
  }

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      videoUrl: parsed.videoId,
      videoProvider: "YOUTUBE",
      videoRawUrl: parsed.rawUrl,
      // Reuse videoHash column to store the start offset (serialized) —
      // avoids a schema migration and keeps the video block format clean.
      videoHash: parsed.startSeconds ? String(parsed.startSeconds) : null,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true, videoId: parsed.videoId };
}

/**
 * Unified setter that auto-detects the provider from the URL.
 * Accepts Vimeo or YouTube; rejects unknown hosts.
 */
export async function setVideoFromUrl(lessonId: string, url: string) {
  const detected = detectVideoUrl(url);
  if (!detected) {
    throw new Error(
      "URL no reconocida. Usa un link público de Vimeo o YouTube."
    );
  }
  if (detected.provider === "VIMEO_URL") {
    return setVideoFromVimeoUrl(lessonId, url);
  }
  return setVideoFromYouTubeUrl(lessonId, url);
}

/** Remove the video from a lesson */
export async function clearLessonVideo(lessonId: string) {
  const user = await requireUser();
  const lesson = await getOwnedLesson(lessonId, user.id);

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      videoUrl: null,
      videoProvider: null,
      videoRawUrl: null,
      videoHash: null,
      videoDurationSeconds: null,
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true };
}

/** Check video processing status (Cloudflare Stream only) */
export async function checkVideoStatus(lessonId: string) {
  const user = await requireUser();
  const lesson = await getOwnedLesson(lessonId, user.id);

  if (!lesson.videoUrl) return { status: "no_video" as const };

  // Vimeo videos are already processed when set via URL
  if (lesson.videoProvider !== "CLOUDFLARE") {
    return {
      status: "ready" as const,
      duration: lesson.videoDurationSeconds ?? 0,
    };
  }

  const details = await getVideoDetails(lesson.videoUrl);
  if (!details) return { status: "not_found" as const };

  // If ready, update the lesson duration
  if (details.readyToStream && details.duration > 0) {
    await db.lesson.update({
      where: { id: lessonId },
      data: { videoDurationSeconds: Math.round(details.duration) },
    });
  }

  return {
    status: details.readyToStream ? ("ready" as const) : ("processing" as const),
    duration: details.duration,
    pctComplete: details.status?.pctComplete,
  };
}
