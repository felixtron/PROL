// Lectura del contenido de manuales y del estado de cada empresa.
//
// Dos audiencias separadas a propósito:
//   1. Gestión (administrador / consultor) → el manual como contenido y el
//      panel de cada empresa cliente, siempre dentro de su tenant.
//   2. Cliente (miembros y líder de una empresa) → sólo su activación, con el
//      avance y las evidencias de SU empresa.

import { cache } from "react";
import { db } from "@prol/db";
import {
  manualTenantFilter,
  requireAssignmentManageAccess,
  requireAssignmentMemberAccess,
  requireManualAdmin,
  requireManualManageAccess,
  requireManualReviewer,
  requireSectionManageAccess,
} from "@/lib/manual-access";
import { activityState, manualProgress } from "@/lib/compliance";
import { requireUser } from "@/lib/auth";

// ─── Gestión: catálogo de manuales ───────────────────────────────────────────

export const listManualsForAdmin = cache(async () => {
  const user = await requireManualReviewer();
  return db.manual.findMany({
    where: manualTenantFilter(user),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      normaLabel: true,
      status: true,
      updatedAt: true,
      _count: { select: { assignments: true, documents: true } },
      chapters: { select: { _count: { select: { sections: true } } } },
    },
  });
});

/**
 * Proyectos activos (manual × empresa) del tenant. Es la vista natural del
 * consultor: acompaña empresas, no catálogos de contenido.
 */
export const listAssignmentsForStaff = cache(async () => {
  const user = await requireManualReviewer();
  const tenant = manualTenantFilter(user);

  const assignments = await db.manualAssignment.findMany({
    where: tenant.tenantId ? { tenantId: tenant.tenantId } : {},
    orderBy: [{ activatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      activatedAt: true,
      manualId: true,
      company: { select: { id: true, name: true } },
      manual: { select: { id: true, title: true, normaLabel: true } },
      consultant: { select: { id: true, name: true } },
    },
  });

  return Promise.all(
    assignments.map(async (a) => ({
      ...a,
      progress: await getAssignmentProgress(a.id, a.manualId),
      pendingReview: await db.evidence.count({
        where: {
          assignmentId: a.id,
          deletedAt: null,
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
      }),
    })),
  );
});

/** Árbol completo del manual para el editor. */
export const getManualForEdit = cache(async (manualId: string) => {
  const { manual } = await requireManualManageAccess(manualId);
  return db.manual.findUnique({
    where: { id: manual.id },
    select: {
      id: true,
      title: true,
      normaLabel: true,
      description: true,
      status: true,
      tenantId: true,
      chapters: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          parentChapterId: true,
          sections: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              code: true,
              title: true,
              position: true,
              _count: { select: { items: true, requirements: true, documents: true } },
            },
          },
        },
      },
      documents: {
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          // Añadidos para el catálogo del plan 03-06: arquetipo y versión de
          // plantilla en la fila. El conteo de secciones/versiones de empresa
          // de abajo sigue sin filtrar (intocable #6 del plan 03-02) — es lo
          // único que no se toca de este select.
          kind: true,
          templateVersion: true,
          baseFileName: true,
          baseFileSize: true,
          _count: { select: { sections: true, companyDocuments: true } },
        },
      },
      assignments: {
        orderBy: { activatedAt: "desc" },
        select: {
          id: true,
          status: true,
          activatedAt: true,
          company: { select: { id: true, name: true } },
          consultant: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
});

/** Sección completa para el editor. */
export const getSectionForEdit = cache(async (sectionId: string) => {
  const { manual, section } = await requireSectionManageAccess(sectionId);
  const row = await db.manualSection.findUnique({
    where: { id: section.id },
    select: {
      id: true,
      code: true,
      title: true,
      contentHtml: true,
      estimatedMinutes: true,
      chapter: { select: { id: true, title: true } },
      items: { orderBy: { position: "asc" } },
      documents: {
        orderBy: { position: "asc" },
        select: {
          documentId: true,
          note: true,
          position: true,
          document: {
            select: { id: true, code: true, name: true, description: true, baseFileName: true },
          },
        },
      },
      requirements: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          kind: true,
          periodicity: true,
          required: true,
          reminderDaysBefore: true,
          evaluationId: true,
          evaluation: { select: { id: true, title: true } },
        },
      },
    },
  });
  return row ? { manual, section: row } : null;
});

/** Documentos del catálogo del manual, para enlazarlos desde una sección. */
export const listManualDocuments = cache(async (manualId: string) => {
  const { manual } = await requireManualManageAccess(manualId);
  return db.manualDocument.findMany({
    where: { manualId: manual.id },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
});

/** Empresas del tenant que aún no tienen este manual activo. */
export const listCompaniesForActivation = cache(async (manualId: string) => {
  const { manual } = await requireManualManageAccess(manualId);
  const [companies, assigned] = await Promise.all([
    db.company.findMany({
      where: { tenantId: manual.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.manualAssignment.findMany({
      where: { manualId: manual.id },
      select: { companyId: true },
    }),
  ]);
  const taken = new Set(assigned.map((a) => a.companyId));
  return companies.filter((c) => !taken.has(c.id));
});

/** Consultores asignables: administradores y profesores del tenant. */
export const listConsultants = cache(async (tenantId: string) => {
  const user = await requireManualAdmin();
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== tenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
  return db.user.findMany({
    where: { tenantId, role: { in: ["ADMIN", "PROFESSOR"] }, disabledAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
});

/** Evaluaciones publicadas del tenant, para requisitos EVALUATION_LINK. */
export const listEvaluationsForRequirement = cache(async (tenantId: string) => {
  const user = await requireManualAdmin();
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== tenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
  return db.evaluation.findMany({
    where: { tenantId, status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, kind: true },
  });
});

// ─── Gestión: panel de una empresa ───────────────────────────────────────────

export const getAssignmentPanel = cache(async (assignmentId: string) => {
  const { assignment } = await requireAssignmentManageAccess(assignmentId);

  const [row, activities, documents, progress] = await Promise.all([
    db.manualAssignment.findUnique({
      where: { id: assignment.id },
      select: {
        id: true,
        status: true,
        notes: true,
        activatedAt: true,
        company: { select: { id: true, name: true, logo: true } },
        consultant: { select: { id: true, name: true, email: true } },
        manual: {
          select: {
            id: true,
            title: true,
            normaLabel: true,
            documents: {
              orderBy: { code: "asc" },
              select: { id: true, code: true, name: true, baseFileName: true },
            },
          },
        },
      },
    }),
    db.complianceActivity.findMany({
      where: { assignmentId: assignment.id },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        periodNumber: true,
        periodLabel: true,
        dueAt: true,
        status: true,
        requirement: {
          select: {
            id: true,
            name: true,
            kind: true,
            periodicity: true,
            section: { select: { id: true, code: true, title: true } },
          },
        },
        evidences: {
          where: { deletedAt: null },
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, status: true, version: true, submittedAt: true },
        },
      },
    }),
    db.companyDocument.findMany({
      // "Vigente" es un estatus, no la versión más alta. Desde que existe
      // BORRADOR las dos cosas dejaron de ser sinónimas, y este panel enlaza a
      // la descarga: enseñar aquí un borrador sin publicar sería enseñárselo al
      // consultor como si fuera lo que su cliente tiene adoptado.
      where: { companyId: assignment.companyId, status: "VIGENTE" },
      orderBy: [{ documentId: "asc" }, { version: "desc" }],
      select: {
        id: true,
        documentId: true,
        version: true,
        codeOverride: true,
        nameOverride: true,
        kind: true,
        status: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    getAssignmentProgress(assignment.id, assignment.manualId),
  ]);

  return row
    ? {
        assignment: row,
        activities: activities.map((a) => ({
          ...a,
          state: activityState({ status: a.status, dueAt: a.dueAt }),
          latestEvidence: a.evidences[0] ?? null,
        })),
        // Red de seguridad: con el invariante sano hay como mucho una VIGENTE
        // por documento; si alguna vez hubiera dos, se pinta una y no dos
        // filas contradictorias.
        companyDocuments: documents.filter(
          (d, i, all) => all.findIndex((x) => x.documentId === d.documentId) === i,
        ),
        progress,
      }
    : null;
});

/** Avance de una empresa: ítems marcados y requisitos aprobados. */
async function getAssignmentProgress(assignmentId: string, manualId: string) {
  const [totalItems, checkedItems, totalRequirements, approvedRequirements] =
    await Promise.all([
      db.manualSectionItem.count({
        where: { section: { chapter: { manualId } } },
      }),
      db.manualItemCheck.count({ where: { assignmentId } }),
      db.evidenceRequirement.count({
        where: { section: { chapter: { manualId } } },
      }),
      db.complianceActivity.count({
        where: { assignmentId, periodNumber: 1, status: "COMPLETED" },
      }),
    ]);
  return manualProgress({
    totalItems,
    checkedItems,
    totalRequirements,
    approvedRequirements,
  });
}

// ─── Cliente: mis manuales ───────────────────────────────────────────────────

/** Manuales activos de la empresa del usuario. */
export const listMyManuals = cache(async () => {
  const user = await requireUser();
  if (!user.companyId) return [];

  const assignments = await db.manualAssignment.findMany({
    where: { companyId: user.companyId, status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: { activatedAt: "desc" },
    select: {
      id: true,
      status: true,
      manualId: true,
      manual: { select: { id: true, title: true, normaLabel: true, description: true } },
    },
  });

  return Promise.all(
    assignments.map(async (a) => ({
      ...a,
      progress: await getAssignmentProgress(a.id, a.manualId),
      pending: await db.complianceActivity.count({
        where: { assignmentId: a.id, status: "OPEN" },
      }),
    })),
  );
});

/** Portada del manual para el cliente: índice, avance y próximas actividades. */
export const getManualOverview = cache(async (assignmentId: string) => {
  const { assignment, isLeader, isStaff } =
    await requireAssignmentMemberAccess(assignmentId);

  const [manual, checks, activities, progress] = await Promise.all([
    db.manual.findUnique({
      where: { id: assignment.manualId },
      select: {
        id: true,
        title: true,
        normaLabel: true,
        description: true,
        chapters: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            position: true,
            parentChapterId: true,
            sections: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                code: true,
                title: true,
                position: true,
                _count: { select: { items: true, requirements: true } },
              },
            },
          },
        },
      },
    }),
    db.manualItemCheck.findMany({
      where: { assignmentId: assignment.id },
      select: { itemId: true, item: { select: { sectionId: true } } },
    }),
    db.complianceActivity.findMany({
      where: { assignmentId: assignment.id, status: "OPEN" },
      orderBy: [{ dueAt: "asc" }],
      take: 8,
      select: {
        id: true,
        dueAt: true,
        status: true,
        periodLabel: true,
        requirement: {
          select: {
            name: true,
            kind: true,
            section: { select: { id: true, code: true, title: true } },
          },
        },
      },
    }),
    getAssignmentProgress(assignment.id, assignment.manualId),
  ]);
  if (!manual) return null;

  // Cuántos ítems lleva marcados cada sección, para pintar el índice.
  const checkedBySection = new Map<string, number>();
  for (const c of checks) {
    const key = c.item.sectionId;
    checkedBySection.set(key, (checkedBySection.get(key) ?? 0) + 1);
  }

  return {
    assignment,
    isLeader,
    isStaff,
    manual,
    progress,
    checkedBySection: Object.fromEntries(checkedBySection),
    upcoming: activities.map((a) => ({
      ...a,
      state: activityState({ status: a.status, dueAt: a.dueAt }),
    })),
  };
});

/** Detalle de una sección tal como la trabaja el cliente. */
export const getSectionForCompany = cache(
  async (assignmentId: string, sectionId: string) => {
    const { assignment, isLeader, isStaff } =
      await requireAssignmentMemberAccess(assignmentId);

    const section = await db.manualSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        code: true,
        title: true,
        contentHtml: true,
        position: true,
        chapter: {
          select: { id: true, title: true, manualId: true, position: true },
        },
        items: { orderBy: { position: "asc" } },
        documents: {
          orderBy: { position: "asc" },
          select: {
            note: true,
            document: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                baseFileName: true,
                baseFileSize: true,
              },
            },
          },
        },
        requirements: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            kind: true,
            periodicity: true,
            required: true,
            evaluationId: true,
            evaluation: { select: { id: true, title: true } },
          },
        },
      },
    });
    if (!section || section.chapter.manualId !== assignment.manualId) return null;

    const [checks, activities, companyDocs, siblings] = await Promise.all([
      db.manualItemCheck.findMany({
        where: { assignmentId: assignment.id, item: { sectionId } },
        select: {
          itemId: true,
          checkedAt: true,
          checkedBy: { select: { name: true } },
        },
      }),
      db.complianceActivity.findMany({
        where: {
          assignmentId: assignment.id,
          requirement: { sectionId },
        },
        orderBy: [{ requirementId: "asc" }, { periodNumber: "desc" }],
        select: {
          id: true,
          requirementId: true,
          periodNumber: true,
          periodLabel: true,
          dueAt: true,
          status: true,
          evidences: {
            where: { deletedAt: null },
            orderBy: { version: "desc" },
            select: {
              id: true,
              version: true,
              status: true,
              title: true,
              notes: true,
              fileName: true,
              fileSize: true,
              submittedAt: true,
              riskAssessmentId: true,
              uploadedBy: { select: { name: true } },
              reviews: {
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                  id: true,
                  action: true,
                  comment: true,
                  createdAt: true,
                  reviewer: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      db.companyDocument.findMany({
        // "Vigente" es un estatus, no la versión más alta. Desde que existe
        // BORRADOR las dos cosas dejaron de ser sinónimas, y esta es la página
        // que el cliente ve directamente: enseñarle aquí un borrador sin
        // publicar sería mostrarle un procedimiento como si ya lo hubiera
        // adoptado.
        where: {
          companyId: assignment.companyId,
          status: "VIGENTE",
          document: { sections: { some: { sectionId } } },
        },
        orderBy: [{ documentId: "asc" }, { version: "desc" }],
        select: {
          id: true,
          documentId: true,
          version: true,
          codeOverride: true,
          nameOverride: true,
          kind: true,
          status: true,
          fileName: true,
          fileSize: true,
        },
      }),
      // Secciones hermanas del manual, para el índice y el anterior/siguiente.
      db.manualSection.findMany({
        where: { chapter: { manualId: assignment.manualId } },
        orderBy: [{ chapter: { position: "asc" } }, { position: "asc" }],
        select: {
          id: true,
          code: true,
          title: true,
          chapter: { select: { id: true, title: true, position: true } },
        },
      }),
    ]);

    // Sólo el ciclo vigente de cada requisito: el más reciente por número.
    const currentByRequirement = new Map<string, (typeof activities)[number]>();
    for (const a of activities) {
      if (!currentByRequirement.has(a.requirementId)) {
        currentByRequirement.set(a.requirementId, a);
      }
    }

    const checkMap = Object.fromEntries(
      checks.map((c) => [
        c.itemId,
        { checkedAt: c.checkedAt, by: c.checkedBy?.name ?? null },
      ]),
    );

    const index = siblings.findIndex((s) => s.id === section.id);

    return {
      assignment,
      isLeader,
      isStaff,
      section,
      checks: checkMap,
      activities: [...currentByRequirement.values()].map((a) => ({
        ...a,
        state: activityState({ status: a.status, dueAt: a.dueAt }),
        latestEvidence: a.evidences[0] ?? null,
        history: a.evidences,
      })),
      // Red de seguridad: con el invariante sano hay como mucho una VIGENTE
      // por documento; si alguna vez hubiera dos, se pinta una y no dos
      // filas contradictorias.
      companyDocuments: companyDocs.filter(
        (d, i, all) => all.findIndex((x) => x.documentId === d.documentId) === i,
      ),
      siblings,
      prev: index > 0 ? siblings[index - 1] : null,
      next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
    };
  },
);
