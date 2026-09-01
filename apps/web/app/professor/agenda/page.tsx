import { redirect } from "next/navigation";
import { listAgendaForStaff } from "@/lib/queries/evidence";
import { StaffAgenda } from "@/components/staff-agenda";

export const dynamic = "force-dynamic";

export default async function ProfessorAgendaPage() {
  const rows = await listAgendaForStaff().catch(() => null);
  if (!rows) redirect("/professor");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="mt-1 text-text-secondary">
          Actividades de cumplimiento con fecha comprometida en las empresas que
          acompañas.
        </p>
      </div>
      <StaffAgenda rows={rows} basePath="/professor/projects" />
    </div>
  );
}
