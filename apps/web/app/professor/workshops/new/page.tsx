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
          Sesiones y Talleres
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva Sesión o Taller
        </h1>
        <p className="mt-1 text-text-secondary">
          Crea una sesión presencial, virtual o híbrida para tus alumnos.
        </p>
      </div>

      <WorkshopForm courses={courses} />
    </div>
  );
}
