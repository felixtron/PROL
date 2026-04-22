import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listTenantCompaniesForFilter } from "@/lib/queries/tenant-users";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const companies = await listTenantCompaniesForFilter();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tenant-admin/users"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Usuarios
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
          Nuevo usuario
        </h1>
        <p className="mt-1 text-text-secondary">
          Se enviara un email con una contrasena temporal. El usuario tendra que
          cambiarla en su primer inicio de sesion.
        </p>
      </div>

      <div className="max-w-xl">
        <NewUserForm companies={companies} />
      </div>
    </div>
  );
}
