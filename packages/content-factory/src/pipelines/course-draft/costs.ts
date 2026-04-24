/**
 * Credit costs per operation. Prices can be tuned later without touching
 * pipeline code. These are the *credits* charged to the tenant, not USD.
 * The conversion credit → USD happens at Stripe integration time.
 */

export const CREDIT_COSTS = {
  refinement: 0,           // Step 2 is free to reduce adoption friction
  outlineGeneration: 10,
  lessonRegeneration: 1,
  moduleRegeneration: 3,
  coherenceCheck: 1,
  lessonSplit: 1,
  lessonsMerge: 1,
} as const;

export type OperationKind = keyof typeof CREDIT_COSTS;

export function costOf(kind: OperationKind): number {
  return CREDIT_COSTS[kind];
}

/**
 * Rough USD cost tracking — used for internal margin calculations and to
 * inform the final credit price. Sonnet 4.6 input/output token pricing in
 * USD cents per million tokens (update on rate changes).
 */
export const MODEL_PRICES_CENTS_PER_MTOK = {
  "claude-sonnet-4-5-20250929": { input: 300, output: 1500 },
  "claude-haiku-4-5": { input: 80, output: 400 },
} as const;

export function estimateCostCents(
  model: keyof typeof MODEL_PRICES_CENTS_PER_MTOK,
  tokensIn: number,
  tokensOut: number
): number {
  const prices = MODEL_PRICES_CENTS_PER_MTOK[model];
  if (!prices) return 0;
  const inputCost = (tokensIn / 1_000_000) * prices.input;
  const outputCost = (tokensOut / 1_000_000) * prices.output;
  return Math.ceil(inputCost + outputCost);
}
