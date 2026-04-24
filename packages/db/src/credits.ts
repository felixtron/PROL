import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./index";

/**
 * AI credits ledger — transactional helpers for granting, consuming, and
 * refunding AI credits per tenant.
 *
 * Design:
 * - `Tenant.aiCreditsBalance` is a cached balance for fast reads.
 * - `AICreditsLedger` is the append-only source of truth.
 * - All mutations happen inside an interactive transaction to keep both in sync.
 *
 * Pricing is intentionally not encoded here — consumers pass `amount` and the
 * business rules (plans, top-ups, per-operation costs) live outside. This
 * leaves the door open for Stripe-backed monetization without refactors.
 */

export type CreditReason =
  | "plan_monthly"
  | "plan_initial_grant"
  | "topup_purchase"
  | "course_outline"
  | "course_refinement"
  | "lesson_regenerated"
  | "module_regenerated"
  | "coherence_check"
  | "lesson_split"
  | "lessons_merged"
  | "refund"
  | "admin_adjustment";

export interface ConsumeCreditsInput {
  tenantId: string;
  amount: number;
  reason: CreditReason;
  draftId?: string;
  operationId?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface GrantCreditsInput {
  tenantId: string;
  amount: number;
  reason: CreditReason;
  stripePaymentId?: string;
  metadata?: Prisma.InputJsonValue;
}

export class InsufficientCreditsError extends Error {
  constructor(
    public tenantId: string,
    public requested: number,
    public available: number
  ) {
    super(
      `Insufficient AI credits: requested ${requested}, available ${available}`
    );
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Consume credits atomically. Throws `InsufficientCreditsError` if the tenant
 * does not have enough balance. Returns the new balance.
 */
export async function consumeCredits(
  input: ConsumeCreditsInput,
  client: PrismaClient | Prisma.TransactionClient = db
): Promise<number> {
  if (input.amount <= 0) {
    throw new Error(`consumeCredits: amount must be positive (got ${input.amount})`);
  }

  const run = async (tx: Prisma.TransactionClient) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { aiCreditsBalance: true },
    });
    if (!tenant) throw new Error(`Tenant ${input.tenantId} not found`);

    if (tenant.aiCreditsBalance < input.amount) {
      throw new InsufficientCreditsError(
        input.tenantId,
        input.amount,
        tenant.aiCreditsBalance
      );
    }

    const newBalance = tenant.aiCreditsBalance - input.amount;

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { aiCreditsBalance: newBalance },
    });

    await tx.aICreditsLedger.create({
      data: {
        tenantId: input.tenantId,
        delta: -input.amount,
        reason: input.reason,
        balance: newBalance,
        draftId: input.draftId,
        operationId: input.operationId,
        metadata: input.metadata,
      },
    });

    return newBalance;
  };

  if ("$transaction" in client) {
    return (client as PrismaClient).$transaction(run);
  }
  return run(client as Prisma.TransactionClient);
}

/**
 * Grant credits — plan allotment, top-up purchases, or admin adjustments.
 * Returns the new balance.
 */
export async function grantCredits(
  input: GrantCreditsInput,
  client: PrismaClient | Prisma.TransactionClient = db
): Promise<number> {
  if (input.amount <= 0) {
    throw new Error(`grantCredits: amount must be positive (got ${input.amount})`);
  }

  const run = async (tx: Prisma.TransactionClient) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { aiCreditsBalance: true },
    });
    if (!tenant) throw new Error(`Tenant ${input.tenantId} not found`);

    const newBalance = tenant.aiCreditsBalance + input.amount;

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { aiCreditsBalance: newBalance },
    });

    await tx.aICreditsLedger.create({
      data: {
        tenantId: input.tenantId,
        delta: input.amount,
        reason: input.reason,
        balance: newBalance,
        stripePaymentId: input.stripePaymentId,
        metadata: input.metadata,
      },
    });

    return newBalance;
  };

  if ("$transaction" in client) {
    return (client as PrismaClient).$transaction(run);
  }
  return run(client as Prisma.TransactionClient);
}

/**
 * Refund a previously consumed amount. Used when an AI operation fails after
 * credits were charged. Links to the original operation for traceability.
 */
export async function refundCredits(input: {
  tenantId: string;
  amount: number;
  originalOperationId?: string;
  draftId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<number> {
  return grantCredits({
    tenantId: input.tenantId,
    amount: input.amount,
    reason: "refund",
    metadata: {
      ...(input.metadata as object | undefined),
      originalOperationId: input.originalOperationId,
      draftId: input.draftId,
    } as Prisma.InputJsonValue,
  });
}

/**
 * Read current balance. Fast path that uses the cached column.
 */
export async function getCreditsBalance(tenantId: string): Promise<number> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { aiCreditsBalance: true },
  });
  return tenant?.aiCreditsBalance ?? 0;
}

/**
 * Reconcile the cached balance against the ledger. Run as a nightly job or
 * on-demand if drift is suspected. Returns { cached, actual, drift }.
 */
export async function reconcileBalance(tenantId: string): Promise<{
  cached: number;
  actual: number;
  drift: number;
}> {
  const [tenant, sum] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { aiCreditsBalance: true },
    }),
    db.aICreditsLedger.aggregate({
      where: { tenantId },
      _sum: { delta: true },
    }),
  ]);

  const cached = tenant?.aiCreditsBalance ?? 0;
  const actual = sum._sum.delta ?? 0;
  return { cached, actual, drift: cached - actual };
}
