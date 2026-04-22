import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompanyForm } from "./company-form";

export default function NewCompanyPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tenant-admin/companies"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Empresas
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
          Nueva empresa
        </h1>
        <p className="mt-1 text-text-secondary">
          Crea una empresa para agrupar a sus alumnos y asignarles cursos.
        </p>
      </div>

      <div className="max-w-xl">
        <CompanyForm />
      </div>
    </div>
  );
}
