import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCompanyDetail } from "@/lib/queries/company";
import { CompanyForm } from "../../new/company-form";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyDetail(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/tenant-admin/companies/${id}`}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {company.name}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
          Editar empresa
        </h1>
        <p className="mt-1 text-text-secondary">
          Actualiza los datos generales. Los miembros y cursos se gestionan
          desde la vista de la empresa.
        </p>
      </div>

      <div className="max-w-xl">
        <CompanyForm
          initial={{
            id: company.id,
            name: company.name,
            contactEmail: company.contactEmail,
            seatsLimit: company.seatsLimit,
            allowMemberInvitations: company.allowMemberInvitations,
          }}
        />
      </div>
    </div>
  );
}
