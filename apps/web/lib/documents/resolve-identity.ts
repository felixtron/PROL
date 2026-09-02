// Lectura de base que alimenta `buildDocumentIdentity` (ver
// `document-identity.ts` para la decisión de fondo: logo en vivo, resto
// congelado).
//
// **No autoriza.** Lo llama la capa de consulta (`lib/queries/manual-document.ts`),
// que ya comprobó rol, tenant y pertenencia. Se separa del ensamblador puro
// para que ese ensamblador siga siendo importable desde el cliente — misma
// razón por la que `lib/document-files.ts` está separado de
// `lib/document-storage.ts`. No importar este archivo desde una página: entra
// siempre por la capa de consulta o de acción que ya autorizó.

import { db } from "@prol/db";
import { buildDocumentIdentity, type DocumentIdentity } from "./document-identity";

/**
 * Identidad de una emisión ya existente (`CompanyDocument`), con el
 * `templateVersion` actual de su `ManualDocument` de origen para el cálculo
 * de `isOutdated` (DOC-07).
 *
 * Devuelve `null` si la fila no existe: el 404 lo decide quien llama.
 */
export async function loadCompanyDocumentIdentity(companyDocumentId: string): Promise<{
  identity: DocumentIdentity;
  contentHtml: string;
  companyId: string;
  documentId: string;
} | null> {
  const row = await db.companyDocument.findUnique({
    where: { id: companyDocumentId },
    select: {
      companyId: true,
      documentId: true,
      version: true,
      status: true,
      kind: true,
      contentHtml: true,
      codeOverride: true,
      nameOverride: true,
      sourceTemplateVersion: true,
      createdAt: true,
      document: {
        select: {
          code: true,
          name: true,
          templateVersion: true,
          manual: { select: { normaLabel: true } },
        },
      },
      company: {
        select: {
          name: true,
          dc3LegalName: true,
          logo: true,
          tenant: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;

  const identity = buildDocumentIdentity({
    company: row.company,
    tenant: row.company.tenant,
    normaLabel: row.document.manual.normaLabel,
    code: row.document.code,
    codeOverride: row.codeOverride,
    name: row.document.name,
    nameOverride: row.nameOverride,
    kind: row.kind,
    version: row.version,
    status: row.status,
    issuedAt: row.createdAt,
    sourceTemplateVersion: row.sourceTemplateVersion,
    latestTemplateVersion: row.document.templateVersion,
  });

  return {
    identity,
    contentHtml: row.contentHtml ?? "",
    companyId: row.companyId,
    documentId: row.documentId,
  };
}

/**
 * Identidad de la vista previa de plantilla — lo que el consultor ve antes de
 * emitir (plan 03-06). Rellena la MISMA interfaz que una emisión real, pero
 * desde `ManualDocument` en vez de desde `CompanyDocument`: `version` es el
 * `templateVersion` actual, `status` es `BORRADOR` (nada se ha adoptado
 * todavía) y `sourceTemplateVersion` se fija igual al `templateVersion`
 * actual para que `isOutdated` sea siempre `false` en la vista previa — es
 * justo el truco que usa `renderCertificate`: los dos consumidores llenan la
 * misma interfaz desde fuentes distintas, así que lo que se ve en vista
 * previa no puede divergir de lo que se emitiría.
 *
 * Devuelve `null` si el documento o la empresa no existen.
 */
export async function loadTemplatePreviewIdentity(
  documentId: string,
  companyId: string,
): Promise<{ identity: DocumentIdentity; contentHtml: string } | null> {
  const [doc, company] = await Promise.all([
    db.manualDocument.findUnique({
      where: { id: documentId },
      select: {
        code: true,
        name: true,
        kind: true,
        contentHtml: true,
        templateVersion: true,
        manual: { select: { normaLabel: true } },
      },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        dc3LegalName: true,
        logo: true,
        tenant: { select: { name: true } },
      },
    }),
  ]);
  if (!doc || !company) return null;

  const identity = buildDocumentIdentity({
    company,
    tenant: company.tenant,
    normaLabel: doc.manual.normaLabel,
    code: doc.code,
    codeOverride: null,
    name: doc.name,
    nameOverride: null,
    kind: doc.kind,
    version: doc.templateVersion,
    status: "BORRADOR",
    issuedAt: new Date(),
    sourceTemplateVersion: doc.templateVersion,
    latestTemplateVersion: doc.templateVersion,
  });

  return { identity, contentHtml: doc.contentHtml ?? "" };
}
