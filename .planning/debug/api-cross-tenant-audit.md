---
status: investigating
trigger: "Auditar todas las route handlers en apps/web/app/api/**/route.ts por vulnerabilidades cross-tenant"
created: 2026-05-12T00:00:00Z
updated: 2026-05-12T00:00:00Z
---

## Current Focus

hypothesis: Múltiples route handlers delegan a queries que usan autorización basada en professorId (ownership) en lugar de tenantId, permitiendo lectura cross-tenant si un usuario de otro tenant conoce los IDs.
test: Auditar cada route.ts y sus queries delegadas buscando ausencia de tenantId filter o assertSameTenant.
expecting: Al menos 3-4 rutas con auth insuficiente.
next_action: Compilar tabla de hallazgos y entregar inventario.

## Symptoms

expected: Cada handler verifica autenticación + que el recurso pertenece al mismo tenantId que el caller (o es SUPER_ADMIN).
actual: Varias rutas usan professorId-ownership en lugar de tenantId, o no verifican auth en absoluto.
errors: Vulnerabilidad silenciosa — sin error visible.
reproduction: Llamar endpoints con IDs de otro tenant tras autenticarse como usuario de Tenant A.
started: Desde el inicio del proyecto.

## Eliminated

- hypothesis: "assignments/[lessonId] tiene cross-tenant"
  evidence: enrollment.findFirst({ where: { id, studentId: user.id } }) — scoped al user, que pertenece a un único tenant
  timestamp: 2026-05-12

- hypothesis: "notifications tiene cross-tenant"
  evidence: getNotifications filtra por userId en query layer; markAsRead verifica userId también
  timestamp: 2026-05-12

- hypothesis: "upload/assignment, upload/pdf, upload/extract-text tienen cross-tenant"
  evidence: Son endpoints de subida de archivo sin operación sobre recurso DB con tenantId; solo guardan un archivo con UUID aleatorio
  timestamp: 2026-05-12

- hypothesis: "quiz/[lessonId]/answers — getQuizWithAnswers tiene cross-tenant"
  evidence: Verifica attempt.enrollment.studentId === user.id antes de devolver datos
  timestamp: 2026-05-12

## Evidence

- timestamp: 2026-05-12
  checked: apps/web/app/api/interactive-stops/[lessonId]/route.ts
  found: Sin autenticación en el handler — llama getInteractiveStopsForPlayer directamente sin requireUser() en la ruta
  implication: Cualquier request sin sesión llega a la query; la query tiene requireUser() pero si lanza, el catch devuelve 403 con mensaje de error — no 401

- timestamp: 2026-05-12
  checked: lib/queries/interactive-stops.ts → getInteractiveStopsForPlayer
  found: Cuando lessonProgressId es undefined/null, la función devuelve todos los stops del lessonId SIN verificar que el caller esté inscrito en ese curso; solo verifica requireUser(). No hay filtro tenantId.
  implication: ALTO: usuario autenticado de Tenant A puede leer interactive stops de lecciones de Tenant B conociendo el lessonId.

- timestamp: 2026-05-12
  checked: apps/web/app/api/quiz/[lessonId]/route.ts → getQuizForStudent
  found: Sin requireUser() en el route handler; la query lo tiene pero quizId acepta enrollmentId como parámetro de query sin validación previa en la ruta.
  implication: MEDIO: la query verifica enrollment.studentId === user.id — la protección existe en query layer pero no en route layer.

- timestamp: 2026-05-12
  checked: apps/web/app/api/quiz/professor/[lessonId]/route.ts → getQuizForLesson
  found: Sin requireUser() en el route handler; la query verifica lesson.module.course.professorId === user.id — ownership check, NO tenantId check.
  implication: MEDIO: un profesor de Tenant B cuyo professorId coincida con el de Tenant A (imposible si son UUIDs únicos) no puede acceder — pero el check de ownership basado en professorId sin tenantId es conceptualmente frágil.

- timestamp: 2026-05-12
  checked: apps/web/app/api/quiz/[lessonId]/answers/route.ts → getQuizWithAnswers
  found: Sin requireUser() en el route handler; query verifica attempt.enrollment.studentId === user.id — scoping correcto por usuario.
  implication: BAJO: protección existe en query layer aunque falta en route layer.

- timestamp: 2026-05-12
  checked: apps/web/app/api/upload/route.ts (thumbnail upload)
  found: Usa auth.api.getSession directamente en lugar de requireUser(); no guarda relación con tenantId en DB — solo escribe archivo a disco.
  implication: BAJO: cualquier usuario autenticado puede subir thumbnails; no hay cross-tenant de datos pero tampoco verificación de rol (cualquier STUDENT puede subir thumbnails de cursos).

- timestamp: 2026-05-12
  checked: apps/web/app/api/notifications/route.ts (PATCH)
  found: Delega a markAsRead (server action) que verifica userId — correcto. Pero el handler GET no llama requireUser() directamente; delega a getNotifications que sí lo hace.
  implication: BAJO: correctamente protegido en query/action layer.

## Resolution

root_cause: |
  Tres categorías de problema:
  1. Route handlers sin requireUser() propio — dependen del query layer para autenticación (frágil por contrato).
  2. interactive-stops player query: no filtra por tenantId cuando lessonProgressId está ausente — cualquier usuario autenticado puede leer stops de cualquier lección por lessonId.
  3. upload/route.ts (thumbnails): usa getSession en lugar de requireUser() y no verifica rol — cualquier usuario puede subir thumbnails.
fix: pendiente
verification: pendiente
files_changed: []
