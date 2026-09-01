import { redirect } from "next/navigation";
import { listAgendaForStaff } from "@/lib/queries/evidence";
import { StaffAgenda } from "@/components/staff-agenda";

export const dynamic = "force-dynamic";

export default async function TenantAdminAgendaPage() {
  const rows = await listAgendaForStaff().catch(() => null);
  if (!rows) redirect("/tenant-admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="mt-1 text-text-secondary">
          Actividades de cumplimiento con fecha comprometida en todas las empresas
          del tenant.
        </p>
      </div>
      <StaffAgenda rows={rows} basePath="/tenant-admin/projects" />
    </div>
  );
}
