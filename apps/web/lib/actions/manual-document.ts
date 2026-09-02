"use server";

// Ciclo de vida del documento nativo, aparte de `lib/actions/manual.ts`
// (que ya pasa de 1000 líneas): escribir el cuerpo de una plantilla, con su
// política de versión, es un tema propio — y este archivo va a crecer con la
// emisión y la publicación del plan 03-05. Meterlo en `manual.ts` habría
// hecho ese archivo todavía más largo por algo que tiene su propia lógica de
// negocio (saneado, comparación de saneados, conversión de arquetipo).

import { revalidatePath } from "next/cache";
import { db, type ManualDocumentKind } from "@prol/db";
import { assertTenantScope, requireManualAdmin } from "@/lib/manual-access";
import { sanitizeManualHtml } from "@/lib/sanitize-manual-html";

/**
 * Escribe el cuerpo de la plantilla de un `ManualDocument`.
 *
 * Sanea antes de comparar y antes de escribir, no sube `templateVersion` en
 * cada guardado (enmienda (a) del CONTEXT), deja el primer cuerpo en v1, y
 * convierte el documento de `FILE` a `PROCEDIMIENTO` la primera vez que
 * recibe cuerpo — no hace falta una acción aparte para decir "ahora es un
 * procedimiento": el hecho de que tenga cuerpo ya lo dice.
 */
export async function updateManualDocumentBody(input: {
  documentId: string;
  contentHtml: string;
}): Promise<
  | { success: true; templateVersion: number; changed: boolean; kind: ManualDocumentKind }
  | { success: false; error: string }
> {
  // Escribir el procedimiento es autoría, no revisión.
  const user = await requireManualAdmin();

  const doc = await db.manualDocument.findUnique({
    where: { id: input.documentId },
    select: {
      id: true,
      manualId: true,
      kind: true,
      contentHtml: true,
      templateVersion: true,
      manual: { select: { tenantId: true } },
    },
  });
  if (!doc) throw new Error("Documento no encontrado");
  assertTenantScope(user, doc.manual.tenantId);

  // Sanear antes de comparar y antes de escribir. Comparar el saneado con el
  // guardado, no el crudo con el guardado: si no, dos guardados idénticos que
  // difieren sólo en marcado que el sanitizador tira contarían como cambio y
  // subirían la versión de plantilla por nada.
  const safeHtml = sanitizeManualHtml(input.contentHtml);
  const previous = doc.contentHtml ?? "";
  if (safeHtml === previous) {
    return {
      success: true as const,
      changed: false,
      templateVersion: doc.templateVersion,
      kind: doc.kind,
    };
  }

  // Sube sólo cuando el cuerpo cambia de verdad (enmienda (a) del CONTEXT), y
  // NO en el primer cuerpo: un documento recién creado está en v1, y que su
  // primera redacción lo dejara en v2 haría que "plantilla v1" no significara
  // nada. A partir de ahí, cada cambio real es una versión de plantilla.
  const firstBody = previous.trim().length === 0;
  const templateVersion = firstBody ? doc.templateVersion : doc.templateVersion + 1;

  // Escribir un cuerpo es lo que convierte un documento de archivo en uno
  // nativo. No hace falta una acción aparte para decir "ahora es un
  // procedimiento": el hecho de que tenga cuerpo ya lo dice. `REGISTRO` no se
  // asigna en esta fase — es de la fase 5.
  //
  // Nota sobre el borrado del cuerpo: si `safeHtml` queda vacío y antes había
  // cuerpo, se guarda vacío y sí cuenta como cambio (sube la versión), pero
  // `kind` no vuelve a `FILE`: las emisiones ya hechas siguen siendo
  // procedimientos y degradar el arquetipo dejaría filas huérfanas de
  // semántica.
  const kind: ManualDocumentKind =
    doc.kind === "FILE" && safeHtml.trim() ? "PROCEDIMIENTO" : doc.kind;

  await db.manualDocument.update({
    where: { id: doc.id },
    data: { contentHtml: safeHtml, templateVersion, kind },
  });

  revalidatePath(`/tenant-admin/manuals/${doc.manualId}`);
  revalidatePath(`/tenant-admin/manuals/${doc.manualId}/documents/${doc.id}`);

  return { success: true as const, changed: true, templateVersion, kind };
}
