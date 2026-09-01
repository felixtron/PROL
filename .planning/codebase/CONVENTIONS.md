# Convenciones de Código

**Fecha de análisis:** 2026-09-01

## Idioma

**Principio fundamental:** Identificadores en inglés, textos de usuario en español.

- **Identificadores (variables, funciones, tipos, rutas):** inglés camelCase/PascalCase
  - Ejemplos: `createManual`, `requireManualAdmin`, `manualId`, `tenantId`, `normaLabel`
  - Excepciones raras en nombres muy específicos del dominio: `dc3` (constancia DC-3 de RFC)

- **Textos de usuario (errores, labels, mensajes):** español minúscula sin punto final
  - Ejemplos: "El título", "Capítulo no encontrado", "Esta acción solo aplica a lecciones multiformato"
  - En validación: `text(input.title, "El título")` → mensaje en español

## Estructura de Archivos

**Patrón de nombres:**
- Archivos: `kebab-case.ts`, `kebab-case.tsx`
- Componentes React: archivos `kebab-case.tsx` → export `PascalCase`
- Funciones/helpers: archivos `kebab-case.ts` → exports `camelCase`
- Tipos/interfaces: PascalCase en cualquier archivo
- Constantes: `SCREAMING_SNAKE_CASE`

**Ejemplos:**
- `apps/web/components/manual-content.tsx` → `export function ManualContent(...)`
- `apps/web/lib/manual-access.ts` → `export async function requireManualAdmin()`
- `apps/web/lib/actions/manual.ts` → `export async function createManual(...)`

## Organización de Importaciones

**Orden (sin líneas en blanco entre grupos):**

1. Next.js/Node.js estándar
2. Dependencias externas
3. Imports de workspace (`@prol/*`)
4. Imports locales (`@/lib/*`, `@/components/*`)

**Ejemplo:**
```typescript
import { revalidatePath } from "next/cache";
import { db, type EvidencePeriodicity } from "@prol/db";
import { assertTenantScope, requireManualAdmin } from "@/lib/manual-access";
import { sanitizeManualHtml } from "@/lib/sanitize-manual-html";
```

**Aliases configurados:**
- `@/` → `apps/web/`
- `@prol/db` → `packages/db`
- `@prol/shared` → `packages/shared`
- `@prol/email` → `packages/email`
- `@prol/ui` → `packages/ui`
- Otros workspace packages bajo `@prol/`

## Nomenclatura de Funciones

**Funciones asincrónicas de autorización (guardias):**
- Prefijo `require*` para funciones que lanzan error si fallan
- Ejemplo: `requireManualAdmin()`, `requireAssignmentMemberAccess()`, `requireUser()`

**Funciones de validación booleana:**
- Prefijo `is*` o `assert*`
- `is*` devuelve boolean: `isManualAdmin(user)`
- `assert*` lanza error: `assertTenantScope(user, tenantId)`

**Funciones de lógica de negocio:**
- Verbos de acción en imperativo: `createManual()`, `updateSection()`, `deleteChapter()`, `submitEvidence()`
- Funciones que leen con prefijo `load*`: `loadEvidenceContext()`

**Funciones de despacho de efectos secundarios:**
- Prefijo `notify*` para notificaciones: `notifyEvidenceSubmitted()`, `notifyManualActivated()`
- No viven en módulos `"use server"` para evitar exposición como RPC público
- Ubicadas en `compliance-dispatch.ts`, `survey-dispatch.ts`, etc. (archivos sin `"use server"`)

## Formatos de Retorno

**Server actions discriminables (patrón estándar):**

Éxito:
```typescript
{ success: true as const, [data]: value }
```

Error:
```typescript
{ success: false as const, error: string }
```

**Ejemplo de uso:**
```typescript
export async function submitEvidence(input: {...}): Promise<
  | { success: true; evidenceId: string }
  | { success: false; error: string }
> {
  if (condition) return { success: false, error: "Descripción del error" };
  return { success: true, evidenceId: evidence.id };
}
```

**En la UI:**
```typescript
const result = await submitEvidence(input);
if (result.success) {
  // result.evidenceId está disponible (discriminado)
} else {
  // result.error está disponible
}
```

## Validación de Entrada

**Validación manual con helpers:**
```typescript
function text(value: unknown, field: string, max = 300): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${field} es obligatorio`);
  return s.slice(0, max);
}

function optionalText(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}
```

**Validación con Zod (uniones discriminadas):**
- Ubicación: `packages/shared/src/lesson-blocks.ts`
- Patrón: `z.discriminatedUnion("type", [...])`
- Validación al escribir: `multiLessonContentSchema.parse(content)` lanza error si falla
- Lectura degradada: `safeParse()` devuelve fallback si falla (línea 34-37 en `lib/actions/lesson-blocks.ts`)

```typescript
const parsed = multiLessonContentSchema.safeParse(content);
return parsed.success ? parsed.data : { blocks: [] };
```

## Seguridad: Saneado de HTML

**Invariante crítico:** HTML se sanea ANTES de guardar, nunca al leer.

- **Archivo de saneado:** `apps/web/lib/sanitize-manual-html.ts`
- **Allowlist cerrado:** líneas 22-42, solo clases `manual-*` + `text-center`, `text-right`
- **Esquemas permitidos:** solo `http`, `https`, `mailto`
- **Aplicación:** `sanitizeManualHtml(input.contentHtml)` en `updateSection()` línea 343
- **Renderizado:** `dangerouslySetInnerHTML` es seguro SOLO en `ManualContent` (línea 23 `manual-content.tsx`) porque el HTML en BD ya está saneado

**Patrón de uso:**
```typescript
// Al guardar (en server action):
contentHtml: sanitizeManualHtml(input.contentHtml)

// Al leer (en componente):
<ManualContent html={section.contentHtml} />
// ManualContent hace dangerouslySetInnerHTML sin miedo porque ya está saneado
```

## Filtro de Tenant (Fail-Closed)

**Patrón de autorización:** `tenantId: user.tenantId ?? "__none__"`

Ubicaciones:
- `apps/web/lib/manual-access.ts` línea 87: `manualTenantFilter()`
- `apps/web/lib/queries/survey.ts` línea 29: `tenantFilter()`
- `apps/web/lib/queries/interactive-stops.ts`

**Por qué el fallback importa:**
```typescript
function tenantFilter(user: { role: string; tenantId: string | null }) {
  if (user.role === "SUPER_ADMIN" && !user.tenantId) return {};  // Sin filtro
  return { tenantId: user.tenantId ?? "__none__" };  // Fallback a valor imposible
}
```

Si `user.tenantId` es null y no es SUPER_ADMIN, la query busca `tenantId: "__none__"`, que nunca existe. La consulta devuelve nada en lugar de mostrar todo (fail-closed). Es más seguro que `tenantId: user.tenantId` que podría dejar `undefined` en el filtro Prisma.

## Incremento de Versión con Bloqueo de Fila

**Patrón para operaciones concurrentes:**

Ubicaciones:
- `apps/web/lib/actions/evidence.ts` línea 146-176 (submitEvidence)
- `apps/web/lib/actions/enrollment.ts` (enrollments)
- `apps/web/lib/actions/evaluation.ts` (evaluation_participants)
- `apps/web/lib/actions/workshop.ts` (workshops)
- `apps/web/lib/actions/quiz.ts` (enrollments)

**Ejemplo completo (evidence.ts):**
```typescript
const evidence = await db.$transaction(async (tx) => {
  // Serializa a los miembros de la misma empresa que entreguen a la vez.
  await tx.$queryRaw`SELECT 1 FROM compliance_activities WHERE id = ${activity.id} FOR UPDATE`;
  
  const last = await tx.evidence.findFirst({
    where: { activityId: activity.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  
  return tx.evidence.create({
    data: {
      activityId: activity.id,
      assignmentId: activity.assignmentId,
      version: (last?.version ?? 0) + 1,
      // ... resto de datos
    },
    select: { id: true },
  });
});
```

**Cuándo usarlo:**
- Cualquier campo `version: Int` que se auto-incremente con `(last?.version ?? 0) + 1`
- Previene carrera entre dos clientes que envíen a la vez: uno espera el lock

## Prohibición de Despacho en "use server"

**Regla:** Las funciones que envían correos o programan tareas no pueden vivir en módulos `"use server"`.

**Por qué:**
- Todo export async de un módulo `"use server"` se expone como RPC público
- Un cliente autenticado podría invocar con ID arbitrario: `await dispatch.sendEmail("random-id")`
- Los correos/programación NO deben ser accesibles vía RPC directo

**Patrón:**
- Despacho de correos/eventos: `apps/web/lib/compliance-dispatch.ts` (sin `"use server"`)
- Encuestas: `apps/web/lib/survey-dispatch.ts` (sin `"use server"`)
- Se importan en server actions ya autorizadas que hacen el chequeo de permisos

**Archivo de referencia (líneas 1-9 compliance-dispatch.ts):**
```typescript
// Este archivo NO es `"use server"` a propósito. En el App Router cada export
// async de un módulo `"use server"` queda expuesto como RPC; si estas
// funciones vivieran ahí, un cliente autenticado podría mandar correos o
// programar actividades invocándolas con un id arbitrario. Los llamadores
// (server actions ya autorizadas y la ruta de cron) las importan directamente.
```

## Manejo de Errores

**Patrón de server actions:**
1. Validación de entrada → devolver `{ success: false, error: "..." }`
2. Chequeos de autorización → lanzar Error (fail-fast)
3. Lógica de negocio → devolver o lanzar según contexto
4. Operaciones que pueden fallar después de commit (correos): envolver en try-catch sin revertir

**Ejemplo (evidence.ts línea 178-183):**
```typescript
// Aviso fuera de la transacción: un fallo de correo no puede deshacer una
// entrega que el usuario ya dio por hecha.
const ctx = await loadEvidenceContext(evidence.id);
if (ctx) {
  await notifyEvidenceSubmitted(ctx, user.name ?? user.email);
}
```

## Logging

**Framework:** `console` en desarrollo; JSON estructurado en producción.

**Patrón (compliance-dispatch.ts líneas 46-66):**
```typescript
function log(
  level: "info" | "warn" | "error",
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const record = {
    ts: new Date().toISOString(),
    level,
    component: "compliance",
    msg,
    ...fields,
  };
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "log"](JSON.stringify(record));
  } else {
    console[level === "error" ? "error" : "log"](
      `[${level}] [compliance] ${msg}`,
      fields,
    );
  }
}
```

## Comentarios y Documentación

**JSDoc/TSDoc:**
- Funciones públicas que resuelven problemas específicos → doc + ejemplo
- Patrón: problema en una o dos líneas, luego contexto del por qué

**Ejemplos:**
```typescript
/**
 * Cierra la actividad aprobada y abre la del ciclo siguiente si el requisito
 * es periódico.
 *
 * El siguiente ciclo es una actividad NUEVA, no una versión más de la misma:
 * lo que se aprobó este semestre sigue siendo el registro válido de este
 * semestre, y mezclarlos haría imposible responder "¿qué entregamos en 2026-S1?".
 */
export async function completeActivityAndScheduleNext(
  activityId: string,
  approvedAt: Date,
): Promise<{ nextDueAt: Date | null }>
```

**Separadores de secciones:**
```typescript
// ─── Manual ───────────────────────────────────────────────────────────────────
// ─── Capítulos ────────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
```

Usados para agrupar funciones relacionadas en archivos largos (e.g., `manual.ts` con 1000+ líneas).

## Formatos de Commit

**Patrón:** `{tipo}({scope}): {descripción en español minúscula}`

Tipos observados:
- `feat`: feature nueva
- `fix`: bug fix
- `chore`: cambios de configuración, desarrollo, setup
- `docs`: documentación
- `style`: cambios visuales/CSS sin comportamiento

Ejemplos recientes:
```
feat(cumplimiento): módulo de gestión documental y evidencias
fix(quiz): el puntaje mínimo por defecto pasa de 70 a 80
chore(dev): la base local escucha en el 5435
docs: DEPLOY.md apuntaba al VPS que ya no sirve el sitio
style: paleta neutra en los correos del sistema
```

**Alcance:** módulo/característica afectada, minúscula

---

*Análisis de convenciones completado: 2026-09-01*
