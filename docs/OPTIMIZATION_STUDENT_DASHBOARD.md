# Optimization: Student Dashboard Study Hours

## Issue
Previously, the `getStudentDashboardStats` function in `apps/web/lib/queries/student.ts` fetched all `lessonProgress` records for a student into Node.js memory just to sum up the `videoDurationSeconds` from the related `lesson`. This caused a memory and performance bottleneck, especially for students with many completed lessons.

## Solution
Replaced the `findMany` and `reduce` logic with a raw SQL query (`db.$queryRaw`) to perform the sum directly in the PostgreSQL database.

```typescript
      // Sum video duration of completed lessons via DB query
      // This avoids fetching all rows into memory and reducing in JavaScript
      db.$queryRaw<{ totalSeconds: number | null }[]>\`
        SELECT SUM(l.video_duration_seconds) as "totalSeconds"
        FROM lesson_progresses lp
        JOIN lessons l ON l.id = lp.lesson_id
        JOIN enrollments e ON e.id = lp.enrollment_id
        WHERE e.student_id = \${user.id} AND lp.status = 'COMPLETED'
      \`,
```

## Impact
- **Reduced Memory Usage:** Node.js no longer needs to load and process large arrays of lesson progress objects.
- **Improved Performance:** The aggregation is pushed to the database, which is highly optimized for such operations. The result is returned immediately, making the dashboard load faster.

## Measurement
Verify dashboard loading times for students with many completed lessons are faster. Inspect network/database queries via Prisma tracing or standard local logs.
