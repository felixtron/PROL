import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { parseEvidenceSnapshot } from "@prol/shared";
import {
  ACTIVITY_STATE_LABEL,
  EVIDENCE_STATUS_CLASS,
  EVIDENCE_STATUS_LABEL,
  PERIODICITY_LABEL,
  RISK_ITEM_TYPE_LABEL,
  activityState,
  parseRiskConfig,
  riskLevel,
} from "@/lib/compliance";
import { EvidenceReviewActions } from "@/components/evidence-review-actions";
import { DriveFolderLink } from "@/components/drive-folder-link";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

const ACTION_LABEL: Record<string, string> = {
  SUBMIT: "Entregada",
  START_REVIEW: "Tomada para revisión",
  APPROVE: "Aprobada",
  REQUEST_CORRECTION: "Devuelta para corrección",
  COMMENT: "Comentario",
  REQUEST_DELETION: "Baja solicitada",
  APPROVE_DELETION: "Baja aprobada",
  REJECT_DELETION: "Baja rechazada",
};

/**
 * Ficha de revisión de una evidencia: qué se entregó, para qué requisito, con
 * qué historial y con las acciones del consultor.
 *
 * Cuando la evidencia es una captura en plataforma se pinta el snapshot
 * congelado —no la herramienta viva—, que es exactamente lo que se está
 * aprobando.
 */
export function EvidenceDetail({
  data,
  backHref,
  canResolveDeletion,
}: {
  data: NonNullable<Awaited<ReturnType<
    typeof import("@/lib/queries/evidence").getEvidenceDetail
  >>>;
  backHref: string;
  canResolveDeletion: boolean;
}) {
  const { evidence, versions, driveUrlIsInvalid } = data;
  const section = evidence.activity.requirement.section;
  const state = activityState({
    status: evidence.activity.status,
    dueAt: evidence.activity.dueAt,
  });

  const snapshot = parseEvidenceSnapshot(evidence.formSnapshot);
  const riskConfig = parseRiskConfig(snapshot?.config);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Evidencias
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {evidence.activity.requirement.name}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              EVIDENCE_STATUS_CLASS[evidence.status]
            }`}
          >
            {EVIDENCE_STATUS_LABEL[evidence.status]}
          </span>
        </div>
        <p className="mt-1 text-text-secondary">
          {evidence.assignment.company.name} · {evidence.assignment.manual.title}
        </p>
        <p className="text-sm text-text-tertiary">
          {section.code ? `${section.code} — ` : ""}
          {section.title}
          {evidence.activity.periodLabel
            ? ` · Periodo ${evidence.activity.periodLabel}`
            : ""}
          {evidence.activity.requirement.periodicity !== "ONCE"
            ? ` · ${PERIODICITY_LABEL[evidence.activity.requirement.periodicity]}`
            : ""}
        </p>
        {evidence.activity.dueAt ? (
          <p className="mt-1 text-sm text-text-secondary">
            Fecha comprometida: {DATE.format(new Date(evidence.activity.dueAt))}
            {state === "OVERDUE" ? (
              <span className="ml-1 font-medium text-rose-600">
                ({ACTIVITY_STATE_LABEL.OVERDUE})
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {evidence.activity.requirement.description ? (
        <p className="rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
          {evidence.activity.requirement.description}
        </p>
      ) : null}

      {/* Lo entregado */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Entrega (versión {evidence.version})
        </h2>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-tertiary">
            Subida por {evidence.uploadedBy?.name ?? evidence.uploadedBy?.email ?? "—"}{" "}
            el {DATE.format(new Date(evidence.submittedAt))}
          </p>

          {evidence.fileName ? (
            <a
              href={`/files/evidence/${evidence.id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
            >
              <Download className="h-4 w-4" />
              {evidence.fileName}
            </a>
          ) : null}

          {evidence.evaluationSubmission ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary">
              <FileText className="h-4 w-4 text-text-tertiary" />
              Entrega de evaluación:{" "}
              {evidence.evaluationSubmission.participant.assignment.evaluation.title}{" "}
              (v{evidence.evaluationSubmission.version})
            </p>
          ) : null}

          {evidence.notes ? (
            <p className="mt-3 text-sm text-text-secondary">{evidence.notes}</p>
          ) : null}

          <div className="mt-3">
            <DriveFolderLink
              driveUrl={evidence.assignment.driveUrl}
              invalid={driveUrlIsInvalid}
              emptyHint="Configúrala en el panel del proyecto."
              size="compact"
            />
          </div>
        </div>

        {/* Snapshot de la matriz de riesgos */}
        {snapshot?.items?.length ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Descripción</th>
                  <th className="px-3 py-2.5">P</th>
                  <th className="px-3 py-2.5">C</th>
                  <th className="px-3 py-2.5">Evaluación</th>
                  <th className="px-3 py-2.5">Acciones</th>
                  <th className="px-3 py-2.5">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snapshot.items.map((item, i) => {
                  const level =
                    item.level ?? riskLevel(item.score, riskConfig).label;
                  return (
                    <tr key={i} className="align-top">
                      <td className="px-3 py-2.5 text-text-secondary">
                        {RISK_ITEM_TYPE_LABEL[item.type]}
                      </td>
                      <td className="px-3 py-2.5 text-text-primary">
                        {item.description}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.probability}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.impact}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-text-primary">
                          {item.score}
                        </span>
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                            riskLevel(item.score, riskConfig).className
                          }`}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.actions ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.responsible ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Acciones */}
      {!evidence.deletedAt ? (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Revisión
          </h2>
          <EvidenceReviewActions
            evidenceId={evidence.id}
            status={evidence.status}
            deletionRequested={Boolean(evidence.deletionRequestedAt)}
            canResolveDeletion={canResolveDeletion}
          />
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-surface-secondary p-4 text-sm text-text-secondary">
          Esta evidencia fue dada de baja. El historial se conserva.
        </p>
      )}

      {/* Bitácora */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Historial
        </h2>
        <ol className="space-y-3 border-l border-border pl-4">
          {evidence.reviews.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border" />
              <p className="text-sm font-medium text-text-primary">
                {ACTION_LABEL[r.action] ?? r.action}
              </p>
              <p className="text-xs text-text-tertiary">
                {r.reviewer?.name ?? r.reviewer?.email ?? "—"} ·{" "}
                {DATE.format(new Date(r.createdAt))}
              </p>
              {r.comment ? (
                <p className="mt-1 rounded-lg bg-surface-secondary p-2.5 text-sm text-text-secondary">
                  {r.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Versiones */}
      {versions.length > 1 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Versiones de esta actividad
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-text-primary">
                  Versión {v.version}
                  {v.id === evidence.id ? (
                    <span className="ml-2 text-xs text-text-tertiary">(actual)</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 text-xs text-text-tertiary">
                  {v.deletedAt ? (
                    <span className="text-rose-600">Dada de baja</span>
                  ) : (
                    EVIDENCE_STATUS_LABEL[v.status]
                  )}
                  <span>{DATE.format(new Date(v.submittedAt))}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
