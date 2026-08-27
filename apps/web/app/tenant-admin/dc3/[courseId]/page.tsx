import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseDc3Detail } from "@/lib/queries/dc3";
import { Dc3ConfigForm } from "./config-form";
import { Dc3EditionsManager } from "./editions-manager";
import { Dc3StudentsTable } from "./students-table";

export const dynamic = "force-dynamic";

export default async function CourseDc3Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const detail = await getCourseDc3Detail(courseId);

  if (!detail) notFound();

  const { course, agents, editions, students } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tenant-admin/dc3"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Constancias DC-3
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
          {course.title}
        </h1>
      </div>

      <Dc3ConfigForm course={course} agents={agents} />

      <Dc3EditionsManager
        courseId={course.id}
        editions={editions}
        deliveryMode={course.dc3DeliveryMode}
      />

      <Dc3StudentsTable
        students={students}
        editions={editions.map((e) => ({ id: e.id, name: e.name }))}
        deliveryMode={course.dc3DeliveryMode}
      />
    </div>
  );
}
