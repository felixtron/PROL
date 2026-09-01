"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  type EvidencePeriodicity,
  type EvidenceRequirementKind,
  type ManualItemKind,
} from "@prol/db";
import {
  assertTenantScope,
  requireAssignmentManageAccess,
  requireAssignmentMemberAccess,
  requireCompanyInTenant,
  requireManualAdmin,
  requireManualManageAccess,
  requireSectionManageAccess,
  resolveAdminTenantId,
} from "@/lib/manual-access";
import {
  createActivitiesForAssignment,
  notifyManualActivated,
} from "@/lib/compliance-dispatch";
import { sanitizeManualHtml } from "@/lib/sanitize-manual-html";
import { DEFAULT_REMINDER_DAYS, periodLabel } from "@/lib/compliance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function text(value: unknown, field: string, max = 300): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${field} es obligatorio`);
  return s.slice(0, max);
}

function optionalText(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function normalizeReminderDays(input: unknown): number[] {
  if (!Array.isArray(input)) return DEFAULT_REMINDER_DAYS;
  const days = input
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 180);
  const unique = [...new Set(days)].sort((a, b) => b - a).slice(0, 5);
  return unique.length ? unique : DEFAULT_REMINDER_DAYS;
}

function parseDueDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

/** Siguiente posición libre en una lista ordenada. */
async function nextPosition(
  model: "chapter" | "section" | "item" | "sectionDocument" | "requirement",
  parentId: string,
): Promise<number> {
  const last = await (async () => {
    switch (model) {
      case "chapter":
        return db.manualChapter.findFirst({
          where: { manualId: parentId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
      case "section":
        return db.manualSection.findFirst({
          where: { chapterId: parentId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
      case "item":
        return db.manualSectionItem.findFirst({
          where: { sectionId: parentId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
      case "sectionDocument":
        return db.manualSectionDocument.findFirst({
          where: { sectionId: parentId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
      case "requirement":
        return db.evidenceRequirement.findFirst({
          where: { sectionId: parentId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
    }
  })();
  return (last?.position ?? -1) + 1;
}

function revalidateManual(manualId: string) {
  revalidatePath("/tenant-admin/manuals");
  revalidatePath(`/tenant-admin/manuals/${manualId}`);
}

// ─── Manual ───────────────────────────────────────────────────────────────────

export async function createManual(input: {
  title: string;
  normaLabel?: string;
  description?: string;
  tenantId?: string;
}) {
  const user = await requireManualAdmin();
  const tenantId = resolveAdminTenantId(user, input.tenantId);

  const manual = await db.manual.create({
    data: {
      tenantId,
      createdById: user.id,
      title: text(input.title, "El título"),
      normaLabel: optionalText(input.normaLabel, 120),
      description: optionalText(input.description),
    },
    select: { id: true },
  });

  revalidatePath("/tenant-admin/manuals");
  return { success: true as const, manualId: manual.id };
}

export async function updateManual(input: {
  manualId: string;
  title: string;
  normaLabel?: string;
  description?: string;
}) {
  const { manual } = await requireManualManageAccess(input.manualId);
  await db.manual.update({
    where: { id: manual.id },
    data: {
      title: text(input.title, "El título"),
      normaLabel: optionalText(input.normaLabel, 120),
      description: optionalText(input.description),
    },
  });
  revalidateManual(manual.id);
  return { success: true as const };
}

/**
 * Publica el manual. Se exige al menos una sección: un manual publicado es lo
 * que se puede activar para una empresa, y activar un manual vacío deja al
 * cliente con una pantalla en blanco y ninguna pista de qué hacer.
 */
export async function publishManual(manualId: string) {
  const { manual } = await requireManualManageAccess(manualId);
  const sections = await db.manualSection.count({
    where: { chapter: { manualId: manual.id } },
  });
  if (sections === 0) {
    return { success: false as const, error: "Agrega al menos una sección antes de publicar" };
  }
  await db.manual.update({
    where: { id: manual.id },
    data: { status: "PUBLISHED" },
  });
  revalidateManual(manual.id);
  return { success: true as const };
}

export async function setManualStatus(
  manualId: string,
  status: "DRAFT" | "ARCHIVED",
) {
  const { manual } = await requireManualManageAccess(manualId);
  await db.manual.update({ where: { id: manual.id }, data: { status } });
  revalidateManual(manual.id);
  return { success: true as const };
}

/**
 * Borra un manual. Se niega si alguna empresa lo tiene activo: por cascada se
 * llevaría por delante evidencias aprobadas, que son el expediente del cliente
 * y no pueden desaparecer por un borrado de contenido.
 */
export async function deleteManual(manualId: string) {
  const { manual } = await requireManualManageAccess(manualId);
  const assignments = await db.manualAssignment.count({
    where: { manualId: manual.id },
  });
  if (assignments > 0) {
    return {
      success: false as const,
      error:
        "Este manual está activo en una o más empresas. Archívalo en vez de eliminarlo.",
    };
  }
  await db.manual.delete({ where: { id: manual.id } });
  revalidatePath("/tenant-admin/manuals");
  return { success: true as const };
}

// ─── Capítulos ────────────────────────────────────────────────────────────────

export async function createChapter(input: {
  manualId: string;
  title: string;
  parentChapterId?: string | null;
}) {
  const { manual } = await requireManualManageAccess(input.manualId);

  if (input.parentChapterId) {
    const parent = await db.manualChapter.findUnique({
      where: { id: input.parentChapterId },
      select: { manualId: true, parentChapterId: true },
    });
    if (!parent || parent.manualId !== manual.id) {
      throw new Error("Capítulo padre no encontrado");
    }
    // Un solo nivel de anidación, igual que los submódulos de un curso: más
    // profundidad hace ilegible el índice sin aportar nada a una norma.
    if (parent.parentChapterId) {
      return { success: false as const, error: "Solo se permite un nivel de subcapítulos" };
    }
  }

  const chapter = await db.manualChapter.create({
    data: {
      manualId: manual.id,
      parentChapterId: input.parentChapterId ?? null,
      title: text(input.title, "El título"),
      position: await nextPosition("chapter", manual.id),
    },
    select: { id: true },
  });
  revalidateManual(manual.id);
  return { success: true as const, chapterId: chapter.id };
}

export async function updateChapter(input: { chapterId: string; title: string }) {
  const user = await requireManualAdmin();
  const chapter = await db.manualChapter.findUnique({
    where: { id: input.chapterId },
    select: { id: true, manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!chapter) throw new Error("Capítulo no encontrado");
  assertTenantScope(user, chapter.manual.tenantId);

  await db.manualChapter.update({
    where: { id: chapter.id },
    data: { title: text(input.title, "El título") },
  });
  revalidateManual(chapter.manualId);
  return { success: true as const };
}

export async function deleteChapter(chapterId: string) {
  const user = await requireManualAdmin();
  const chapter = await db.manualChapter.findUnique({
    where: { id: chapterId },
    select: { id: true, manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!chapter) throw new Error("Capítulo no encontrado");
  assertTenantScope(user, chapter.manual.tenantId);

  const withEvidence = await db.evidence.count({
    where: { activity: { requirement: { section: { chapterId } } } },
  });
  if (withEvidence > 0) {
    return {
      success: false as const,
      error: "Hay evidencias entregadas en este capítulo. No se puede eliminar.",
    };
  }

  await db.manualChapter.delete({ where: { id: chapter.id } });
  revalidateManual(chapter.manualId);
  return { success: true as const };
}

export async function reorderChapters(manualId: string, orderedIds: string[]) {
  const { manual } = await requireManualManageAccess(manualId);
  const chapters = await db.manualChapter.findMany({
    where: { manualId: manual.id },
    select: { id: true },
  });
  const valid = new Set(chapters.map((c) => c.id));
  await db.$transaction(
    orderedIds
      .filter((id) => valid.has(id))
      .map((id, index) =>
        db.manualChapter.update({ where: { id }, data: { position: index } }),
      ),
  );
  revalidateManual(manual.id);
  return { success: true as const };
}

// ─── Secciones ────────────────────────────────────────────────────────────────

export async function createSection(input: {
  chapterId: string;
  title: string;
  code?: string;
}) {
  const user = await requireManualAdmin();
  const chapter = await db.manualChapter.findUnique({
    where: { id: input.chapterId },
    select: { id: true, manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!chapter) throw new Error("Capítulo no encontrado");
  assertTenantScope(user, chapter.manual.tenantId);

  const section = await db.manualSection.create({
    data: {
      chapterId: chapter.id,
      title: text(input.title, "El título"),
      code: optionalText(input.code, 20),
      position: await nextPosition("section", chapter.id),
    },
    select: { id: true },
  });
  revalidateManual(chapter.manualId);
  return { success: true as const, sectionId: section.id };
}

export async function updateSection(input: {
  sectionId: string;
  title: string;
  code?: string;
  contentHtml?: string;
  estimatedMinutes?: number | null;
}) {
  const { manual, section } = await requireSectionManageAccess(input.sectionId);

  await db.manualSection.update({
    where: { id: section.id },
    data: {
      title: text(input.title, "El título"),
      code: optionalText(input.code, 20),
      // Se sanea SIEMPRE al escribir: en la base nunca hay marcado peligroso,
      // así que ninguna vista puede convertirse en un XSS por olvidarse.
      ...(input.contentHtml !== undefined
        ? { contentHtml: sanitizeManualHtml(input.contentHtml) }
        : {}),
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes > 0
          ? Math.min(Math.round(input.estimatedMinutes), 600)
          : null,
    },
  });
  revalidateManual(manual.id);
  revalidatePath(`/tenant-admin/manuals/${manual.id}/sections/${section.id}`);
  return { success: true as const };
}

export async function deleteSection(sectionId: string) {
  const { manual, section } = await requireSectionManageAccess(sectionId);
  const withEvidence = await db.evidence.count({
    where: { activity: { requirement: { sectionId: section.id } } },
  });
  if (withEvidence > 0) {
    return {
      success: false as const,
      error: "Hay evidencias entregadas en esta sección. No se puede eliminar.",
    };
  }
  await db.manualSection.delete({ where: { id: section.id } });
  revalidateManual(manual.id);
  return { success: true as const };
}

export async function reorderSections(chapterId: string, orderedIds: string[]) {
  const user = await requireManualAdmin();
  const chapter = await db.manualChapter.findUnique({
    where: { id: chapterId },
    select: { manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!chapter) throw new Error("Capítulo no encontrado");
  assertTenantScope(user, chapter.manual.tenantId);

  const sections = await db.manualSection.findMany({
    where: { chapterId },
    select: { id: true },
  });
  const valid = new Set(sections.map((s) => s.id));
  await db.$transaction(
    orderedIds
      .filter((id) => valid.has(id))
      .map((id, index) =>
        db.manualSection.update({ where: { id }, data: { position: index } }),
      ),
  );
  revalidateManual(chapter.manualId);
  return { success: true as const };
}

// ─── Ítems (paso a paso y autoevaluación) ─────────────────────────────────────

export async function createSectionItem(input: {
  sectionId: string;
  kind: ManualItemKind;
  text: string;
  helpText?: string;
}) {
  const { manual, section } = await requireSectionManageAccess(input.sectionId);
  const item = await db.manualSectionItem.create({
    data: {
      sectionId: section.id,
      kind: input.kind,
      text: text(input.text, "El texto", 1000),
      helpText: optionalText(input.helpText, 1000),
      position: await nextPosition("item", section.id),
    },
    select: { id: true },
  });
  revalidatePath(`/tenant-admin/manuals/${manual.id}/sections/${section.id}`);
  return { success: true as const, itemId: item.id };
}

export async function updateSectionItem(input: {
  itemId: string;
  text: string;
  helpText?: string;
}) {
  const user = await requireManualAdmin();
  const item = await db.manualSectionItem.findUnique({
    where: { id: input.itemId },
    select: {
      id: true,
      sectionId: true,
      section: {
        select: { chapter: { select: { manualId: true, manual: { select: { tenantId: true } } } } },
      },
    },
  });
  if (!item) throw new Error("Ítem no encontrado");
  assertTenantScope(user, item.section.chapter.manual.tenantId);

  await db.manualSectionItem.update({
    where: { id: item.id },
    data: {
      text: text(input.text, "El texto", 1000),
      helpText: optionalText(input.helpText, 1000),
    },
  });
  revalidatePath(
    `/tenant-admin/manuals/${item.section.chapter.manualId}/sections/${item.sectionId}`,
  );
  return { success: true as const };
}

export async function deleteSectionItem(itemId: string) {
  const user = await requireManualAdmin();
  const item = await db.manualSectionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      sectionId: true,
      section: {
        select: { chapter: { select: { manualId: true, manual: { select: { tenantId: true } } } } },
      },
    },
  });
  if (!item) throw new Error("Ítem no encontrado");
  assertTenantScope(user, item.section.chapter.manual.tenantId);

  await db.manualSectionItem.delete({ where: { id: item.id } });
  revalidatePath(
    `/tenant-admin/manuals/${item.section.chapter.manualId}/sections/${item.sectionId}`,
  );
  return { success: true as const };
}

// ─── Documentos del catálogo ──────────────────────────────────────────────────

export async function createManualDocument(input: {
  manualId: string;
  code: string;
  name: string;
  description?: string;
  /** Si viene, se enlaza además a esta sección. */
  sectionId?: string;
  file?: { fileKey: string; fileName: string; fileSize: number; mimeType: string };
}) {
  const { user, manual } = await requireManualManageAccess(input.manualId);

  const code = text(input.code, "El código documental", 60);
  const existing = await db.manualDocument.findUnique({
    where: { manualId_code: { manualId: manual.id, code } },
    select: { id: true },
  });
  if (existing) {
    return { success: false as const, error: `Ya existe un documento con el código ${code}` };
  }

  const doc = await db.manualDocument.create({
    data: {
      manualId: manual.id,
      code,
      name: text(input.name, "El nombre"),
      description: optionalText(input.description),
      baseFileKey: input.file?.fileKey ?? null,
      baseFileName: input.file?.fileName ?? null,
      baseFileSize: input.file?.fileSize ?? null,
      baseMimeType: input.file?.mimeType ?? null,
      uploadedById: input.file ? user.id : null,
    },
    select: { id: true },
  });

  if (input.sectionId) {
    await linkDocumentToSection({ sectionId: input.sectionId, documentId: doc.id });
  }
  revalidateManual(manual.id);
  return { success: true as const, documentId: doc.id };
}

export async function updateManualDocument(input: {
  documentId: string;
  code: string;
  name: string;
  description?: string;
  /** Sustituye la plantilla base. Omitir para dejar la que hay. */
  file?: { fileKey: string; fileName: string; fileSize: number; mimeType: string };
}) {
  const user = await requireManualAdmin();
  const doc = await db.manualDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true, manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!doc) throw new Error("Documento no encontrado");
  assertTenantScope(user, doc.manual.tenantId);

  const code = text(input.code, "El código documental", 60);
  const clash = await db.manualDocument.findUnique({
    where: { manualId_code: { manualId: doc.manualId, code } },
    select: { id: true },
  });
  if (clash && clash.id !== doc.id) {
    return { success: false as const, error: `Ya existe un documento con el código ${code}` };
  }

  await db.manualDocument.update({
    where: { id: doc.id },
    data: {
      code,
      name: text(input.name, "El nombre"),
      description: optionalText(input.description),
      ...(input.file
        ? {
            baseFileKey: input.file.fileKey,
            baseFileName: input.file.fileName,
            baseFileSize: input.file.fileSize,
            baseMimeType: input.file.mimeType,
            uploadedById: user.id,
          }
        : {}),
    },
  });
  revalidateManual(doc.manualId);
  return { success: true as const };
}

export async function deleteManualDocument(documentId: string) {
  const user = await requireManualAdmin();
  const doc = await db.manualDocument.findUnique({
    where: { id: documentId },
    select: { id: true, manualId: true, manual: { select: { tenantId: true } } },
  });
  if (!doc) throw new Error("Documento no encontrado");
  assertTenantScope(user, doc.manual.tenantId);

  const personalized = await db.companyDocument.count({
    where: { documentId: doc.id },
  });
  if (personalized > 0) {
    return {
      success: false as const,
      error: "Hay empresas con una versión personalizada de este documento.",
    };
  }
  await db.manualDocument.delete({ where: { id: doc.id } });
  revalidateManual(doc.manualId);
  return { success: true as const };
}

export async function linkDocumentToSection(input: {
  sectionId: string;
  documentId: string;
  note?: string;
}) {
  const { manual, section } = await requireSectionManageAccess(input.sectionId);
  const doc = await db.manualDocument.findUnique({
    where: { id: input.documentId },
    select: { manualId: true },
  });
  if (!doc || doc.manualId !== manual.id) {
    throw new Error("El documento pertenece a otro manual");
  }

  await db.manualSectionDocument.upsert({
    where: {
      sectionId_documentId: { sectionId: section.id, documentId: input.documentId },
    },
    create: {
      sectionId: section.id,
      documentId: input.documentId,
      note: optionalText(input.note, 500),
      position: await nextPosition("sectionDocument", section.id),
    },
    update: { note: optionalText(input.note, 500) },
  });
  revalidatePath(`/tenant-admin/manuals/${manual.id}/sections/${section.id}`);
  return { success: true as const };
}

export async function unlinkDocumentFromSection(input: {
  sectionId: string;
  documentId: string;
}) {
  const { manual, section } = await requireSectionManageAccess(input.sectionId);
  await db.manualSectionDocument.deleteMany({
    where: { sectionId: section.id, documentId: input.documentId },
  });
  revalidatePath(`/tenant-admin/manuals/${manual.id}/sections/${section.id}`);
  return { success: true as const };
}

// ─── Requisitos de evidencia ──────────────────────────────────────────────────

export async function createEvidenceRequirement(input: {
  sectionId: string;
  name: string;
  description?: string;
  kind: EvidenceRequirementKind;
  periodicity: EvidencePeriodicity;
  required?: boolean;
  reminderDaysBefore?: number[];
  evaluationId?: string | null;
}) {
  const { user, manual, section } = await requireSectionManageAccess(
    input.sectionId,
  );

  if (input.kind === "EVALUATION_LINK") {
    if (!input.evaluationId) {
      return { success: false as const, error: "Elige la evaluación que satisface el requisito" };
    }
    const evaluation = await db.evaluation.findUnique({
      where: { id: input.evaluationId },
      select: { tenantId: true },
    });
    if (!evaluation) throw new Error("Evaluación no encontrada");
    assertTenantScope(user, evaluation.tenantId);
  }

  const requirement = await db.evidenceRequirement.create({
    data: {
      sectionId: section.id,
      name: text(input.name, "El nombre"),
      description: optionalText(input.description),
      kind: input.kind,
      periodicity: input.periodicity,
      required: input.required ?? true,
      reminderDaysBefore: normalizeReminderDays(input.reminderDaysBefore),
      evaluationId: input.kind === "EVALUATION_LINK" ? input.evaluationId : null,
      position: await nextPosition("requirement", section.id),
    },
    select: { id: true, reminderDaysBefore: true },
  });

  // Las empresas que ya tienen el manual activo necesitan la actividad del
  // requisito nuevo; si no, quedaría invisible hasta la siguiente activación.
  const assignments = await db.manualAssignment.findMany({
    where: { manualId: manual.id, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (assignments.length) {
    await db.complianceActivity.createMany({
      data: assignments.map((a) => ({
        assignmentId: a.id,
        requirementId: requirement.id,
        periodNumber: 1,
        reminderDaysBefore: requirement.reminderDaysBefore,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/tenant-admin/manuals/${manual.id}/sections/${section.id}`);
  return { success: true as const, requirementId: requirement.id };
}

export async function updateEvidenceRequirement(input: {
  requirementId: string;
  name: string;
  description?: string;
  periodicity: EvidencePeriodicity;
  required?: boolean;
  reminderDaysBefore?: number[];
}) {
  const user = await requireManualAdmin();
  const requirement = await db.evidenceRequirement.findUnique({
    where: { id: input.requirementId },
    select: {
      id: true,
      sectionId: true,
      section: {
        select: { chapter: { select: { manualId: true, manual: { select: { tenantId: true } } } } },
      },
    },
  });
  if (!requirement) throw new Error("Requisito no encontrado");
  assertTenantScope(user, requirement.section.chapter.manual.tenantId);

  await db.evidenceRequirement.update({
    where: { id: requirement.id },
    data: {
      name: text(input.name, "El nombre"),
      description: optionalText(input.description),
      periodicity: input.periodicity,
      required: input.required ?? true,
      reminderDaysBefore: normalizeReminderDays(input.reminderDaysBefore),
    },
  });
  revalidatePath(
    `/tenant-admin/manuals/${requirement.section.chapter.manualId}/sections/${requirement.sectionId}`,
  );
  return { success: true as const };
}

export async function deleteEvidenceRequirement(requirementId: string) {
  const user = await requireManualAdmin();
  const requirement = await db.evidenceRequirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      sectionId: true,
      section: {
        select: { chapter: { select: { manualId: true, manual: { select: { tenantId: true } } } } },
      },
    },
  });
  if (!requirement) throw new Error("Requisito no encontrado");
  assertTenantScope(user, requirement.section.chapter.manual.tenantId);

  const delivered = await db.evidence.count({
    where: { activity: { requirementId: requirement.id } },
  });
  if (delivered > 0) {
    return {
      success: false as const,
      error: "Ya hay evidencias entregadas para este requisito. No se puede eliminar.",
    };
  }
  await db.evidenceRequirement.delete({ where: { id: requirement.id } });
  revalidatePath(
    `/tenant-admin/manuals/${requirement.section.chapter.manualId}/sections/${requirement.sectionId}`,
  );
  return { success: true as const };
}

// ─── Activación por empresa ───────────────────────────────────────────────────

export async function activateManualForCompany(input: {
  manualId: string;
  companyId: string;
  consultantId?: string | null;
  notes?: string;
}) {
  const { user, manual } = await requireManualManageAccess(input.manualId);
  if (manual.status !== "PUBLISHED") {
    return { success: false as const, error: "Publica el manual antes de activarlo" };
  }
  const company = await requireCompanyInTenant(user, input.companyId, manual.tenantId);

  if (input.consultantId) {
    const consultant = await db.user.findUnique({
      where: { id: input.consultantId },
      select: { tenantId: true, role: true },
    });
    if (!consultant) throw new Error("Consultor no encontrado");
    if (consultant.tenantId !== manual.tenantId) {
      throw new Error("El consultor pertenece a otro tenant");
    }
    if (!["ADMIN", "PROFESSOR"].includes(consultant.role)) {
      return { success: false as const, error: "El consultor debe ser administrador o profesor" };
    }
  }

  const existing = await db.manualAssignment.findUnique({
    where: { manualId_companyId: { manualId: manual.id, companyId: company.id } },
    select: { id: true },
  });
  if (existing) {
    return { success: false as const, error: "Esta empresa ya tiene el manual activo" };
  }

  const assignment = await db.manualAssignment.create({
    data: {
      manualId: manual.id,
      companyId: company.id,
      tenantId: manual.tenantId,
      consultantId: input.consultantId ?? null,
      activatedById: user.id,
      notes: optionalText(input.notes),
    },
    select: { id: true },
  });

  // Fuera de la creación: si el alta de actividades o el aviso fallan, la
  // activación ya está hecha y se puede reintentar sin duplicarla.
  await createActivitiesForAssignment(assignment.id, manual.id);
  await notifyManualActivated({
    assignmentId: assignment.id,
    tenantId: manual.tenantId,
    companyId: company.id,
    manualTitle: manual.title,
  });

  revalidateManual(manual.id);
  return { success: true as const, assignmentId: assignment.id };
}

export async function updateManualAssignment(input: {
  assignmentId: string;
  consultantId?: string | null;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED";
  notes?: string;
}) {
  const { user, assignment } = await requireAssignmentManageAccess(input.assignmentId);

  if (input.consultantId) {
    const consultant = await db.user.findUnique({
      where: { id: input.consultantId },
      select: { tenantId: true, role: true },
    });
    if (!consultant || consultant.tenantId !== assignment.tenantId) {
      throw new Error("Consultor no válido");
    }
  }

  await db.manualAssignment.update({
    where: { id: assignment.id },
    data: {
      ...(input.consultantId !== undefined ? { consultantId: input.consultantId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: optionalText(input.notes) } : {}),
    },
  });
  assertTenantScope(user, assignment.tenantId);
  revalidatePath(`/tenant-admin/manuals/${assignment.manualId}`);
  revalidatePath("/tenant-admin/projects");
  revalidatePath(`/tenant-admin/projects/${assignment.id}`);
  revalidatePath(`/professor/projects/${assignment.id}`);
  return { success: true as const };
}

/** Sube la versión personalizada de un documento para una empresa. */
export async function uploadCompanyDocument(input: {
  assignmentId: string;
  documentId: string;
  file: { fileKey: string; fileName: string; fileSize: number; mimeType: string };
  codeOverride?: string;
  notes?: string;
}) {
  const { user, assignment } = await requireAssignmentManageAccess(input.assignmentId);

  const doc = await db.manualDocument.findUnique({
    where: { id: input.documentId },
    select: { manualId: true },
  });
  if (!doc || doc.manualId !== assignment.manualId) {
    return {
      success: false as const,
      error: "El documento no pertenece a este manual",
    };
  }

  await db.$transaction(async (tx) => {
    // Serializa la siguiente versión de este documento para cualquier empresa.
    // Se bloquea `manual_documents` y no `company_documents` a propósito: el par
    // (documento, empresa) puede no tener ninguna fila todavía, y un FOR UPDATE
    // sobre cero filas no bloquea nada.
    await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${input.documentId} FOR UPDATE`;

    const last = await tx.companyDocument.findFirst({
      where: { documentId: input.documentId, companyId: assignment.companyId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    // Append-only: la versión anterior se conserva y la vigente es la mayor.
    await tx.companyDocument.create({
      data: {
        documentId: input.documentId,
        companyId: assignment.companyId,
        version: (last?.version ?? 0) + 1,
        codeOverride: optionalText(input.codeOverride, 60),
        fileKey: input.file.fileKey,
        fileName: input.file.fileName,
        fileSize: input.file.fileSize,
        mimeType: input.file.mimeType,
        notes: optionalText(input.notes, 500),
        uploadedById: user.id,
      },
      select: { id: true },
    });
  });

  revalidatePath(`/tenant-admin/projects/${assignment.id}`);
  revalidatePath(`/professor/projects/${assignment.id}`);
  revalidatePath(`/dashboard/manuals/${assignment.id}`);
  return { success: true as const };
}

/** Fija o borra la fecha comprometida de una actividad. */
export async function setActivityDueDate(input: {
  activityId: string;
  dueAt: string | null;
}) {
  const user = await requireManualAdmin();
  const activity = await db.complianceActivity.findUnique({
    where: { id: input.activityId },
    select: {
      id: true,
      assignmentId: true,
      assignment: { select: { tenantId: true, manualId: true } },
      requirement: { select: { periodicity: true } },
    },
  });
  if (!activity) throw new Error("Actividad no encontrada");
  assertTenantScope(user, activity.assignment.tenantId);

  const dueAt = parseDueDate(input.dueAt);
  await db.complianceActivity.update({
    where: { id: activity.id },
    data: {
      dueAt,
      periodLabel: dueAt ? periodLabel(activity.requirement.periodicity, dueAt) : null,
      // Mover la fecha reabre la ventana de avisos: si se aplaza un mes, los
      // recordatorios del tramo nuevo deben volver a salir.
      remindersSent: 0,
      lastRemindedAt: null,
    },
  });
  revalidatePath(`/tenant-admin/projects/${activity.assignmentId}`);
  revalidatePath(`/professor/projects/${activity.assignmentId}`);
  revalidatePath("/tenant-admin/agenda");
  revalidatePath("/professor/agenda");
  revalidatePath("/dashboard/agenda");
  return { success: true as const };
}

// ─── Avance del cliente ───────────────────────────────────────────────────────

/**
 * Marca o desmarca un ítem del checklist de una sección.
 *
 * El avance es de la empresa: cualquier miembro puede marcar, y queda
 * registrado quién lo hizo. Por eso la clave única es (activación, ítem) y no
 * (usuario, ítem).
 */
export async function toggleItemCheck(input: {
  assignmentId: string;
  itemId: string;
  checked: boolean;
}) {
  const { user, assignment } = await requireAssignmentMemberAccess(input.assignmentId);

  const item = await db.manualSectionItem.findUnique({
    where: { id: input.itemId },
    select: {
      id: true,
      sectionId: true,
      section: { select: { chapter: { select: { manualId: true } } } },
    },
  });
  if (!item || item.section.chapter.manualId !== assignment.manualId) {
    throw new Error("Este ítem no pertenece al manual de tu empresa");
  }

  if (input.checked) {
    await db.manualItemCheck.upsert({
      where: {
        assignmentId_itemId: { assignmentId: assignment.id, itemId: item.id },
      },
      create: {
        assignmentId: assignment.id,
        itemId: item.id,
        checkedById: user.id,
      },
      update: { checkedById: user.id, checkedAt: new Date() },
    });
  } else {
    await db.manualItemCheck.deleteMany({
      where: { assignmentId: assignment.id, itemId: item.id },
    });
  }

  revalidatePath(`/dashboard/manuals/${assignment.id}`);
  revalidatePath(`/dashboard/manuals/${assignment.id}/sections/${item.sectionId}`);
  return { success: true as const };
}
