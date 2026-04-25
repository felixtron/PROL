import { cache } from "react";
import { db } from "@prol/db";
import { requireEvaluationAuthor, requireUser } from "@/lib/auth";

/** List all evaluation templates for the current user's tenant. */
export const listEvaluationsForTenant = cache(async () => {
  const user = await requireEvaluationAuthor();
  if (!user.tenantId) return [];
  return db.evaluation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { sections: true, assignments: true } },
    },
  });
});

/** Detailed view of a single evaluation with all sections, questions and
 * current company assignments. Authz: same-tenant or SUPER_ADMIN. */
export const getEvaluationDetail = cache(async (evaluationId: string) => {
  const user = await requireEvaluationAuthor();
  const ev = await db.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      sections: {
        orderBy: { position: "asc" },
        include: {
          questions: { orderBy: { position: "asc" } },
        },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
          _count: { select: { participants: true } },
        },
      },
    },
  });
  if (!ev) throw new Error("Evaluación no encontrada");
  if (user.role !== "SUPER_ADMIN" && ev.tenantId !== user.tenantId) {
    throw new Error("No autorizado");
  }
  return ev;
});

/**
 * Evaluations assigned to a given company, with participant status per
 * member. Only callable by the company's leader, a tenant admin or
 * SUPER_ADMIN.
 *
 * For each participant we also include whether they've already submitted
 * and the latest version so the UI can show Pendiente / Respondido /
 * Actualizado.
 */
export const getCompanyEvaluations = cache(async (companyId: string) => {
  const caller = await requireUser();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, tenantId: true, leaderId: true, name: true },
  });
  if (!company) throw new Error("Empresa no encontrada");

  const isSuperAdmin = caller.role === "SUPER_ADMIN";
  const isTenantAdmin =
    caller.role === "ADMIN" && caller.tenantId === company.tenantId;
  const isLeader =
    company.leaderId === caller.id && caller.tenantId === company.tenantId;
  if (!isSuperAdmin && !isTenantAdmin && !isLeader) {
    throw new Error("No autorizado");
  }

  const assignments = await db.evaluationAssignment.findMany({
    where: { companyId },
    orderBy: { assignedAt: "desc" },
    include: {
      evaluation: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          sections: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
      participants: {
        orderBy: { addedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          submissions: {
            orderBy: { version: "desc" },
            take: 1,
            select: {
              id: true,
              version: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  return { company, assignments };
});

/**
 * Evaluations the current user must answer (one per EvaluationParticipant
 * row where userId = current user). Used by the dashboard card.
 */
export const listMyPendingEvaluations = cache(async () => {
  const user = await requireUser();
  const rows = await db.evaluationParticipant.findMany({
    where: { userId: user.id },
    orderBy: { addedAt: "desc" },
    include: {
      assignment: {
        include: {
          evaluation: {
            select: { id: true, title: true, description: true },
          },
          company: { select: { id: true, name: true } },
        },
      },
      submissions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, submittedAt: true },
      },
    },
  });
  return rows;
});

/**
 * Detail of a single participation: the evaluation template (sections +
 * questions) and the participant's most recent submission, used to
 * pre-fill the form on edit. Authz: caller must be the participant user.
 */
export const getMyParticipantDetail = cache(async (participantId: string) => {
  const user = await requireUser();
  const participant = await db.evaluationParticipant.findUnique({
    where: { id: participantId },
    include: {
      assignment: {
        include: {
          evaluation: {
            include: {
              sections: {
                orderBy: { position: "asc" },
                include: {
                  questions: { orderBy: { position: "asc" } },
                },
              },
            },
          },
          company: { select: { id: true, name: true } },
        },
      },
      submissions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { answers: true },
      },
    },
  });
  if (!participant) throw new Error("Participación no encontrada");
  if (participant.userId !== user.id) throw new Error("No autorizado");
  return participant;
});

/** Companies of the user's tenant, lean shape for the assign picker. */
export const listAssignableCompaniesForEvaluation = cache(
  async (evaluationId: string) => {
    const user = await requireEvaluationAuthor();
    const ev = await db.evaluation.findUnique({
      where: { id: evaluationId },
      select: { tenantId: true },
    });
    if (!ev) throw new Error("Evaluación no encontrada");
    if (user.role !== "SUPER_ADMIN" && ev.tenantId !== user.tenantId) {
      throw new Error("No autorizado");
    }
    return db.company.findMany({
      where: { tenantId: ev.tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        leaderId: true,
        _count: { select: { members: true } },
      },
    });
  },
);
