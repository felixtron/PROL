// Lectura de un documento nativo para su editor de gestión.
//
// Es una consulta de GESTIÓN (staff): el consultor/administrador que redacta
// la plantilla y ve qué empresas la tienen emitida y a qué versión. La
// lectura del lado cliente —la empresa viendo su propia emisión— vive aparte,
// en el plan 03-05.

import { cache } from "react";
import { db, type CompanyDocumentStatus } from "@prol/db";
import { requireUser } from "@/lib/auth";
import {
  assertDocumentsEnabled,
  assertTenantScope,
  requireAssignmentManageAccess,
  requireAssignmentMemberAccess,
  requireManualAdmin,
} from "@/lib/manual-access";
import {
  DOCUMENT_STATUS_CLASS,
  DOCUMENT_STATUS_LABEL,
  ISSUED_AT_FORMAT,
  isTemplateOutdated,
} from "@/lib/documents/document-identity";
import { loadCompanyDocumentIdentity } from "@/lib/documents/resolve-identity";

/**
 * Documento nativo completo para el editor del consultor: el documento, su
 * manual, las secciones a las que está enlazado, y el estado de emisión de
 * cada empresa con el manual activo — sin que el editor tenga que consultar
 * nada más.
 *
 * `current`/`draft` se resuelven con **una sola** consulta a `companyDocument`
 * (filtrada por `documentId` y `status: { in: ["VIGENTE", "BORRADOR"] }`),
 * agrupada en memoria por empresa. `isOutdated` usa `isTemplateOutdated`,
 * importada de `document-identity.ts` — la misma fórmula que usa la vista del
 * cliente, para que los dos avisos no puedan divergir.
 *
 * Devuelve `null` si el documento no existe.
 */
export const getManualDocumentForEdit = cache(async (documentId: string) => {
  const user = await requireManualAdmin();

  const doc = await db.manualDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      kind: true,
      contentHtml: true,
      templateVersion: true,
      baseFileName: true,
      manual: {
        select: { id: true, title: true, normaLabel: true, tenantId: true },
      },
      sections: {
        select: { section: { select: { code: true, title: true } } },
      },
    },
  });
  if (!doc) return null;
  assertTenantScope(user, doc.manual.tenantId);

  const [assignments, companyDocs] = await Promise.all([
    // Todas las empresas con el manual activo, tengan o no una emisión
    // todavía de este documento en particular — es lo que le dice al
    // consultor a quién le falta emitir.
    db.manualAssignment.findMany({
      where: { manualId: doc.manual.id },
      select: { id: true, company: { select: { id: true, name: true, logo: true } } },
    }),
    // Una sola consulta para el estado de emisión de TODAS las empresas.
    // Nada de una consulta por empresa.
    db.companyDocument.findMany({
      where: { documentId: doc.id, status: { in: ["VIGENTE", "BORRADOR"] } },
      select: {
        id: true,
        companyId: true,
        version: true,
        status: true,
        sourceTemplateVersion: true,
        createdAt: true,
      },
    }),
  ]);

  const byCompany = new Map<string, typeof companyDocs>();
  for (const cd of companyDocs) {
    const list = byCompany.get(cd.companyId) ?? [];
    list.push(cd);
    byCompany.set(cd.companyId, list);
  }

  const companies = assignments.map((assignment) => {
    const rows = byCompany.get(assignment.company.id) ?? [];
    const current = rows.find((r) => r.status === "VIGENTE") ?? null;
    const draft = rows.find((r) => r.status === "BORRADOR") ?? null;

    return {
      assignmentId: assignment.id,
      companyId: assignment.company.id,
      companyName: assignment.company.name,
      companyLogo: assignment.company.logo,
      current: current
        ? {
            id: current.id,
            version: current.version,
            status: current.status,
            sourceTemplateVersion: current.sourceTemplateVersion,
            // `CompanyDocument` no tiene columna `updatedAt` propia: el
            // bucle BORRADOR (plan 03-05) edita en sitio sin recrear la
            // fila, así que por ahora esto es su `createdAt`. No se añade
            // columna en este plan (fuera de alcance: 03-04 sólo consume el
            // esquema del plan 03-01).
            updatedAt: current.createdAt,
          }
        : null,
      draft: draft ? { id: draft.id, version: draft.version } : null,
      isOutdated: current
        ? isTemplateOutdated(current.sourceTemplateVersion, doc.templateVersion)
        : false,
    };
  });

  return {
    document: {
      id: doc.id,
      code: doc.code,
      name: doc.name,
      description: doc.description,
      kind: doc.kind,
      contentHtml: doc.contentHtml,
      templateVersion: doc.templateVersion,
      baseFileName: doc.baseFileName,
    },
    manual: doc.manual,
    sections: doc.sections.map((s) => s.section),
    companies,
  };
});

// ─── Lado cliente y control de cambios (DOC-05) ────────────────────────────────
//
// La tabla de control de cambios se genera aquí, en tiempo de render, desde
// el historial de filas de `CompanyDocument`. El consultor nunca la
// mantiene: las cinco columnas salen de columnas que ya existen (`version`,
// `createdAt`/`publishedAt`, `uploadedById`/`publishedById`, `notes`
// reutilizado como "descripción del cambio", `status`).
//
// Asimetría deliberada: `getCompanyDocumentForClient` EXCLUYE los
// borradores (un borrador es trabajo del consultor sin publicar);
// `getCompanyDocumentForEdit` los INCLUYE (el consultor necesita ver su
// propio trabajo en curso). No "unificar" esto sin volver a leer por qué.

/** Fila de historial de `CompanyDocument` con lo necesario para pintarla. */
type HistoryRow = {
  id: string;
  version: number;
  status: CompanyDocumentStatus;
  createdAt: Date;
  publishedAt: Date | null;
  notes: string | null;
  uploadedBy: { name: string | null } | null;
  publishedBy: { name: string | null } | null;
};

function buildHistoryEntry(r: HistoryRow) {
  return {
    id: r.id,
    version: r.version,
    status: r.status,
    statusLabel: DOCUMENT_STATUS_LABEL[r.status],
    statusClass: DOCUMENT_STATUS_CLASS[r.status],
    // publishedAt ?? createdAt, ya formateada con el mismo formateador de
    // document-identity.ts — no se redefine ninguno aquí.
    date: ISSUED_AT_FORMAT.format(r.publishedAt ?? r.createdAt),
    author: r.publishedBy?.name ?? r.uploadedBy?.name ?? "—",
    change: r.notes ?? "—",
    isCurrent: r.status === "VIGENTE",
  };
}

/**
 * Resuelve `companyDocumentId` → `(documentId, companyId)` → la activación
 * de esa empresa, sin autorizar. Mismo primer paso que usan las cuatro
 * acciones de `lib/actions/manual-document.ts`, aquí para las consultas.
 * Devuelve `null` si la fila o la activación no existen.
 */
async function resolveCompanyDocumentAssignment(companyDocumentId: string) {
  const row = await db.companyDocument.findUnique({
    where: { id: companyDocumentId },
    select: { documentId: true, companyId: true, document: { select: { manualId: true } } },
  });
  if (!row) return null;

  const assignment = await db.manualAssignment.findUnique({
    where: { manualId_companyId: { manualId: row.document.manualId, companyId: row.companyId } },
    select: { id: true },
  });
  if (!assignment) return null;

  return { documentId: row.documentId, companyId: row.companyId, assignmentId: assignment.id };
}

/**
 * Lo que ve la EMPRESA de un documento suyo: identidad resuelta, cuerpo, y
 * el historial de control de cambios SIN borradores — un borrador es trabajo
 * del consultor todavía sin publicar, y enseñárselo al cliente sería la
 * misma clase de fuga que OPS-05 acaba de cerrar en la página de sección.
 *
 * Pasan los miembros de esa empresa y el personal del tenant (vía
 * `requireAssignmentMemberAccess`), que necesita ver el manual como lo ve
 * el cliente. Devuelve `null` si la fila, la activación, o el acceso no
 * se resuelven.
 */
export const getCompanyDocumentForClient = cache(async (companyDocumentId: string) => {
  const resolved = await resolveCompanyDocumentAssignment(companyDocumentId);
  if (!resolved) return null;

  await requireAssignmentMemberAccess(resolved.assignmentId);

  const loaded = await loadCompanyDocumentIdentity(companyDocumentId);
  if (!loaded) return null;

  const rows = await db.companyDocument.findMany({
    where: {
      documentId: resolved.documentId,
      companyId: resolved.companyId,
      status: { in: ["VIGENTE", "OBSOLETO"] },
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      notes: true,
      uploadedBy: { select: { name: true } },
      publishedBy: { select: { name: true } },
    },
  });

  return {
    identity: loaded.identity,
    contentHtml: loaded.contentHtml,
    assignmentId: resolved.assignmentId,
    history: rows.map(buildHistoryEntry),
  };
});

/**
 * La misma fila para el CONSULTOR, con todo el historial —borradores
 * incluidos— y `contentHtml` en crudo para el editor. Autoriza con
 * `requireAssignmentManageAccess`. La diferencia con la del cliente es
 * exactamente esa —los borradores—, así que no se "unifican": el consultor
 * necesita ver su propio trabajo en curso, el cliente nunca debe verlo.
 *
 * Devuelve `null` si la fila, la activación, o el acceso no se resuelven.
 */
export const getCompanyDocumentForEdit = cache(async (companyDocumentId: string) => {
  const resolved = await resolveCompanyDocumentAssignment(companyDocumentId);
  if (!resolved) return null;

  await requireAssignmentManageAccess(resolved.assignmentId);

  const loaded = await loadCompanyDocumentIdentity(companyDocumentId);
  if (!loaded) return null;

  const rows = await db.companyDocument.findMany({
    where: { documentId: resolved.documentId, companyId: resolved.companyId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      notes: true,
      uploadedBy: { select: { name: true } },
      publishedBy: { select: { name: true } },
    },
  });

  return {
    identity: loaded.identity,
    contentHtml: loaded.contentHtml,
    assignmentId: resolved.assignmentId,
    history: rows.map(buildHistoryEntry),
  };
});

/**
 * La lista maestra de `/dashboard/documents`: todo lo que la empresa del
 * usuario tiene VIGENTE, de los dos arquetipos (`PROCEDIMIENTO` se abre en
 * el visor, `FILE` se descarga). Excluir uno de los dos le daría al cliente
 * media lista sin explicación.
 *
 * Misma forma que `listMyManuals` (`lib/queries/manual.ts:356-359`): sin
 * empresa, lista vacía — no error, no fuga de otra empresa.
 */
export const listCompanyDocumentsForClient = cache(async () => {
  const user = await requireUser();
  if (!user.companyId) return [];

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { tenantId: true },
  });
  if (!company) return [];
  await assertDocumentsEnabled(company.tenantId, user.role);

  const [rows, assignments] = await Promise.all([
    db.companyDocument.findMany({
      where: { companyId: user.companyId, status: "VIGENTE" },
      orderBy: [{ document: { code: "asc" } }],
      select: {
        id: true,
        kind: true,
        version: true,
        codeOverride: true,
        nameOverride: true,
        sourceTemplateVersion: true,
        createdAt: true,
        publishedAt: true,
        fileName: true,
        document: {
          select: {
            code: true,
            name: true,
            templateVersion: true,
            manual: { select: { id: true, title: true } },
          },
        },
      },
    }),
    // Para resolver el assignmentId de cada fila sin una consulta por
    // documento: una sola vez por empresa, agrupado en memoria por manual.
    db.manualAssignment.findMany({
      where: { companyId: user.companyId },
      select: { id: true, manualId: true },
    }),
  ]);

  const assignmentByManual = new Map(assignments.map((a) => [a.manualId, a.id]));

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    version: r.version,
    code: r.codeOverride ?? r.document.code,
    name: r.nameOverride ?? r.document.name,
    updatedAt: r.publishedAt ?? r.createdAt,
    manualTitle: r.document.manual.title,
    assignmentId: assignmentByManual.get(r.document.manual.id) ?? null,
    isOutdated: isTemplateOutdated(r.sourceTemplateVersion, r.document.templateVersion),
    fileName: r.fileName,
  }));
});
