import Link from "next/link";
import { ArrowLeft, Building2, Users, GraduationCap, Mail, Crown } from "lucide-react";
import {
  getCompanyDetail,
  listAssignableUsersForTenant,
  listAssignableCoursesForCompany,
} from "@/lib/queries/company";
import { MembersTab } from "./members-tab";
import { CoursesTab } from "./courses-tab";
import { InvitationsTab } from "./invitations-tab";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "members" } = await searchParams;

  const company = await getCompanyDetail(id);
  const [assignableUsers, assignableCourses] = await Promise.all([
    listAssignableUsersForTenant(id),
    listAssignableCoursesForCompany(id),
  ]);

  const tabs = [
    { id: "members", label: "Miembros", icon: Users, count: company._count.members },
    { id: "courses", label: "Cursos asignados", icon: GraduationCap, count: company._count.courseAssignments },
    { id: "invitations", label: "Invitaciones", icon: Mail, count: company.invitations.length },
  ] as const;

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
        <div className="mt-2 flex items-start gap-4">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100">
              <Building2 className="h-7 w-7 text-primary-700" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {company.name}
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {company.contactEmail ?? "Sin email de contacto"}
              {" · "}
              {company.seatsLimit
                ? `${company._count.members}/${company.seatsLimit} miembros`
                : `${company._count.members} miembros`}
              {company.allowMemberInvitations && " · auto-invitaciones activas"}
            </p>
            {company.leaderId &&
              (() => {
                const leader = company.members.find(
                  (m) => m.id === company.leaderId
                );
                return leader ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                    <Crown className="h-3 w-3" />
                    Líder: {leader.name ?? leader.email}
                  </p>
                ) : null;
              })()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <Link
              key={t.id}
              href={`/tenant-admin/companies/${id}?tab=${t.id}`}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span
                className={`rounded-pill px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-primary-100 text-primary-800"
                    : "bg-surface-tertiary text-text-tertiary"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <div>
        {tab === "members" && (
          <MembersTab
            companyId={company.id}
            members={company.members}
            assignableUsers={assignableUsers}
            seatsLimit={company.seatsLimit}
            leaderId={company.leaderId}
          />
        )}
        {tab === "courses" && (
          <CoursesTab
            companyId={company.id}
            assignments={company.courseAssignments}
            assignableCourses={assignableCourses}
          />
        )}
        {tab === "invitations" && (
          <InvitationsTab
            companyId={company.id}
            invitations={company.invitations}
            allowMemberInvitations={company.allowMemberInvitations}
          />
        )}
      </div>
    </div>
  );
}
