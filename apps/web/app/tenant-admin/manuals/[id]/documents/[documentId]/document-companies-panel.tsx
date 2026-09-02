"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { CompanyDocumentStatus } from "@prol/db";
import {
  issueCompanyDocument,
  startCompanyDocumentDraft,
} from "@/lib/actions/manual-document";
import { DOCUMENT_STATUS_CLASS, DOCUMENT_STATUS_LABEL } from "@/lib/documents/document-identity";

interface CompanyRow {
  assignmentId: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  current: {
    id: string;
    version: number;
    status: CompanyDocumentStatus;
    sourceTemplateVersion: number | null;
    updatedAt: Date;
  } | null;
  draft: { id: string; version: number } | null;
  isOutdated: boolean;
}

/**
 * Una fila por empresa activa del manual, con el estado de emisión de este
 * documento y las acciones del ciclo de vida (plan 03-05) cableadas a
 * botones reales. Recibe los datos por props — nada de acceso a la base
 * desde aquí, como en el resto del módulo.
 */
export function DocumentCompaniesPanel({
  manualId,
  documentId,
  templateVersion,
  hasBody,
  companies,
}: {
  manualId: string;
  documentId: string;
  templateVersion: number;
  hasBody: boolean;
  companies: CompanyRow[];
}) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {companies.length === 0 ? (
        <p className="p-4 text-sm text-text-tertiary">
          Este manual todavía no tiene empresas activadas.
        </p>
      ) : (
        companies.map((company) => (
          <CompanyDocumentRow
            key={company.assignmentId}
            manualId={manualId}
            documentId={documentId}
            templateVersion={templateVersion}
            hasBody={hasBody}
            company={company}
          />
        ))
      )}
    </div>
  );
}

function CompanyDocumentRow({
  manualId,
  documentId,
  templateVersion,
  hasBody,
  company,
}: {
  manualId: string;
  documentId: string;
  templateVersion: number;
  hasBody: boolean;
  company: CompanyRow;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [codeOverride, setCodeOverride] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editorHref = `/tenant-admin/manuals/${manualId}/documents/${documentId}/companies/${company.assignmentId}`;

  function handleIssue() {
    setError(null);
    startTransition(async () => {
      const result = await issueCompanyDocument({
        assignmentId: company.assignmentId,
        documentId,
        codeOverride: codeOverride.trim() || undefined,
        nameOverride: nameOverride.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setExpanded(false);
      setCodeOverride("");
      setNameOverride("");
      setNotes("");
      router.refresh();
    });
  }

  function handleReissue() {
    // Re-emitir descarta la personalización que la empresa tuviera: es una
    // acción destructiva y avisa antes de ejecutarse.
    const proceed = window.confirm(
      "Re-emitir descarta la personalización que esta empresa tuviera y adopta la plantilla vigente. ¿Continuar?",
    );
    if (!proceed) return;
    setError(null);
    startTransition(async () => {
      const result = await issueCompanyDocument({
        assignmentId: company.assignmentId,
        documentId,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleStartDraft() {
    if (!company.current) return;
    setError(null);
    startTransition(async () => {
      const result = await startCompanyDocumentDraft({
        companyDocumentId: company.current!.id,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(editorHref);
    });
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        {company.companyLogo ? (
          // El logo es una URL de la propia empresa: next/image exigiría
          // configurar hosts remotos, y esa advertencia rompería la línea
          // base de lint del milestone (81 warnings).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.companyLogo}
            alt={`Logotipo de ${company.companyName}`}
            className="h-8 w-8 shrink-0 rounded border border-border bg-white object-contain p-0.5"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">{company.companyName}</p>
          {company.current ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
              <span>v{company.current.version}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${DOCUMENT_STATUS_CLASS[company.current.status]}`}
              >
                {DOCUMENT_STATUS_LABEL[company.current.status]}
              </span>
              {company.current.sourceTemplateVersion !== null ? (
                <span>basada en plantilla v{company.current.sourceTemplateVersion}</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-tertiary">No emitida</p>
          )}
          {company.isOutdated ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              La plantilla va por la v{templateVersion}
            </p>
          ) : null}
          {company.draft ? (
            <p className="mt-1">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Borrador v{company.draft.version}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!company.current ? (
            <button
              type="button"
              disabled={!hasBody || isPending}
              title={!hasBody ? "El documento todavía no tiene cuerpo redactado" : undefined}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              Emitir
            </button>
          ) : null}

          {company.current && !company.draft ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleStartDraft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Editar
            </button>
          ) : null}

          {company.current && !company.draft && company.isOutdated ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleReissue}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
            >
              Re-emitir con la plantilla vigente
            </button>
          ) : null}

          {company.draft ? (
            <Link
              href={editorHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Continuar borrador
            </Link>
          ) : null}
        </div>
      </div>

      {expanded && !company.current ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-secondary/40 p-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={codeOverride}
              onChange={(e) => setCodeOverride(e.target.value)}
              placeholder="Código para esta empresa (opcional)"
              className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
            />
            <input
              type="text"
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder="Nombre para esta empresa (opcional)"
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descripción del cambio (opcional)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleIssue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirmar emisión
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
