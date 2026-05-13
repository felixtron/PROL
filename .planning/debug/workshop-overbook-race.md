# Debug: workshop-overbook-race

**Status:** RESOLVED
**Date:** 2026-05-12
**Method:** Continuation audit of `enrollment-progress-lost-update` — same anti-pattern in other actions

## Hypothesis

`bookWorkshop` in `apps/web/lib/actions/workshop.ts:358-387` wraps a count + create/update inside a `$transaction` and assumes that's enough to prevent overbooking. It is NOT, under Postgres default READ COMMITTED isolation: two concurrent transactions each compute `confirmedCount` against the state at their respective `BEGIN`, neither sees the other's pending booking, and both proceed to `CONFIRMED`. Workshop ends with `bookings.length > maxAttendees`.

The code even has a misleading comment claiming the transaction prevents the race:

```ts
// Use transaction to prevent race condition on last spot
const isWaitlisted = await db.$transaction(async (tx) => {
  // Re-count confirmed bookings inside transaction for accuracy
  const confirmedCount = await tx.workshopBooking.count({
    where: { workshopId, status: { in: ["CONFIRMED"] } },
  });
  const spotsLeft = workshop.maxAttendees - confirmedCount;
  // ...
});
```

Same lost-update class as the `Enrollment.progress` race fixed in commit `b155c31`. Same fix.

## Reproduction

Workshop with `maxAttendees = 10`, currently 9 confirmed bookings. Two students simultaneously hit `bookWorkshop`:

```
Tx1 BEGIN
Tx1 count = 9, spotsLeft = 1, waitlisted = false
Tx1 create booking → CONFIRMED
Tx1 COMMIT

Tx2 BEGIN (started before Tx1 committed)
Tx2 count = 9 (does not see Tx1's pending create)
Tx2 spotsLeft = 1, waitlisted = false
Tx2 create booking → CONFIRMED
Tx2 COMMIT
```

Final state: 11 confirmed bookings on a workshop capped at 10. Whoever shows up second has no seat.

## Resolution

Insert `SELECT 1 FROM workshops WHERE id = $1 FOR UPDATE` as the first statement inside the `$transaction`. Postgres serializes concurrent transactions trying to modify state derived from that workshop row: Tx2 blocks until Tx1 commits, then sees the new booking when it recounts.

The lock is released at commit/rollback. This is cheaper than SERIALIZABLE isolation and more surgical than refactoring to a single `INSERT ... WHERE (SELECT COUNT) < maxAttendees` atomic statement.

## Secondary finding (observation, no fix today)

`submitEvaluation` in `apps/web/lib/actions/evaluation.ts:525-558` reads the next `version` number OUTSIDE the transaction:

```ts
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

Two concurrent submissions for the same participant can compute the same `nextVersion`. The second hits the `@@unique([participantId, version])` constraint and throws. Not silent data corruption — user sees an error and can retry. UX is poor but blast radius is small; deferred.

## Fix

`apps/web/lib/actions/workshop.ts:358` — add `SELECT 1 FROM workshops WHERE id = $1 FOR UPDATE` as the first line inside the `bookWorkshop` `$transaction`. Also remove or correct the misleading comment that claims the transaction alone prevents the race.

## Followup

- `submitEvaluation` race (above) — backlog
- Audit `lib/actions/company.ts` seat limit checks if any (Company.seatsLimit could have the same pattern when inviting members)
- General principle worth a CLAUDE.md note: any `$transaction` whose body has `count() → compute derived → write` requires a row lock on the parent row first. Plain isolation level is not enough.
