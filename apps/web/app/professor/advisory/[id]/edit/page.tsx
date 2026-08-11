import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getAdvisorSessionDetail,
  getAdvisoryAudienceOptions,
} from "@/lib/queries/advisory";
import { getMeetAutoGenerationAvailable } from "@/lib/queries/workshop";
import { AdvisoryForm } from "../../new/advisory-form";

export default async function EditAdvisoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, { companies, users }, meetAvailable] = await Promise.all([
    getAdvisorSessionDetail(id),
    getAdvisoryAudienceOptions(),
    getMeetAutoGenerationAvailable(),
  ]);

  if (!session) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/professor/advisory/${id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al proyecto
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Editar proyecto
        </h1>
        <p className="mt-1 text-text-secondary">
          {session.status === "DRAFT"
            ? "Este proyecto es un borrador: nadie lo ha visto todavía."
            : "Los cambios de fecha u hora se avisarán por correo a los destinatarios."}
        </p>
      </div>

      <AdvisoryForm
        companies={companies}
        users={users}
        meetAvailable={meetAvailable}
        initial={{
          id: session.id,
          title: session.title,
          description: session.description,
          type: session.type,
          audience: session.audience,
          companyId: session.company?.id ?? null,
          participantIds: session.participants.map((p) => p.id),
          startTime: session.startTime,
          endTime: session.endTime,
          locationName: session.locationName,
          locationAddress: session.locationAddress,
          locationMapUrl: session.locationMapUrl,
          meetingUrl: session.meetingUrl,
          status: session.status,
          invitedAt: session.invitedAt,
        }}
      />
    </div>
  );
}
