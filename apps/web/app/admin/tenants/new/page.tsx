import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewTenantForm } from "./new-tenant-form";

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tenants"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Tenants
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nuevo Tenant
        </h1>
        <p className="mt-1 text-text-secondary">
          Crea una nueva academia. El slug se genera a partir del nombre y
          puedes cambiarlo después desde el detalle.
        </p>
      </div>
      <NewTenantForm />
    </div>
  );
}
