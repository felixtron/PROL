# Prácticas de Prueba

**Fecha de análisis:** 2026-09-01

## Estado de las Pruebas Automatizadas

**Situación actual:** No existe suite de pruebas unitarias, de integración ni E2E en el proyecto.

- Búsqueda de archivos `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` → vacío en `apps/` y `packages/`
- Verificación de config: sin `jest.config.js`, `vitest.config.ts`, o similar
- Sin dependencias de testing en `package.json` (Jest, Vitest, Mocha, etc.)

## Estrategia Actual de Verificación

La calidad se asegura mediante:

1. **Type Checking:**
   ```bash
   pnpm check-types
   ```
   - Comando: `next typegen && tsc --noEmit`
   - Verifica tipos de TypeScript sin emitir código
   - Configuración: `apps/web/tsconfig.json`, `packages/*/tsconfig.json`
   - **Nota:** `next typegen` genera tipos adicionales de Next.js (App Router, etc.)

2. **Linting:**
   ```bash
   pnpm lint
   ```
   - Configuración: `apps/web/eslint.config.js` → `@prol/eslint-config/next-js`
   - **Regla crítica:** `eslint --max-warnings 0`
   - Cero tolerancia: si hay warnings, la ejecución falla
   - Extendido en: `packages/eslint-config/next.js`, `packages/eslint-config/base.js`
   - Plugins configurados: TypeScript, React, React Hooks, Next.js
   - Prettier integrado: `eslint-config-prettier` desactiva reglas que conflicten

3. **Formateado:**
   ```bash
   pnpm format
   ```
   - Comando: `prettier --write "**/*.{ts,tsx,md}"`
   - Prettier 3.7.4

4. **Build:**
   ```bash
   pnpm build
   ```
   - Turbo ejecuta build en orden de dependencias
   - Next.js build en `apps/web`: compila con StandAlone mode
   - Detecta errores: componentes sin usar, imports muertos, etc.

## Configuración de ESLint

**Archivo base:** `packages/eslint-config/base.js`

**Configuración Next.js:** `packages/eslint-config/next.js`

**Stack:**
```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import pluginNext from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";
```

**Reglas activadas:**
- `js.configs.recommended` → estándares JavaScript
- `tseslint.configs.recommended` → estándares TypeScript
- `pluginReact.configs.flat.recommended` → prácticas de React
- `pluginReactHooks.configs.recommended` → hooks rules (dependencies, order)
- `pluginNext.configs.recommended` + `core-web-vitals` → Next.js best practices
- `eslint-config-prettier` → desactiva formatting rules

**Reglas específicas desactivadas:**
- `react/react-in-jsx-scope: "off"` → No obligatorio con nuevo JSX transform

**Máximo warnings:** 0 (línea 10 `apps/web/package.json`)

## Formateado de Código

**Prettier 3.7.4**

Configuración heredada (desde root `package.json` o default de Prettier).

**Archivos formateados:** `**/*.{ts,tsx,md}`

**Comando:**
```bash
pnpm format
```

## Herramientas de Verificación en CI/CD

No configurado en este análisis, pero esperado:
- Pre-commit hooks podrían ejecutar `lint` + `check-types`
- CI pipeline debería ejecutar build completo antes de merge

## Patrones de Validación en Tiempo de Escritura

En ausencia de pruebas unitarias, la calidad se asegura mediante:

### 1. Validación con Zod

**Ubicación:** `packages/shared/src/lesson-blocks.ts`

```typescript
export const lessonBlockSchema = z.discriminatedUnion("type", [
  videoBlockSchema,
  pdfBlockSchema,
  textBlockSchema,
  quizBlockSchema,
]);

export const multiLessonContentSchema = z.object({
  blocks: z.array(lessonBlockSchema).max(20),
});
```

**Patrón de uso al escribir:**
```typescript
// En server action: validate before persisting
multiLessonContentSchema.parse(content);  // Lanza si falla
await db.lesson.update({
  where: { id: lessonId },
  data: { content: content as unknown as Prisma.InputJsonValue },
});
```

**Patrón al leer (degradado gracefully):**
```typescript
function readContent(content: unknown): MultiLessonContent {
  const parsed = multiLessonContentSchema.safeParse(content);
  return parsed.success ? parsed.data : { blocks: [] };  // Fallback
}
```

Ubicación: `apps/web/lib/actions/lesson-blocks.ts` líneas 34-37

### 2. Validación Manual de Entrada

**Patrón en server actions:**
```typescript
function text(value: unknown, field: string, max = 300): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${field} es obligatorio`);
  return s.slice(0, max);
}
```

Ejemplo en `manual.ts` línea 119:
```typescript
title: text(input.title, "El título"),
```

Si `input.title` es falsy, lanza `"El título es obligatorio"`.

### 3. Chequeos de Autorización (Guardias)

Funcionan como precondiciones de prueba:

```typescript
export async function requireManualAdmin(): Promise<ManualUser> {
  const user = await requireUser();
  if (!MANAGE_ROLES.has(user.role)) {
    throw new Error("No autorizado: solo el administrador gestiona manuales");
  }
  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenantId) throw new Error("No autorizado: tenant requerido");
    await assertDocumentsEnabled(user.tenantId, user.role);
  }
  return user;
}
```

Ubicación: `apps/web/lib/manual-access.ts` líneas 44-54

Si la llamada llega sin el rol correcto, explota. Es una forma de "test" que el sistema se autodefence.

### 4. Bloqueo de Fila para Concurrencia

Previene bugs de carrera:

```typescript
const evidence = await db.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT 1 FROM compliance_activities WHERE id = ${activity.id} FOR UPDATE`;
  const last = await tx.evidence.findFirst({
    where: { activityId: activity.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return tx.evidence.create({
    data: {
      // ...
      version: (last?.version ?? 0) + 1,
    },
  });
});
```

Ubicación: `apps/web/lib/actions/evidence.ts` líneas 146-176

Si dos usuarios envían a la vez, uno espera el lock, se calcula la versión secuencialmente. Sin esto, ambos verían la misma última versión.

### 5. Tipo Guard (Discriminated Unions)

En componentes y lógica, se usan type guards para asegurar narrowing:

```typescript
if (blockWithId.type === "quiz") {
  const quiz = await db.quiz.findUnique({
    where: { id: blockWithId.quizId },
    // ...
  });
}
```

TypeScript verifica que accedas a campos correctos del tipo discriminado.

## Qué NO se prueba automáticamente

**Riesgos sin suite de pruebas:**

1. **Lógica de negocio compleja:** Cálculos de avance, validaciones condicionales
2. **Flujos de múltiples pasos:** Entrega → revisión → aprobación → siguiente ciclo
3. **Casos límite:** Dividir por cero, listas vacías, null en lugares inesperados
4. **Integraciones con terceros:** Stripe, Resend (email), Google Calendar
5. **Consistencia de datos:** Dos acciones simultáneas, rollback parcial

**Mitigación actual:**
- Type checking + linting detectan muchos errores lógicos (tipos incorrectos)
- Validación manual + Zod evita datos malos en BD
- Guardias de autorización previenen acceso no autorizado
- Build falla si hay imports muertos o componentes sin usar

## Recomendaciones para Introducir Pruebas

Si en el futuro se decide agregar pruebas:

1. **Empezar por servidor actions más críticos:**
   - `apps/web/lib/actions/evidence.ts` (entrega y revisión)
   - `apps/web/lib/actions/evaluation.ts` (calificaciones)
   - `apps/web/lib/actions/quiz.ts` (puntajes)

2. **Framework sugerido:** Vitest (rápido, esyntaxis Jest)

3. **Scope realista:**
   - No probar componentes React (alto mantenimiento sin ROI)
   - Probar logic layer: helpers, validadores, cálculos
   - Probar integración con BD en transacciones

4. **Fixtures:**
   - User factory con roles
   - Company + Tenant factory
   - Evidence factory con versiones

---

*Análisis de testing completado: 2026-09-01*
