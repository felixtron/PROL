import { notFound } from "next/navigation";
import { getStudentCourseDetail } from "@/lib/queries/course-detail";
import { CoursePlayer } from "./course-player";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getStudentCourseDetail(id);
  } catch {
    notFound();
  }

  const allLessons = data.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      ...l,
      moduleId: m.id,
      moduleTitle: m.title,
    }))
  );

  const completedLessonIds = new Set(
    data.lessonProgress
      .filter((lp) => lp.status === "COMPLETED")
      .map((lp) => lp.lessonId)
  );

  // Create a map of lessonId to lessonProgressId
  const lessonProgressMap = new Map(
    data.lessonProgress.map((lp) => [lp.lessonId, lp.id])
  );

  return (
    <CoursePlayer
      course={{
        id: data.course.id,
        title: data.course.title,
        description: data.course.description,
        thumbnail: data.course.thumbnail,
      }}
      professor={{
        id: data.professor.id,
        name: data.professor.name,
        avatar: data.professor.avatar,
      }}
      modules={data.modules.map((m) => ({
        id: m.id,
        title: m.title,
        position: m.position,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type as "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT",
          position: l.position,
          videoDurationSeconds: l.videoDurationSeconds,
          videoUrl: l.videoUrl,
          videoProvider: l.videoProvider,
          videoHash: l.videoHash,
          content: l.content,
        })),
      }))}
      enrollmentId={data.enrollment.id}
      progress={Math.round(data.progress * 100)}
      completedLessonIds={Array.from(completedLessonIds)}
      totalLessons={allLessons.length}
      lessonProgressMap={lessonProgressMap}
    />
  );
}
