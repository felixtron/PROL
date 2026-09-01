import { redirect } from "next/navigation";
import { listEvidenceQueue } from "@/lib/queries/evidence";
import { EvidenceQueue } from "@/components/evidence-queue";

export const dynamic = "force-dynamic";

export default async function TenantAdminEvidencePage() {
  const rows = await listEvidenceQueue().catch(() => null);
  if (!rows) redirect("/tenant-admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Evidencias
        </h1>
        <p className="mt-1 text-text-secondary">
          Revisa, aprueba o devuelve las evidencias que entregan las empresas.
        </p>
      </div>
      <EvidenceQueue rows={rows} basePath="/tenant-admin/evidence" />
    </div>
  );
}
