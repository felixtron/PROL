# Debug: player-siblings-zombie-iframe

**Status:** RESOLVED (no zombie iframe siblings) + SECONDARY BUG FOUND
**Date:** 2026-05-12
**Method:** Manual code audit (gsd-debugger spawn failed with internal error after 18 tool uses)

## Hypothesis under test

After fixing `apps/web/components/video-player.tsx` (commit `1b6af83`) with a `key={`${provider}-${src}`}` on the iframe to prevent the "zombie node" pattern (SDK imperative destroy() leaves node disconnected from DOM, React reuses ref to dead node), audit whether the same pattern exists in sibling players:

- `assignment-player.tsx`
- `quiz-player.tsx`
- `multi-lesson-player.tsx`
- `interactive-stop-overlay.tsx`

The pattern requires **four conditions** to be present:
1. `useRef<HTMLElement>` to a DOM node.
2. `useEffect` initialising an external SDK that mounts handlers on that node.
3. Cleanup calls `destroy()` / `unmount()` that mutates the DOM as a side effect.
4. No `key` on the element forcing remount when inputs change.

## Findings

### `assignment-player.tsx` — NOT VULNERABLE to zombie iframe
- Pure React state, no iframes, no SDKs.
- `useEffect` at line 83-97 fetches submission with proper `cancelled` flag — clean.
- **Secondary risk:** state `submission`, `notes`, `fileUrl`, `fileName`, `fileSize` does NOT reset when lessonId changes. If component is recycled between assignments (it is — `LessonView` has no key), old assignment's notes/file briefly visible until fetch resolves. Loading state stale, not crashing.

### `quiz-player.tsx` — NOT VULNERABLE to zombie iframe, but **HAS A REAL BUG**
- No iframe, no SDK.
- **Bug:** State `isStarted`, `currentQuestionIndex`, `answers`, `timeRemaining`, `isSubmitted`, `results`, `score`, `passed`, `attemptId` does NOT reset when `quiz` prop changes (lesson navigation).
- Reproducción: Quiz A (10 preguntas) → empezar → ir a pregunta 5 → marcar 3 respuestas → navegar a Quiz B (3 preguntas). React reusa la instancia de `QuizPlayer` porque su padre `LessonView` no tiene key. `currentQuestionIndex = 4` apunta fuera del rango → crash o pantalla vacía. `answers` keeps length 10 over a quiz of 3 → render extraño.
- **Fix:** Add `key={lesson.id}` (o `key={quiz.id}`) en el render de `<QuizPlayer>` en `course-player.tsx` línea 824 para forzar remount con estado fresco.

### `multi-lesson-player.tsx` — NOT VULNERABLE
- Usa `<VideoPlayer>` internamente para bloques tipo video → **hereda el fix** de `key={src}` aplicado en `video-player.tsx`. Cada bloque tiene `key={block.id}` en el wrapper exterior.
- Para PDFs usa `<iframe src={block.url}>` plano sin SDK — browser maneja src change correctamente. ✅

### `interactive-stop-overlay.tsx` — NOT VULNERABLE
- Sin iframe, sin SDK.
- `triggeredStopsRef` (Set) acumula stops ya disparados; no se resetea cuando cambia el array `stops`. **No causa bug visible** porque los stops del lesson anterior salen del prop, los nuevos entran con IDs diferentes; sólo desperdicia memoria mínima.
- Pero si en el futuro un usuario navega a la MISMA lesson dos veces (volver atrás → adelante → atrás), los stops no se re-disparan. Comportamiento intencional (no quieres re-disparar) pero documentar el supuesto.

## Conclusion

- **Zombie iframe pattern:** UNIQUE to `video-player.tsx`. No siblings exhibit the pattern. The fix `key={provider-src}` is complete.
- **Discovered while auditing:** `quiz-player.tsx` reuses internal state across quiz navigations because `QuizPlayer` is mounted without a `key`. This is a **different bug** but related to the same general anti-pattern ("React reuses component instance + state assumes remount").
- **Recommended fix:** Add `key={lesson.id}` to `<QuizPlayer>` and `<AssignmentPlayer>` in `course-player.tsx`. Both will then remount cleanly when navigating, eliminating stale-state edge cases.

## Fix scope

| File | Line | Change |
|---|---|---|
| `apps/web/app/dashboard/courses/[id]/course-player.tsx` | ~824 | `<QuizPlayer key={lesson.id} ... />` |
| `apps/web/app/dashboard/courses/[id]/course-player.tsx` | ~840 | `<AssignmentPlayer key={lesson.id} ... />` |

(`<MultiLessonPlayer>` already handles it via VideoPlayer child fix; `<VideoPlayer>` already has the iframe key fix.)

## Resolution

Apply the two `key={lesson.id}` additions. Run `pnpm --filter web check-types`. Deploy.
