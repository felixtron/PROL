import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  ArrowRight,
  Crown,
  ListChecks,
} from "lucide-react";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { getMyCompany, getCompanyTeamReport } from "@/lib/queries/company";
import { getCompanyEvaluations } from "@/lib/queries/evaluation";
import { InviteMemberForm } from "./invite-member-form";
import { TeamReport } from "./team-report";
import { EvaluationsPanel } from "./evaluations-panel";

export const dynamic = "force-dynamic";

export default async function MyCompanyPage() {
  const [user, company] = await Promise.all([
    getCurrentUser(),
    getMyCompany(),
  ]);

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-text-tertiary" />
          <h2 className="mt-4 font-heading text-lg font-semibold text-text-primary">
            No perteneces a ninguna empresa
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Si recibiste una invitación, abre el link que te enviaron por email.
          </p>
        </div>
      </div>
    );
  }

  const isLeader = user?.id === company.leaderId;
  const canInvite = isLeader || company.allowMemberInvitations;
  const teamReport = isLeader ? await getCompanyTeamReport(company.id) : null;

  // Tenant-gated features for the leader: evaluations and surveys. Both
  // are read in a single tenant fetch so we don't double-roundtrip when
  // the leader opens this page.
  let evaluationsData: Awaited<ReturnType<typeof getCompanyEvaluations>> | null =
    null;
  let allMembers: { id: string; name: string | null; email: string; avatar: string | null }[] = [];
  let surveysCount = 0;
  let surveysEnabled = false;
  if (isLeader && user?.tenantId) {
    const tenantFlag = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { evaluationsEnabled: true, surveysEnabled: true },
    });
    if (tenantFlag?.evaluationsEnabled) {
      [evaluationsData, allMembers] = await Promise.all([
        getCompanyEvaluations(company.id),
        db.user.findMany({
          where: { companyId: company.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, avatar: true },
        }),
      ]);
    }
    if (tenantFlag?.surveysEnabled) {
      surveysEnabled = true;
      surveysCount = await db.survey.count({
        where: { companyId: company.id },
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-6">
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
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {company.name}
            </h1>
            {isLeader && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                <Crown className="h-3 w-3" />
                Líder
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-tertiary">
            {company._count.members} miembro{company._count.members !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Team report — only for the company leader */}
      {teamReport && (
        <TeamReport
          members={teamReport.members}
          assignments={teamReport.assignments}
          workshopsByCourse={teamReport.workshopsByCourse}
        />
      )}

      {/* Evaluations panel — leader only, tenant-gated */}
      {evaluationsData && (
        <EvaluationsPanel
          companyId={company.id}
          leaderId={company.leaderId}
          assignments={evaluationsData.assignments}
          members={allMembers}
        />
      )}

      {/* Surveys panel — leader only, tenant-gated. Links to the full
          surveys CRUD under /dashboard/company/surveys. */}
      {surveysEnabled && (
        <Link
          href="/dashboard/company/surveys"
          className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-surface-secondary"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <ListChecks className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Encuestas
              </h2>
              <p className="mt-0.5 text-sm text-text-tertiary">
                {surveysCount === 0
                  ? "Crea tu primera encuesta para recolectar feedback."
                  : `${surveysCount} encuesta${surveysCount !== 1 ? "s" : ""} de tu empresa. Crea más o revisa resultados.`}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Cursos disponibles */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <GraduationCap className="h-4 w-4 text-primary-600" />
            Cursos disponibles para ti
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Tu empresa ya pagó por estos cursos. Inscríbete sin costo.
          </p>
        </div>
        {company.courseAssignments.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            Tu empresa aún no tiene cursos asignados.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {company.courseAssignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {a.course.thumbnail ? (
                    <img
                      src={a.course.thumbnail}
                      alt={a.course.title}
                      className="h-12 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded bg-primary-100">
                      <GraduationCap className="h-5 w-5 text-primary-700" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">
                      {a.course.title}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {a.course.totalLessons} lecciones · gratis para tu empresa
                    </p>
                  </div>
                </div>
                <Link
                  href={`/courses/${a.course.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Ver curso
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Compañeros */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <Users className="h-4 w-4 text-primary-600" />
            Compañeros
          </h2>
        </div>
        {company.members.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            Eres el único miembro de esta empresa por ahora.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 p-2 md:grid-cols-2">
            {company.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface-secondary"
              >
                {m.avatar ? (
                  <img
                    src={m.avatar}
                    alt={m.name ?? m.email}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {(m.name ?? m.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {m.name ?? m.email}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canInvite && (
        <InviteMemberForm
          companyId={company.id}
          hint={
            isLeader
              ? "Como líder de la empresa puedes invitar a nuevos compañeros."
              : "Tu empresa permite que sus miembros inviten a más personas."
          }
        />
      )}
    </div>
  );
}
