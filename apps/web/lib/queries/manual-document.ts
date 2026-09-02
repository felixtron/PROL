// Lectura de un documento nativo para su editor de gestión.
//
// Es una consulta de GESTIÓN (staff): el consultor/administrador que redacta
// la plantilla y ve qué empresas la tienen emitida y a qué versión. La
// lectura del lado cliente —la empresa viendo su propia emisión— vive aparte,
// en el plan 03-05.

import { cache } from "react";
import { db } from "@prol/db";
import { assertTenantScope, requireManualAdmin } from "@/lib/manual-access";
import { isTemplateOutdated } from "@/lib/documents/document-identity";

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
