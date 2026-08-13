import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdvisorSessionDetail } from "@/lib/queries/advisory";
import { AdvisoryDetail } from "./advisory-detail";
import { requireAdvisoryEnabled } from "@/lib/advisory-access";

export default async function AdvisorySessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdvisoryEnabled("/professor");

  const session = await getAdvisorSessionDetail(id);

  if (!session) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/professor/advisory"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Consultoría Online
      </Link>

      <AdvisoryDetail session={session} />
    </div>
  );
}
