// Lectura de evidencias y agenda de cumplimiento.
//
// Tres audiencias, sin helpers compartidos entre ellas:
//   1. Revisor (ADMIN / PROFESSOR) → la cola de todo su tenant.
//   2. Líder de empresa → todas las evidencias de SU empresa.
//   3. Miembro → lo suyo llega por la sección del manual (`queries/manual.ts`).

import { cache } from "react";
import { db, type EvidenceStatus } from "@prol/db";
import {
  manualTenantFilter,
  requireCompanyEvidencePanelAccess,
  requireEvidenceReviewAccess,
  requireManualReviewer,
  requireRiskAssessmentAccess,
} from "@/lib/manual-access";
import { activityState } from "@/lib/compliance";
import { requireUser } from "@/lib/auth";

export interface EvidenceQueueFilters {
  status?: EvidenceStatus | "ALL" | "DELETION_REQUESTED";
  companyId?: string;
  manualId?: string;
}

/**
 * Cola de revisión. Sólo la versión vigente de cada actividad: las versiones
 * anteriores son historial y aparecerían como ruido pendiente que ya no
 * existe.
 */
export const listEvidenceQueue = cache(
  async (filters: EvidenceQueueFilters = {}) => {
    const user = await requireManualReviewer();
    const tenant = manualTenantFilter(user);

    const rows = await db.evidence.findMany({
      where: {
        deletedAt: null,
        assignment: {
          ...(tenant.tenantId ? { tenantId: tenant.tenantId } : {}),
          ...(filters.companyId ? { companyId: filters.companyId } : {}),
          ...(filters.manualId ? { manualId: filters.manualId } : {}),
        },
        ...(filters.status === "DELETION_REQUESTED"
          ? { deletionRequestedAt: { not: null } }
          : filters.status && filters.status !== "ALL"
            ? { status: filters.status }
            : {}),
      },
      orderBy: [{ submittedAt: "desc" }],
      take: 300,
      select: {
        id: true,
        version: true,
        status: true,
        title: true,
        fileName: true,
        submittedAt: true,
        deletionRequestedAt: true,
        activityId: true,
        uploadedBy: { select: { name: true, email: true } },
        activity: {
          select: {
            dueAt: true,
            periodLabel: true,
            requirement: {
              select: {
                name: true,
                kind: true,
                section: { select: { id: true, code: true, title: true } },
              },
            },
          },
        },
        assignment: {
          select: {
            id: true,
            company: { select: { id: true, name: true } },
            manual: { select: { id: true, title: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.activityId)) return false;
      seen.add(r.activityId);
      return true;
    });
  },
);

/** Ficha completa de una evidencia con toda su bitácora. */
export const getEvidenceDetail = cache(async (evidenceId: string) => {
  const { user, evidence } = await requireEvidenceReviewAccess(evidenceId);

  const row = await db.evidence.findUnique({
    where: { id: evidence.id },
    select: {
      id: true,
      version: true,
      kind: true,
      status: true,
      title: true,
      notes: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      formSnapshot: true,
      submittedAt: true,
      approvedAt: true,
      deletedAt: true,
      deletionRequestedAt: true,
      riskAssessmentId: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { name: true } },
      deletionRequestedBy: { select: { name: true } },
      evaluationSubmission: {
        select: {
          id: true,
          version: true,
          submittedAt: true,
          participant: {
            select: { assignment: { select: { evaluation: { select: { title: true } } } } },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          action: true,
          comment: true,
          fromStatus: true,
          toStatus: true,
          createdAt: true,
          reviewer: { select: { name: true, email: true } },
        },
      },
      activity: {
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
              description: true,
              kind: true,
              periodicity: true,
              section: { select: { id: true, code: true, title: true } },
            },
          },
        },
      },
      assignment: {
        select: {
          id: true,
          company: { select: { id: true, name: true } },
          manual: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!row) return null;

  // Versiones anteriores de la misma actividad: el hilo de correcciones.
  const versions = await db.evidence.findMany({
    where: { activityId: row.activity.id },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, submittedAt: true, deletedAt: true },
  });

  return { user, evidence: row, versions };
});

// ─── Panel del líder de empresa ──────────────────────────────────────────────

export const listCompanyEvidence = cache(async () => {
  const { company } = await requireCompanyEvidencePanelAccess();

  const rows = await db.evidence.findMany({
    where: { deletedAt: null, assignment: { companyId: company.id } },
    orderBy: { submittedAt: "desc" },
    take: 300,
    select: {
      id: true,
      version: true,
      status: true,
      title: true,
      fileName: true,
      submittedAt: true,
      deletionRequestedAt: true,
      activityId: true,
      uploadedBy: { select: { name: true, email: true } },
      activity: {
        select: {
          dueAt: true,
          periodLabel: true,
          requirement: {
            select: {
              name: true,
              kind: true,
              section: { select: { id: true, code: true, title: true } },
            },
          },
        },
      },
      assignment: {
        select: { id: true, manual: { select: { id: true, title: true } } },
      },
    },
  });

  const seen = new Set<string>();
  return {
    company,
    evidences: rows.filter((r) => {
      if (seen.has(r.activityId)) return false;
      seen.add(r.activityId);
      return true;
    }),
  };
});

// ─── Agenda ──────────────────────────────────────────────────────────────────

/**
 * Actividades abiertas de la empresa del usuario, ordenadas por urgencia. Las
 * que no tienen fecha van al final: son trabajo pendiente, no compromisos.
 */
export const listAgendaForCompany = cache(async () => {
  const user = await requireUser();
  if (!user.companyId) return [];

  const activities = await db.complianceActivity.findMany({
    where: {
      assignment: { companyId: user.companyId, status: "ACTIVE" },
      status: "OPEN",
    },
    orderBy: [{ dueAt: "asc" }],
    select: {
      id: true,
      dueAt: true,
      status: true,
      periodLabel: true,
      assignmentId: true,
      requirement: {
        select: {
          name: true,
          kind: true,
          periodicity: true,
          section: { select: { id: true, code: true, title: true } },
        },
      },
      assignment: { select: { manual: { select: { id: true, title: true } } } },
    },
  });

  return activities
    .map((a) => ({ ...a, state: activityState({ status: a.status, dueAt: a.dueAt }) }))
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });
});

/** Agenda de todas las empresas del tenant, para el consultor. */
export const listAgendaForStaff = cache(async (companyId?: string) => {
  const user = await requireManualReviewer();
  const tenant = manualTenantFilter(user);

  const activities = await db.complianceActivity.findMany({
    where: {
      status: "OPEN",
      dueAt: { not: null },
      assignment: {
        status: "ACTIVE",
        ...(tenant.tenantId ? { tenantId: tenant.tenantId } : {}),
        ...(companyId ? { companyId } : {}),
      },
    },
    orderBy: [{ dueAt: "asc" }],
    take: 300,
    select: {
      id: true,
      dueAt: true,
      status: true,
      periodLabel: true,
      assignmentId: true,
      requirement: {
        select: {
          name: true,
          kind: true,
          periodicity: true,
          section: { select: { id: true, code: true, title: true } },
        },
      },
      assignment: {
        select: {
          id: true,
          manualId: true,
          company: { select: { id: true, name: true } },
          manual: { select: { id: true, title: true } },
          consultant: { select: { name: true } },
        },
      },
    },
  });

  return activities.map((a) => ({
    ...a,
    state: activityState({ status: a.status, dueAt: a.dueAt }),
  }));
});

// ─── Matriz de riesgos ───────────────────────────────────────────────────────

export const getRiskAssessment = cache(async (assessmentId: string) => {
  const { assessment, canEdit } = await requireRiskAssessmentAccess(assessmentId);
  const row = await db.riskAssessment.findUnique({
    where: { id: assessment.id },
    select: {
      id: true,
      title: true,
      periodLabel: true,
      status: true,
      config: true,
      assignmentId: true,
      requirementId: true,
      submittedAt: true,
      submittedBy: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!row) return null;

  // Actividad viva del requisito: es a la que se entregará la matriz.
  const activity = row.requirementId && row.assignmentId
    ? await db.complianceActivity.findFirst({
        where: {
          assignmentId: row.assignmentId,
          requirementId: row.requirementId,
          status: "OPEN",
        },
        orderBy: { periodNumber: "desc" },
        select: { id: true, periodLabel: true, dueAt: true },
      })
    : null;

  return { assessment: row, canEdit, activity };
});
