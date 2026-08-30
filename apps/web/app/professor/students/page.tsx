import { Users } from "lucide-react";
import { getProfessorStudents } from "@/lib/queries/students";
import { StudentsTable } from "./students-table";

export default async function StudentsPage() {
  const students = await getProfessorStudents();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Mis Alumnos
          </h1>
          <p className="mt-1 text-text-secondary">
            Alumnos inscritos en tus cursos, con su avance por empresa.
          </p>
        </div>
        {students.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
            <Users className="h-4 w-4" />
            {students.length} alumno{students.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <StudentsTable rows={students} />
    </div>
  );
}
