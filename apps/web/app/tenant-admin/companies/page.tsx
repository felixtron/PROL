import Link from "next/link";
import { Building2, Plus, Users, GraduationCap, Mail } from "lucide-react";
import { listCompaniesForTenant } from "@/lib/queries/company";

export const dynamic = "force-dynamic";

export default async function CompaniesListPage() {
  const companies = await listCompaniesForTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Empresas
          </h1>
          <p className="mt-1 text-text-secondary">
            Agrupa a tus alumnos por organizaci&oacute;n cliente.
          </p>
        </div>
        <Link
          href="/tenant-admin/companies/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva empresa
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-text-tertiary" />
          <h2 className="mt-4 font-heading text-lg font-semibold text-text-primary">
            Aun no tienes empresas
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Crea una empresa para asignar cursos en grupo a sus alumnos.
          </p>
          <Link
            href="/tenant-admin/companies/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Crear primera empresa
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/tenant-admin/companies/${c.id}`}
              className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt={c.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                    <Building2 className="h-6 w-6 text-primary-700" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading text-base font-semibold text-text-primary">
                    {c.name}
                  </h3>
                  {c.contactEmail && (
                    <p className="mt-0.5 truncate text-xs text-text-tertiary">
                      {c.contactEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat
                  icon={Users}
                  value={c._count.members}
                  label="Miembros"
                  limit={c.seatsLimit ?? undefined}
                />
                <Stat
                  icon={GraduationCap}
                  value={c._count.courseAssignments}
                  label="Cursos"
                />
                <Stat
                  icon={Mail}
                  value={c._count.invitations}
                  label="Invites"
                />
              </div>
              {c.allowMemberInvitations && (
                <div className="mt-3 inline-flex items-center rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Auto-invitaciones activas
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  limit,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  limit?: number;
}) {
  return (
    <div className="rounded-lg bg-surface-secondary p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-text-tertiary" />
      <p className="mt-1 text-sm font-bold text-text-primary">
        {value}
        {limit !== undefined && (
          <span className="text-xs font-normal text-text-tertiary">/{limit}</span>
        )}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
    </div>
  );
}
