import { notFound } from "next/navigation";
import { getEvidenceDetail } from "@/lib/queries/evidence";
import { EvidenceDetail } from "@/components/evidence-detail";
import { isManualAdmin } from "@/lib/manual-access";

export const dynamic = "force-dynamic";

export default async function TenantAdminEvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEvidenceDetail(id).catch(() => null);
  if (!data) notFound();

  return (
    <EvidenceDetail
      data={data}
      backHref="/tenant-admin/evidence"
      canResolveDeletion={isManualAdmin(data.user)}
    />
  );
}
