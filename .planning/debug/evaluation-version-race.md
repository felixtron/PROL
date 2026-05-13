# Debug: evaluation-version-race

**Status:** RESOLVED
**Date:** 2026-05-12
**Method:** Continuation of the `count → derived → write` audit; observed but deferred from `workshop-overbook-race`

## Hypothesis

`submitEvaluationAnswers` in `apps/web/lib/actions/evaluation.ts:465-564` reads the highest existing `version` for a participant OUTSIDE the transaction and then creates the new submission inside the transaction with `version = lastVersion + 1`:

```ts
// outside the tx
const last = await db.evaluationSubmission.findFirst({
  where: { participantId },
  orderBy: { version: "desc" },
  select: { version: true },
});
const nextVersion = (last?.version ?? 0) + 1;

await db.$transaction(async (tx) => {
  const submission = await tx.evaluationSubmission.create({
    data: { participantId, ..., version: nextVersion },
  });
  // ...
});
```

The `EvaluationSubmission` model has `@@unique([participantId, version])`. Under concurrent submissions for the same participant (double-click, network retry, two devices) both compute the same `nextVersion`; the second `create()` violates the unique constraint and Postgres throws.

User-visible effect: the second submitter gets an opaque `Unique constraint failed on the fields: ('participantId', 'version')` instead of a clean retry or a useful message. No data corruption — but bad UX during high-stakes evaluation submissions (Ibiza Consultores' ISO 27001 process has many of these).

## Reproduction

- Participant doble-clicks "Enviar" before the first transaction commits → second invocation reads the same `last` version, both try to create `version = N+1`, the loser throws.
- Same participant submits the same form from two tabs at once → identical race.
- Network retry inside `useTransition` could compound it on flaky connections.

## Resolution

Move the version lookup INSIDE the transaction AND take a row lock on `evaluation_participants` first:

```ts
const { version } = await db.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT 1 FROM evaluation_participants WHERE id = ${participantId} FOR UPDATE`;

  const last = await tx.evaluationSubmission.findFirst({
    where: { participantId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const submission = await tx.evaluationSubmission.create({...});
  await tx.evaluationAnswer.createMany({...});

  return { version: nextVersion };
});
```

The row lock on the parent (`evaluation_participants`) serializes concurrent submissions for the same participant. The lookup is now consistent because it can only run when no other tx holds the lock.

Same pattern as the workshop overbook fix (`3515727`) and enrollment progress fix (`b155c31`). Three of the same anti-pattern now closed in 24h; worth documenting in CLAUDE.md when we get to it.

## Fix

`apps/web/lib/actions/evaluation.ts:531-558` — move `findFirst(version)` inside the transaction, add `SELECT ... FOR UPDATE` on `evaluation_participants` as the first statement, return the version from the transaction body.

## Followup

- No other instances of "read max → +1 outside tx" patterns spotted in this audit pass; if any are added later they'd need the same treatment.
- General principle for the codebase: any monotonic sequence (`version`, `lastSeq`, `position`, etc.) computed by client code must come from inside a tx that locks the parent row.
