import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Users } from "lucide-react";
import { getCourseQuizResults } from "@/lib/queries/quiz-results";
import { ResultsTable } from "./results-table";

export default async function CourseResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // `getCourseQuizResults` lanza si el profesor no tiene acceso al curso o si
  // el curso no existe; en ambos casos la respuesta correcta es un 404, no un
  // error de servidor.
  let data;
  try {
    data = await getCourseQuizResults(id);
  } catch {
    notFound();
  }

  const finalExam = data.quizzes.find((q) => q.isFinalExam) ?? null;
  const approvedFinal = data.students.filter((s) => s.finalPassed).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/professor/courses"
            aria-label="Volver a mis cursos"
            className="shrink-0 rounded-lg border border-border bg-surface p-2 text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-bold text-text-primary">
              Resultados de evaluación
            </h1>
            <p className="mt-1 truncate text-text-secondary">
              {data.course.title}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
            <Users className="h-4 w-4" />
            {data.students.length} inscrito
            {data.students.length !== 1 ? "s" : ""}
          </span>
          {finalExam && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Award className="h-4 w-4" />
              {approvedFinal} aprobaron el final
            </span>
          )}
          <Link
            href={`/professor/courses/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            Editar curso
          </Link>
        </div>
      </div>

      <ResultsTable data={data} />
    </div>
  );
}
