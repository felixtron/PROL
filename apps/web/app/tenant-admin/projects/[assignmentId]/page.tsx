import { notFound } from "next/navigation";
import { getAssignmentPanel } from "@/lib/queries/manual";
import { CompanyProjectPanel } from "@/components/company-project-panel";

export const dynamic = "force-dynamic";

export default async function TenantAdminProjectPanelPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const data = await getAssignmentPanel(assignmentId).catch(() => null);
  if (!data) notFound();

  return (
    <CompanyProjectPanel
      data={data}
      backHref="/tenant-admin/projects"
      evidenceBasePath="/tenant-admin/evidence"
      canEditDueDates
    />
  );
}
