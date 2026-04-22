import { Calendar } from "lucide-react";
import {
  getStudentWorkshops,
  getAvailableWorkshops,
} from "@/lib/queries/workshop";
import { WorkshopList } from "./workshop-list";

export default async function StudentWorkshopsPage() {
  const [myWorkshops, available] = await Promise.all([
    getStudentWorkshops(),
    getAvailableWorkshops(),
  ]);

  const upcoming = myWorkshops.filter(
    (w) =>
      w.workshop.status === "SCHEDULED" || w.workshop.status === "CONFIRMED",
  );
  const past = myWorkshops.filter(
    (w) =>
      w.workshop.status === "COMPLETED" || w.workshop.status === "CANCELLED",
  );

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Workshops
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Sesiones presenciales y virtuales con tus profesores.
        </p>
      </div>

      {upcoming.length === 0 && available.length === 0 && past.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center md:p-12">
          <Calendar className="mx-auto h-8 w-8 text-text-tertiary md:h-10 md:w-10" />
          <p className="mt-2 text-sm font-medium text-text-secondary">
            No hay workshops disponibles
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Cuando tus profesores programen sesiones, aparecerán aquí.
          </p>
        </div>
      ) : (
        <WorkshopList
          upcoming={upcoming}
          available={available}
          past={past}
        />
      )}
    </div>
  );
}
