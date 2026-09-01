import { redirect } from "next/navigation";
import { listAssignmentsForStaff } from "@/lib/queries/manual";
import { ProjectsList } from "@/components/projects-list";

export const dynamic = "force-dynamic";

export default async function ProfessorProjectsPage() {
  const projects = await listAssignmentsForStaff().catch(() => null);
  if (!projects) redirect("/professor");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Proyectos
        </h1>
        <p className="mt-1 text-text-secondary">
          Cada empresa con un manual en implantación, su avance y lo que tiene
          esperando revisión.
        </p>
      </div>
      <ProjectsList projects={projects} basePath="/professor/projects" />
    </div>
  );
}
