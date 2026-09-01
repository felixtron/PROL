import { redirect } from "next/navigation";
import { listEvidenceQueue } from "@/lib/queries/evidence";
import { EvidenceQueue } from "@/components/evidence-queue";

export const dynamic = "force-dynamic";

/**
 * Cola de revisión del consultor. Misma vista que la del administrador —lo que
 * cambia es quién resuelve una baja, que sigue siendo sólo el administrador.
 */
export default async function ProfessorEvidencePage() {
  const rows = await listEvidenceQueue().catch(() => null);
  if (!rows) redirect("/professor");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Evidencias
        </h1>
        <p className="mt-1 text-text-secondary">
          Revisa, aprueba o devuelve las evidencias de las empresas que acompañas.
        </p>
      </div>
      <EvidenceQueue rows={rows} basePath="/professor/evidence" />
    </div>
  );
}
