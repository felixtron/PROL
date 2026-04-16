import { notFound } from "next/navigation";
import { getProfessorWorkshopDetail } from "@/lib/queries/workshop";
import { WorkshopDetail } from "./workshop-detail";

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workshop = await getProfessorWorkshopDetail(id);

  if (!workshop) notFound();

  return <WorkshopDetail workshop={workshop} />;
}
