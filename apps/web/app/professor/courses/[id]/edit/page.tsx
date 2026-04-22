import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCourseForEdit } from "@/lib/queries/course";
import { getTenantAIStatus } from "@/lib/queries/ai";
import { CourseEditor } from "./course-editor";

const statusStyles: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-surface-tertiary text-text-secondary",
  ARCHIVED: "bg-amber-50 text-amber-700",
  REVIEW: "bg-blue-50 text-blue-700",
};

const statusLabels: Record<string, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
  REVIEW: "En Revisión",
};

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course, { aiEnabled }] = await Promise.all([
    getCourseForEdit(id),
    getTenantAIStatus(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/professor/courses"
            className="rounded-lg border border-border bg-surface p-2 text-text-secondary transition-colors hover:bg-surface-tertiary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-text-primary">
                {course.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${statusStyles[course.status] ?? statusStyles.DRAFT}`}
              >
                {statusLabels[course.status] ?? course.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-text-tertiary">
              Edita el contenido y la configuración de tu curso
            </p>
          </div>
        </div>
      </div>

      {/* Course Editor */}
      <CourseEditor course={{ ...course, aiEnabled }} />
    </div>
  );
}
