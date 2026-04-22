import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
import {
  listTenantUsers,
  listTenantCompaniesForFilter,
} from "@/lib/queries/tenant-users";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    company?: string;
    disabled?: string;
  }>;
}) {
  const sp = await searchParams;
  const role: "STUDENT" | "PROFESSOR" | "ADMIN" | undefined =
    sp.role === "STUDENT" || sp.role === "PROFESSOR" || sp.role === "ADMIN"
      ? sp.role
      : undefined;
  const filter = {
    search: sp.q,
    role,
    companyId: sp.company,
    disabled:
      sp.disabled === "true" ? true : sp.disabled === "false" ? false : undefined,
  };

  const [users, companies] = await Promise.all([
    listTenantUsers(filter),
    listTenantCompaniesForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Usuarios
          </h1>
          <p className="mt-1 text-text-secondary">
            Gestiona los usuarios de tu academia: altas, bajas y edicion.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/tenant-admin/users/import"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Link>
          <Link
            href="/tenant-admin/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Link>
        </div>
      </div>

      {users.length === 0 && !sp.q && !sp.role && !sp.company ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-text-tertiary" />
          <h2 className="mt-4 font-heading text-lg font-semibold text-text-primary">
            No hay usuarios en tu academia
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Crea el primer usuario o importa una lista desde CSV.
          </p>
        </div>
      ) : (
        <UsersTable
          users={users}
          companies={companies}
          initialFilter={filter}
        />
      )}
    </div>
  );
}
