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
 * emitir (plan 03-06), y también la vista previa en PDF de la plantilla sola
 * (plan 04-01, sin elegir empresa). Rellena la MISMA interfaz que una
 * emisión real, pero desde `ManualDocument` en vez de desde
 * `CompanyDocument`: `version` es el `templateVersion` actual, `status` es
 * `BORRADOR` (nada se ha adoptado todavía) y `sourceTemplateVersion` se fija
 * igual al `templateVersion` actual para que `isOutdated` sea siempre
 * `false` en la vista previa — es justo el truco que usa `renderCertificate`:
 * los dos consumidores llenan la misma interfaz desde fuentes distintas, así
 * que lo que se ve en vista previa no puede divergir de lo que se emitiría.
 *
 * `companyId` es opcional: la plantilla del manual no está ligada a ninguna
 * empresa todavía. Sin él, se sustituye la empresa por un marcador fijo
 * («Empresa de ejemplo»), el mismo truco que usa la vista previa del diploma
 * con «Nombre del Alumno» — se sustituye una entidad por un marcador, no se
 * toma prestada la de otra empresa real.
 *
 * Devuelve `null` si el documento no existe, o si se pasó un `companyId` que
 * no existe.
 */
export async function loadTemplatePreviewIdentity(
  documentId: string,
  companyId?: string | null,
): Promise<{ identity: DocumentIdentity; contentHtml: string; tenantId: string } | null> {
  const [doc, company] = await Promise.all([
    db.manualDocument.findUnique({
      where: { id: documentId },
      select: {
        code: true,
        name: true,
        kind: true,
        contentHtml: true,
        templateVersion: true,
        manual: {
          select: { normaLabel: true, tenantId: true, tenant: { select: { name: true } } },
        },
      },
    }),
    companyId
      ? db.company.findUnique({
          where: { id: companyId },
          select: {
            name: true,
            dc3LegalName: true,
            logo: true,
            tenant: { select: { name: true } },
          },
        })
      : null,
  ]);
  if (!doc) return null;
  if (companyId && !company) return null;

  const companyInput = company ?? {
    name: "Empresa de ejemplo",
    dc3LegalName: null,
    logo: null,
  };
  const tenantInput = company?.tenant ?? { name: doc.manual.tenant.name };

  const identity = buildDocumentIdentity({
    company: companyInput,
    tenant: tenantInput,
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

  return { identity, contentHtml: doc.contentHtml ?? "", tenantId: doc.manual.tenantId };
}
