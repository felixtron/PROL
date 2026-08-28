import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdvisoryAudienceOptions } from "@/lib/queries/advisory";
import { getMeetAutoGenerationAvailable } from "@/lib/queries/workshop";
import { AdvisoryForm } from "./advisory-form";
import { requireAdvisoryEnabled } from "@/lib/advisory-access";

export default async function NewAdvisoryPage() {
  await requireAdvisoryEnabled("/professor");

  const [{ companies, users }, meetAvailable] = await Promise.all([
    getAdvisoryAudienceOptions(),
    getMeetAutoGenerationAvailable(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/professor/advisory"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Consultoría Online
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva sesión
        </h1>
        <p className="mt-1 text-text-secondary">
          Agenda un proyecto de acompañamiento con una empresa o con personas específicas.
        </p>
      </div>

      <AdvisoryForm
        companies={companies}
        users={users}
        meetAvailable={meetAvailable}
      />
    </div>
  );
}
