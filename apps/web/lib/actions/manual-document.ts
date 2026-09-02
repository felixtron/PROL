"use server";

// Ciclo de vida del documento nativo, aparte de `lib/actions/manual.ts`
// (que ya pasa de 1000 líneas): escribir el cuerpo de una plantilla, con su
// política de versión, es un tema propio — y este archivo va a crecer con la
// emisión y la publicación del plan 03-05. Meterlo en `manual.ts` habría
// hecho ese archivo todavía más largo por algo que tiene su propia lógica de
// negocio (saneado, comparación de saneados, conversión de arquetipo).

import { revalidatePath } from "next/cache";
import { db, type ManualDocumentKind } from "@prol/db";
import {
  assertTenantScope,
  requireAssignmentManageAccess,
  requireManualAdmin,
} from "@/lib/manual-access";
import { sanitizeManualHtml } from "@/lib/sanitize-manual-html";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function optionalText(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

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

// ─── Ciclo de vida por empresa: emitir, abrir borrador, guardar, publicar ──────
//
// Emitir crea la fila directamente en VIGENTE (enmienda (b) del CONTEXT):
// emitir es adoptar una plantilla ya terminada, no editar. El bucle de
// borrador —abrir, guardar cuantas veces haga falta, publicar— es lo que
// evita que cada guardado cree una versión nueva. Las cuatro acciones pasan
// por una sola puerta de autorización: `requireAssignmentManageAccess`.

/**
 * Resuelve fila de empresa → activación → autorización, para que las cuatro
 * acciones de escritura de este bloque usen exactamente el mismo camino. No
 * se exporta: en un `"use server"` cada export async es un RPC público, y
 * este helper no debe poder invocarse directamente sin las validaciones de
 * cada acción concreta.
 */
async function loadCompanyDocumentForWrite(companyDocumentId: string) {
  const row = await db.companyDocument.findUnique({
    where: { id: companyDocumentId },
    select: {
      id: true,
      companyId: true,
      documentId: true,
      version: true,
      status: true,
      contentHtml: true,
      codeOverride: true,
      nameOverride: true,
      sourceTemplateVersion: true,
      kind: true,
      document: { select: { manualId: true, templateVersion: true, contentHtml: true } },
    },
  });
  if (!row) throw new Error("Documento de empresa no encontrado");

  const assignment = await db.manualAssignment.findUnique({
    where: { manualId_companyId: { manualId: row.document.manualId, companyId: row.companyId } },
    select: { id: true },
  });
  if (!assignment) throw new Error("La empresa no tiene este manual activo");

  const ctx = await requireAssignmentManageAccess(assignment.id);
  return { row, ...ctx };
}

/** Emite un procedimiento a una empresa: adopta la plantilla congelando su cuerpo. */
export async function issueCompanyDocument(input: {
  assignmentId: string;
  documentId: string;
  codeOverride?: string;
  nameOverride?: string;
  notes?: string;
}): Promise<
  | { success: true; companyDocumentId: string; version: number }
  | { success: false; error: string }
> {
  const { user, assignment } = await requireAssignmentManageAccess(input.assignmentId);

  const doc = await db.manualDocument.findUnique({
    where: { id: input.documentId },
    select: { manualId: true, kind: true, contentHtml: true, templateVersion: true },
  });
  if (!doc || doc.manualId !== assignment.manualId) {
    return { success: false as const, error: "El documento no pertenece a este manual" };
  }
  // Para los archivos el camino es uploadCompanyDocument, que ya existe.
  if (doc.kind === "FILE") {
    return { success: false as const, error: "Este documento se sube como archivo, no se emite" };
  }
  // Emitir un procedimiento vacío no es un caso que nadie quiera y produce
  // una versión inútil que después hay que degradar.
  if (!doc.contentHtml?.trim()) {
    return { success: false as const, error: "El documento todavía no tiene cuerpo redactado" };
  }

  const created = await db.$transaction(async (tx) => {
    // Se bloquea `manual_documents` y no `company_documents` a propósito: el
    // par (documento, empresa) puede no tener ninguna fila todavía, y un FOR
    // UPDATE sobre cero filas no bloquea nada. Mismo patrón que
    // uploadCompanyDocument desde la fase 1 (160bc5a).
    await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${input.documentId} FOR UPDATE`;

    // Como mucho una VIGENTE por (documento, empresa). Re-emitir sobre una
    // emisión anterior degrada la anterior, igual que hace
    // uploadCompanyDocument desde el plan 03-02.
    await tx.companyDocument.updateMany({
      where: { documentId: input.documentId, companyId: assignment.companyId, status: "VIGENTE" },
      data: { status: "OBSOLETO" },
    });

    const last = await tx.companyDocument.findFirst({
      where: { documentId: input.documentId, companyId: assignment.companyId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return tx.companyDocument.create({
      data: {
        documentId: input.documentId,
        companyId: assignment.companyId,
        version: (last?.version ?? 0) + 1,
        kind: doc.kind,
        // Congelado AQUÍ: editar la plantilla después no cambia lo adoptado.
        // Es todo DOC-03 en una línea.
        contentHtml: doc.contentHtml,
        sourceTemplateVersion: doc.templateVersion,
        status: "VIGENTE",
        publishedAt: new Date(),
        publishedById: user.id,
        codeOverride: optionalText(input.codeOverride, 60),
        nameOverride: optionalText(input.nameOverride, 200),
        notes: optionalText(input.notes, 500),
        uploadedById: user.id,
      },
      select: { id: true, version: true },
    });
  });

  revalidatePath(`/tenant-admin/manuals/${doc.manualId}`);
  revalidatePath(`/tenant-admin/manuals/${doc.manualId}/documents/${input.documentId}`);
  revalidatePath(`/tenant-admin/projects/${assignment.id}`);
  revalidatePath(`/professor/projects/${assignment.id}`);
  revalidatePath(`/dashboard/manuals/${assignment.id}`);
  revalidatePath(`/dashboard/documents`);

  return { success: true as const, companyDocumentId: created.id, version: created.version };
}

/** Abre el borrador de edición de una emisión vigente. Idempotente. */
export async function startCompanyDocumentDraft(input: {
  companyDocumentId: string;
}): Promise<
  | { success: true; draftId: string; version: number }
  | { success: false; error: string }
> {
  const { row, user } = await loadCompanyDocumentForWrite(input.companyDocumentId);

  // Dos pestañas abiertas no pueden producir dos borradores: el segundo
  // dejaría un número de versión quemado para siempre.
  const existingDraft = await db.companyDocument.findFirst({
    where: { documentId: row.documentId, companyId: row.companyId, status: "BORRADOR" },
    select: { id: true, version: true },
  });
  if (existingDraft) {
    return { success: true as const, draftId: existingDraft.id, version: existingDraft.version };
  }

  // Sólo se abre un borrador nuevo desde la versión vigente: es la única
  // fila que tiene sentido copiar (no una obsoleta, no otro borrador — ese
  // caso ya se resolvió arriba).
  if (row.status !== "VIGENTE") {
    return { success: false as const, error: "Sólo se puede editar la versión vigente" };
  }

  const draft = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${row.documentId} FOR UPDATE`;

    const last = await tx.companyDocument.findFirst({
      where: { documentId: row.documentId, companyId: row.companyId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    // Copiando de la fila VIGENTE actual (no de la plantilla): el borrador es
    // una edición de lo que la empresa ya tiene, así que sigue basado en la
    // misma plantilla. Volver a adoptar la plantilla más reciente es
    // issueCompanyDocument, que es otro botón — y por eso también se copia
    // `sourceTemplateVersion`, no se recalcula.
    return tx.companyDocument.create({
      data: {
        documentId: row.documentId,
        companyId: row.companyId,
        version: (last?.version ?? 0) + 1,
        kind: row.kind,
        contentHtml: row.contentHtml,
        codeOverride: row.codeOverride,
        nameOverride: row.nameOverride,
        sourceTemplateVersion: row.sourceTemplateVersion,
        status: "BORRADOR",
        // Todavía no se publicó nada de este borrador.
        publishedAt: null,
        publishedById: null,
        uploadedById: user.id,
      },
      select: { id: true, version: true },
    });
  });

  return { success: true as const, draftId: draft.id, version: draft.version };
}

/**
 * Guarda el borrador en sitio. Este guardado es el motivo por el que existe
 * `BORRADOR`: sin él, cada pulsación de Guardar crearía una versión y el
 * historial llegaría a la 47 sin que nada hubiera cambiado.
 */
export async function saveCompanyDocumentDraft(input: {
  companyDocumentId: string;
  contentHtml: string;
  codeOverride?: string;
  nameOverride?: string;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { row } = await loadCompanyDocumentForWrite(input.companyDocumentId);

  // Una versión publicada es historia y no se reescribe.
  if (row.status !== "BORRADOR") {
    return { success: false as const, error: "Sólo se puede editar un borrador" };
  }

  // Sin `version`, sin `create`, sin transacción: no hay número que calcular,
  // así que tampoco hace falta lock. La ausencia del lock aquí es
  // deliberada, no un olvido.
  await db.companyDocument.update({
    where: { id: row.id },
    data: {
      contentHtml: sanitizeManualHtml(input.contentHtml),
      codeOverride: optionalText(input.codeOverride, 60),
      nameOverride: optionalText(input.nameOverride, 200),
      notes: optionalText(input.notes, 500),
    },
  });

  revalidatePath(`/tenant-admin/manuals/${row.document.manualId}/documents/${row.documentId}`);

  return { success: true as const };
}

/** Publica el borrador: lo promueve a VIGENTE y degrada la anterior a OBSOLETO. */
export async function publishCompanyDocument(input: {
  companyDocumentId: string;
}): Promise<
  | { success: true; version: number }
  | { success: false; error: string }
> {
  const { row, user, assignment } = await loadCompanyDocumentForWrite(input.companyDocumentId);

  if (row.status !== "BORRADOR") {
    return { success: false as const, error: "Sólo se puede publicar un borrador" };
  }
  if (!row.contentHtml?.trim()) {
    return { success: false as const, error: "No se puede publicar un documento sin contenido" };
  }

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${row.documentId} FOR UPDATE`;

    // El orden importa y es el único posible: degradar primero, promover
    // después. Al revés habría un instante con dos VIGENTE, y aunque la
    // transacción lo oculte al exterior, es una invitación a que alguien lo
    // copie fuera de una.
    await tx.companyDocument.updateMany({
      where: { documentId: row.documentId, companyId: row.companyId, status: "VIGENTE" },
      data: { status: "OBSOLETO" },
    });

    // No se toca `version`: el número se reservó al abrir el borrador, que
    // es lo que impide dos publicaciones simultáneas con el mismo número.
    await tx.companyDocument.update({
      where: { id: row.id },
      data: { status: "VIGENTE", publishedAt: new Date(), publishedById: user.id },
    });
  });

  revalidatePath(`/tenant-admin/manuals/${row.document.manualId}`);
  revalidatePath(`/tenant-admin/manuals/${row.document.manualId}/documents/${row.documentId}`);
  revalidatePath(`/tenant-admin/projects/${assignment.id}`);
  revalidatePath(`/professor/projects/${assignment.id}`);
  revalidatePath(`/dashboard/manuals/${assignment.id}`);
  revalidatePath(`/dashboard/documents`);

  return { success: true as const, version: row.version };
}

// Ningún envío de correo ni aviso en ninguna de las cuatro acciones de arriba.
// Si algún día hiciera falta avisar al cliente de que tiene versión nueva, va
// en un módulo sin "use server" como compliance-dispatch.ts, invocado desde
// aquí — nunca dentro de este archivo.
