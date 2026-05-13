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

/**
 * Compute the consolidated DAFO-style results for one assignment
 * (evaluation × company). For each question we take the LATEST submission
 * of every participant and use the majority as the question's verdict
 * (Fortaleza/Debilidad for INTERNAL sections, Oportunidad/Amenaza for
 * EXTERNAL). NOT_APPLICABLE responses are counted separately and excluded
 * from the percentage denominator (a question is "not applicable" only if
 * every responder marked it that way).
 *
 * Authorization: company leader, tenant ADMIN of the same tenant, or
 * SUPER_ADMIN. Also accepted: an evaluation author (PROFESSOR/ADMIN of
 * the tenant) viewing a company they assigned to.
 */
export const getEvaluationResults = cache(async (assignmentId: string) => {
  const caller = await requireUser();

  const assignment = await db.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      evaluation: {
        select: {
          id: true,
          title: true,
          description: true,
          tenantId: true,
          kind: true,
          sections: {
            orderBy: { position: "asc" },
            include: {
              questions: { orderBy: { position: "asc" } },
            },
          },
        },
      },
      company: {
        select: { id: true, name: true, tenantId: true, leaderId: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          submissions: {
            orderBy: { version: "desc" },
            take: 1,
            include: { answers: true },
          },
        },
      },
    },
  });
  if (!assignment) throw new Error("Asignación no encontrada");

  const isSuperAdmin = caller.role === "SUPER_ADMIN";
  const isTenantAdmin =
    (caller.role === "ADMIN" || caller.role === "PROFESSOR") &&
    caller.tenantId === assignment.evaluation.tenantId;
  const isLeader =
    assignment.company.leaderId === caller.id &&
    caller.tenantId === assignment.company.tenantId;
  if (!isSuperAdmin && !isTenantAdmin && !isLeader) {
    throw new Error("No autorizado");
  }

  // Index latest submissions and count answers per question.
  const latestSubmissions = assignment.participants
    .map((p) => {
      const s = p.submissions[0];
      return s ? { ...s, participantUser: p.user } : null;
    })
    .filter((s): s is NonNullable<typeof s> => !!s);

  type Counts = {
    POSITIVE: number;
    PARTIAL: number;
    NEGATIVE: number;
    NOT_APPLICABLE: number;
  };
  const emptyCounts = (): Counts => ({
    POSITIVE: 0,
    PARTIAL: 0,
    NEGATIVE: 0,
    NOT_APPLICABLE: 0,
  });
  const perQuestion = new Map<string, Counts>();
  // Free-text answers: questionId -> Array of { author, text }
  const perQuestionText = new Map<
    string,
    { author: string; text: string }[]
  >();
  // MULTI_FACTOR answers: questionId -> Array of { author, factors }
  const perQuestionFactors = new Map<
    string,
    { author: string; factors: string[] }[]
  >();
  type FactorCounts = {
    STRENGTH: number;
    WEAKNESS: number;
    OPPORTUNITY: number;
    THREAT: number;
  };
  const emptyFactorCounts = (): FactorCounts => ({
    STRENGTH: 0,
    WEAKNESS: 0,
    OPPORTUNITY: 0,
    THREAT: 0,
  });
  const perQuestionFactorCounts = new Map<string, FactorCounts>();
  for (const sub of latestSubmissions) {
    const author = sub.participantUser.name ?? sub.participantUser.email;
    for (const ans of sub.answers) {
      if (ans.value) {
        const c = perQuestion.get(ans.questionId) ?? emptyCounts();
        c[ans.value] += 1;
        perQuestion.set(ans.questionId, c);
      }
      if (ans.text) {
        const arr = perQuestionText.get(ans.questionId) ?? [];
        arr.push({ author, text: ans.text });
        perQuestionText.set(ans.questionId, arr);
      }
      if (ans.factors && ans.factors.length > 0) {
        const arr = perQuestionFactors.get(ans.questionId) ?? [];
        arr.push({ author, factors: ans.factors });
        perQuestionFactors.set(ans.questionId, arr);
        const fc =
          perQuestionFactorCounts.get(ans.questionId) ?? emptyFactorCounts();
        for (const f of ans.factors) fc[f] += 1;
        perQuestionFactorCounts.set(ans.questionId, fc);
      }
    }
  }

  type Verdict =
    | "POSITIVE"
    | "PARTIAL"
    | "NEGATIVE"
    | "NOT_APPLICABLE"
    | "NO_RESPONSE";
  function verdictOf(counts: Counts | undefined): Verdict {
    if (!counts) return "NO_RESPONSE";
    const total =
      counts.POSITIVE + counts.PARTIAL + counts.NEGATIVE + counts.NOT_APPLICABLE;
    if (total === 0) return "NO_RESPONSE";
    // If everyone marked it not-applicable, the question is NOT_APPLICABLE.
    if (counts.NOT_APPLICABLE === total) return "NOT_APPLICABLE";
    // Pick the most-voted answer; ties favor positive > partial > negative.
    const opts: [Verdict, number][] = [
      ["POSITIVE", counts.POSITIVE],
      ["PARTIAL", counts.PARTIAL],
      ["NEGATIVE", counts.NEGATIVE],
    ];
    opts.sort((a, b) => b[1] - a[1]);
    const top = opts[0]!;
    return top[1] === 0 ? "NOT_APPLICABLE" : top[0];
  }

  const sections = assignment.evaluation.sections.map((s) => {
    const questions = s.questions.map((q) => {
      const counts = perQuestion.get(q.id) ?? emptyCounts();
      return {
        id: q.id,
        code: q.code,
        label: q.label,
        type: q.type,
        counts,
        verdict: verdictOf(counts),
        textAnswers: perQuestionText.get(q.id) ?? [],
        factorAnswers: perQuestionFactors.get(q.id) ?? [],
        factorCounts: perQuestionFactorCounts.get(q.id) ?? emptyFactorCounts(),
      };
    });
    // OPEN_TEXT questions don't count toward aggregates.
    const choiceQuestions = questions.filter((q) => q.type === "MULTIPLE_CHOICE");
    const considered = choiceQuestions.filter(
      (q) => q.verdict !== "NOT_APPLICABLE" && q.verdict !== "NO_RESPONSE",
    );
    const positives = considered.filter((q) => q.verdict === "POSITIVE").length;
    const partials = considered.filter((q) => q.verdict === "PARTIAL").length;
    const negatives = considered.filter((q) => q.verdict === "NEGATIVE").length;
    const denom = considered.length;
    const positivePct = denom > 0 ? Math.round((positives / denom) * 1000) / 10 : 0;
    const partialPct = denom > 0 ? Math.round((partials / denom) * 1000) / 10 : 0;
    const negativePct = denom > 0 ? Math.round((negatives / denom) * 1000) / 10 : 0;
    return {
      id: s.id,
      title: s.title,
      type: s.type,
      questions,
      positives,
      partials,
      negatives,
      positivePct,
      partialPct,
      negativePct,
    };
  });

  const totalParticipants = assignment.participants.length;
  const respondents = latestSubmissions.length;

  return {
    assignment: {
      id: assignment.id,
      assignedAt: assignment.assignedAt,
    },
    evaluation: {
      id: assignment.evaluation.id,
      title: assignment.evaluation.title,
      description: assignment.evaluation.description,
      kind: assignment.evaluation.kind,
    },
    company: {
      id: assignment.company.id,
      name: assignment.company.name,
    },
    sections,
    participants: assignment.participants.map((p) => ({
      id: p.id,
      user: p.user,
      respondedAt: p.submissions[0]?.submittedAt ?? null,
      version: p.submissions[0]?.version ?? null,
    })),
    totalParticipants,
    respondents,
  };
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
