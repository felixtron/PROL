# Debug: enrollment-progress-lost-update

**Status:** RESOLVED
**Date:** 2026-05-12
**Method:** Manual analysis of `updateLessonProgress` + `submitQuizAttempt`

## Hypothesis

Concurrent updates to `Enrollment.progress` lose count when two transactions mark different lessons of the same enrollment as COMPLETED at the same time.

`apps/web/lib/actions/enrollment.ts` `updateLessonProgress` wraps three operations in a `$transaction`:

```ts
// 1. upsert lessonProgress (idempotent per (enrollmentId, lessonId))
const upserted = await tx.lessonProgress.upsert({...});

// 2. count completed lessons
const completedCount = await tx.lessonProgress.count({
  where: { enrollmentId, status: "COMPLETED" },
});

// 3. update enrollment.progress
await tx.enrollment.update({
  where: { id: enrollmentId },
  data: { progress: completedCount / totalLessons },
});
```

Under Postgres default `READ COMMITTED` isolation, two transactions started simultaneously each see only their own writes and commits made BEFORE their `BEGIN`. So if Tx1 (lesson A) and Tx2 (lesson B) overlap:

```
Tx1 BEGIN → upsert A → count=5 (own A + 4 previously committed) → update progress=5/10 → COMMIT
Tx2 BEGIN → upsert B → count=5 (own B + 4 previously committed; A not visible because Tx1 hadn't committed when Tx2 began) → update progress=5/10 → COMMIT
```

Final `Enrollment.progress = 5/10` when it should be `6/10`. The lost update is invisible until a subsequent `updateLessonProgress` re-syncs the count.

## Secondary impact

Same race blocks `becameCompleted` detection in `enrollment.ts:131`:

```ts
if (newProgress >= 1.0) {
  // mark enrollment COMPLETED, trigger certificate issuance
}
```

If lesson N (the last one) is marked concurrently with lesson N-1, both transactions may see `completedCount < totalLessons` and neither triggers completion. Certificate never emitted automatically. The student has to mark another lesson (impossible — they're done) or refresh and re-mark for the side effect to fire. Worse: the cert flow in `quiz.ts:336-389` for final exams has the same race and a more visible effect (passed students stuck without certificate).

## Verification

Both files use the same pattern:
- `lib/actions/enrollment.ts:102-148` — `updateLessonProgress`
- `lib/actions/quiz.ts:336-389` — `submitQuizAttempt`

Both run `tx.lessonProgress.count` inside the tx without locking the enrollment row, exposing them to lost updates under concurrent writes.

Reproduction is plausible in normal usage:
- Student double-marks two completed lessons via rapid navigation
- Multi-lesson player auto-marks blocks while the student also clicks "Siguiente"
- Quiz final exam tx runs concurrently with a separately-marked lesson

## Resolution

Insert a `SELECT 1 FROM enrollments WHERE id = $1 FOR UPDATE` at the top of each transaction. This serializes concurrent transactions for that specific enrollment row: Tx2 blocks until Tx1 commits, then its count includes Tx1's upsert. The lock is automatically released at COMMIT/ROLLBACK.

This is cheaper than `SERIALIZABLE` isolation (which retries the whole tx on conflict) and more surgical than refactoring to a single `UPDATE ... SET progress = (SELECT COUNT(*) ...)` atomic statement.

## Fix

Two files:

- `lib/actions/enrollment.ts` `updateLessonProgress` — add `FOR UPDATE` lock as first statement inside the tx, before the upsert.
- `lib/actions/quiz.ts` `submitQuizAttempt` — same.

Prisma exposes raw SQL via `tx.$queryRaw`. The lock is implicit-released at tx end.

## Followup

- `enrollment.ts:155-181` issues the certificate as post-commit side effect (good, no nested tx issue), but the `quiz.ts` flow does the same and was identified in Sprint 1 as fragile because the cert tx is separate. Unrelated to this race; tracked elsewhere.
- Other actions that compute aggregates inside a tx without locking should be audited similarly (workshops attendance, evaluations, etc.) — left as backlog.
