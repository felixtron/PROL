import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfessorCourseOptions } from "@/lib/queries/workshop";
import { WorkshopForm } from "./workshop-form";

export default async function NewWorkshopPage() {
  const courses = await getProfessorCourseOptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/professor/workshops"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Workshops
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nuevo Workshop
        </h1>
        <p className="mt-1 text-text-secondary">
          Crea una sesion presencial, virtual o hibrida para tus alumnos.
        </p>
      </div>

      <WorkshopForm courses={courses} />
    </div>
  );
}
