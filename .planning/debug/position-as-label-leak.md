---
status: resolved
trigger: "Auditar el repo en busca del anti-patron position-as-label-leak — mismo bug que course-player.tsx mostraba Modulo 0, 14, 15..."
created: 2026-05-12T00:00:00Z
updated: 2026-05-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — 2 presentation-layer leaks of raw .position found in professor views; student/public views clean
test: grep exhaustivo + lectura de cada match en apps/web/app y apps/web/components
expecting: N/A — audit complete
next_action: Inventory returned to user

## Symptoms

expected: La columna `position` solo se usa en ORDER BY, drag-n-drop y persistencia. Cuando se muestra al usuario como "numero del item" debe usarse indice del array (1-based).
actual: En course-player.tsx se mostraba Modulo {mod.position} con valor crudo (0, 14, 15, 19...). Hipotesis: patron repetido en otras vistas.
errors: No hay error en consola — bug visual/UX, solo visible con huecos reales en position.
reproduction: grep -rn '.position' apps/web/app apps/web/components --include='*.tsx' y revisar cada match
started: Desde la creacion del schema con columna position

## Eliminated

- hypothesis: apps/web/components contiene leaks de position
  evidence: grep no arroja ningun match en ese directorio
  timestamp: 2026-05-12

- hypothesis: course-editor.tsx usa position como label
  evidence: position solo aparece en type declarations (lineas 63, 82); nunca en JSX visible
  timestamp: 2026-05-12

- hypothesis: survey-editor.tsx usa question.position como numero visible
  evidence: QuestionRow usa `#{index + 1}` (linea 662), no question.position
  timestamp: 2026-05-12

- hypothesis: evaluation-editor.tsx usa position como label de pregunta/seccion
  evidence: QuestionRow muestra question.code (campo propio semantico) y question.label, nunca question.position
  timestamp: 2026-05-12

- hypothesis: course-player.tsx tiene leak de lesson.position
  evidence: lessons en sidebar solo muestran lesson.title; no hay numero de leccion presentado
  timestamp: 2026-05-12

## Evidence

- timestamp: 2026-05-12
  checked: apps/web/components/**/*.tsx
  found: zero matches de .position
  implication: Todo el riesgo esta en apps/web/app

- timestamp: 2026-05-12
  checked: apps/web/app/professor/workshops/new/workshop-form.tsx:158
  found: `Modulo {m.position}: {m.title}` en <option> del select de modulos
  implication: Professor ve numero crudo de position al crear workshop

- timestamp: 2026-05-12
  checked: apps/web/app/professor/workshops/[id]/workshop-detail.tsx:275
  found: template literal con workshop.module.position en subtitulo del detail header
  implication: Professor ve numero crudo de position en la vista de detalle del workshop

- timestamp: 2026-05-12
  checked: apps/web/app/professor/evaluations/[id]/evaluation-editor.tsx
  found: position solo en type declarations; QuestionRow usa question.code (campo semantico independiente)
  implication: Falso positivo — no hay leak

- timestamp: 2026-05-12
  checked: apps/web/app/professor/surveys/[id]/survey-editor.tsx
  found: QuestionRow usa index+1 para numeracion (#1, #2...)
  implication: Correcto — ya usa indice secuencial

- timestamp: 2026-05-12
  checked: apps/web/app/professor/courses/[id]/edit/course-editor.tsx
  found: position solo en type declarations y comentario sobre cursor en textarea
  implication: Falso positivo

- timestamp: 2026-05-12
  checked: apps/web/app/dashboard/courses/[id]/course-player.tsx
  found: modulos usan moduleIndex+1 (ya fixed); lecciones no muestran numero, solo titulo
  implication: Correcto post-fix ae3221c

## Resolution

root_cause: El mismo patron position-as-label-leak persiste en 2 archivos de la seccion del profesor (workshops). Son vista del profesor, no del alumno.
fix: (pendiente) En workshop-form.tsx:158 y workshop-detail.tsx:275, reemplazar m.position / workshop.module.position por el indice del array.
verification: (pendiente)
files_changed:
  - apps/web/app/professor/workshops/new/workshop-form.tsx
  - apps/web/app/professor/workshops/[id]/workshop-detail.tsx
