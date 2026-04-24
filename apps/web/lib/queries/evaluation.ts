import { cache } from "react";
import { db } from "@prol/db";
import { requireEvaluationAuthor } from "@/lib/auth";

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
