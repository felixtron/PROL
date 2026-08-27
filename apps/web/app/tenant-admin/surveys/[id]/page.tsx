import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAdmin } from "@/lib/survey-access";
import {
  getSurveyForAdmin,
  listCompaniesForSurveyAdmin,
  listCoursesForSurveyAdmin,
  listEventsForSurveyAdmin,
} from "@/lib/queries/survey";
import { SurveyEditor } from "./survey-editor";

export const dynamic = "force-dynamic";

const EVENT_DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export default async function AdminSurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSurveyAdmin();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/tenant-admin");
  }

  const [survey, companies, courses, events] = await Promise.all([
    getSurveyForAdmin(id),
    listCompaniesForSurveyAdmin(),
    listCoursesForSurveyAdmin(),
    listEventsForSurveyAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/tenant-admin/surveys"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Encuestas
      </Link>

      <SurveyEditor
        survey={{
          id: survey.id,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          defaultDurationDays: survey.defaultDurationDays,
          defaultReminderDays: survey.defaultReminderDays,
          trigger: survey.trigger,
          triggerCourseId: survey.triggerCourseId,
          questions: survey.questions,
          campaigns: survey.campaigns,
        }}
        companies={companies.map((c) => ({
          id: c.id,
          name: c.name,
          leaderId: c.leaderId,
          memberCount: c._count.members,
        }))}
        courses={courses.map((c) => ({ id: c.id, name: c.title }))}
        workshops={events.workshops.map((w) => ({
          id: w.id,
          name: `${w.title} · ${EVENT_DATE.format(w.startTime)}`,
        }))}
        advisory={events.advisory.map((a) => ({
          id: a.id,
          name: `${a.title} · ${EVENT_DATE.format(a.startTime)}`,
        }))}
      />
    </div>
  );
}
