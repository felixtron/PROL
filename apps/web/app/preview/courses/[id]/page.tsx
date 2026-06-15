import { notFound } from "next/navigation";
import { getStudentCourseDetail } from "@/lib/queries/course-detail";
import { CoursePlayer } from "@/app/dashboard/courses/[id]/course-player";

export const dynamic = "force-dynamic";

/**
 * Course preview for the course's professor or any tenant admin.
 * Lives outside /dashboard so it doesn't trigger the role redirect that
 * sends professors back to /professor. Re-uses the student CoursePlayer
 * with a synthetic enrollment id (`preview-...`) — server actions that
 * persist progress detect the prefix and no-op.
 */
export default async function CoursePreviewPage({
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

  const allLessons = data.modules.flatMap((m) => [
    ...m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })),
    ...m.submodules.flatMap((s) =>
      s.lessons.map((l) => ({ ...l, moduleId: s.id, moduleTitle: s.title })),
    ),
  ]);

  const mapLesson = (l: (typeof data.modules)[number]["lessons"][number]) => ({
    id: l.id,
    title: l.title,
    type: l.type as
      | "VIDEO"
      | "TEXT"
      | "QUIZ"
      | "ASSIGNMENT"
      | "MULTI"
      | "DOWNLOAD",
    position: l.position,
    videoDurationSeconds: l.videoDurationSeconds,
    videoUrl: l.videoUrl,
    videoProvider: l.videoProvider,
    videoHash: l.videoHash,
    content: l.content,
  });

  return (
    <CoursePlayer
      course={{
        id: data.course.id,
        title: `[Vista previa] ${data.course.title}`,
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
        lessons: m.lessons.map(mapLesson),
        submodules: m.submodules.map((s) => ({
          id: s.id,
          title: s.title,
          position: s.position,
          lessons: s.lessons.map(mapLesson),
        })),
      }))}
      enrollmentId={data.enrollment.id}
      progress={Math.round(data.progress * 100)}
      completedLessonIds={[]}
      totalLessons={allLessons.length}
      lessonProgressMap={new Map()}
    />
  );
}
