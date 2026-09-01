# Phase 1: Higiene y operación - Research

**Researched:** 2026-09-01
**Domain:** Deuda técnica puntual (lock de fila, validación de JSON con Zod) + operación (backup, compose) sobre un codebase existente. Sin librerías nuevas.
**Confidence:** HIGH — todos los hallazgos están verificados abriendo el archivo real y contrastando con el schema de Prisma; no hay nada basado en training data no verificado.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Todo lo de esta sección viene del plan aprobado y está **cerrado**. No re-litigar.

#### OPS-03 — el bloqueo de fila

- El patrón de la casa es ``await tx.$queryRaw`SELECT 1 FROM <tabla> WHERE id = ${id} FOR UPDATE` `` dentro de `db.$transaction`. El ejemplo vivo está en `apps/web/lib/actions/evidence.ts` (~línea 148). `apps/web/lib/actions/manual.ts` **no tiene ninguno**: el incremento de versión está en las líneas 880-900, y compite contra `@@unique([documentId, companyId, version])`.
- **La trampa, y es la decisión clave de la fase:** hay que bloquear la fila de **`manual_documents`**, no la de `company_documents`. El "padre" natural sería el par (documento, empresa), pero ese par **puede tener cero filas** la primera vez, y un `FOR UPDATE` sobre un resultado vacío no bloquea nada. `manual_documents` siempre existe y es el punto natural de serialización para "siguiente versión de este documento para cualquier empresa".
- Contrapartida aceptada: sobre-serializa levemente entre dos empresas distintas que suban a la vez para el mismo documento. Es estrictamente mejor que la carrera actual.

#### OPS-04 — el snapshot tipado

- Archivo nuevo `packages/shared/src/evidence-snapshot.ts`: unión discriminada de Zod con un campo `snapshotVersion` **y** el `kind` de la evidencia.
- **Sin migración de datos.** Las filas actuales no tienen discriminador, así que la unión lleva una **rama legacy** que las reconoce por su forma y las sigue renderizando. Añadir una segunda forma sin discriminador es justo lo que convertiría el cast actual en un render silenciosamente incorrecto.
- Al leer se usa `safeParse` con degradación limpia, no `parse`. El precedente es `packages/shared/src/lesson-blocks.ts`.
- El punto de consumo a corregir es el cast ad-hoc de `apps/web/components/evidence-detail.tsx` (~línea 72).

#### OPS-01 y OPS-02 — operación

- `scripts/backup.sh` hoy fija `UPLOADS_VOLUME="${UPLOADS_VOLUME:-prol_prol_uploads}"` (línea 27) y tarea un solo volumen (línea 56). Se añade `PRIVATE_VOLUME` con la misma forma y un segundo tarball con **la misma política de retención**.
- `docker-compose.prod.yml` (bloques de servicio ~64-66 y de volúmenes ~98-100) gana `prol_private:/app/private-uploads` y su declaración. Esto es documentación ejecutable: aunque el módulo acabe en R2, si el compose discrepa de producción, el siguiente que reconstruya desde ahí pierde el fallback.
- `DEPLOY.md` §7b debe quedar coherente con lo anterior, y dejar escrito que el compose y el quadlet se mantienen sincronizados.

#### Deduplicación del data-URL

- Se conserva `apps/web/lib/certificate-assets.ts` como origen único y se borra el helper en línea de la ruta PDF de evaluaciones, junto con sus imports de `readFile`, `join` y `resolveUploadDir` si quedan huérfanos.
- La convención del helper es **degradar devolviendo null, no lanzar**. No cambiarla.

### Claude's Discretion

- Cómo se reparte el trabajo en planes y olas.
- La forma exacta de los esquemas Zod y los nombres de los tipos exportados.
- Si `backup.sh` se refactoriza a un bucle sobre una lista de volúmenes o se duplica el bloque. Cualquiera vale mientras la retención sea idéntica para los dos.
- Cómo se demuestra el criterio 3 (concurrencia) sin suite de pruebas: un script desechable que dispare dos escrituras simultáneas es aceptable y no debe commitearse.

### Deferred Ideas (OUT OF SCOPE)

- **Diagnóstico por SSH de si `backup.sh` corre siquiera en el host.** El script invoca `docker` y `DEPLOY.md` documenta que el host sólo tiene podman: puede que no se esté generando ningún respaldo. **Arreglar el script no sirve de nada si el cron nunca lo ejecuta**, así que el diagnóstico es imprescindible — pero es una acción sobre producción, va con plan de riesgo previo, y no la ejecuta un plan de esta fase. Queda como bloqueo declarado en `STATE.md`.
- Adaptar `backup.sh` y `scripts/README.md` de `docker` a `podman`. Depende del resultado del diagnóstico anterior.
- Versionado de objetos y reglas de ciclo de vida como sustituto del respaldo: es de la fase 2, cuando los archivos ya estén en R2.

### Restricciones adicionales del scope de fase

- **Fuera de esta fase:** cualquier cosa que toque R2, el esquema de Prisma más allá de lo que exija OPS-04, o pantallas nuevas.
- **Restricción de esquema:** Prisma no tiene directorio de migraciones. Si OPS-04 necesitara tocar el esquema, sólo se admite lo aditivo, aplicado con `db push`. Esta investigación confirma que **no hace falta ningún cambio de esquema**: `formSnapshot` ya es `Json?` y no se propone ninguna migración.
- **Puertas transversales del milestone**, obligatorias antes de dar el plan por terminado: `pnpm check-types` limpio, `turbo run lint` en 81 advertencias y 0 errores (línea base exacta, medida el 2026-09-01), y `pnpm build` en verde.
- La base de datos local corre en `localhost:5435` (contenedor `prol-db`), sembrada. El seed local no crea evidencias de matriz de riesgos: para verificar OPS-04 hay que generar una a mano por la interfaz antes de tocar `formSnapshot`, y confirmar que se sigue viendo después.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descripción | Soporte de la investigación |
|----|-------------|-----------------------------|
| OPS-01 | El respaldo diario incluye el volumen de evidencias | `scripts/backup.sh` transcrito completo; variable `PRIVATE_VOLUME` y nombre físico real (`prol_prol_private`) determinados; retención y rclone a replicar identificados con líneas exactas |
| OPS-02 | `docker-compose.prod.yml` declara el volumen privado que producción ya monta | Bloques de servicio (64-66) y de volúmenes (98-100) transcritos; corregido el malentendido de `CONCERNS.md` sobre el prefijo de nombre de Compose; identificada la falta de `PRIVATE_UPLOAD_DIR` en `environment:` |
| OPS-03 | Incrementar la versión de un documento de empresa toma lock y no puede colisionar | `uploadCompanyDocument` transcrito completo con líneas; patrón `FOR UPDATE` de `evidence.ts` transcrito; nombres reales de tabla confirmados vía `@@map`; ausencia de otros sitios y de riesgo de deadlock verificada por grep |
| OPS-04 | `formSnapshot` se lee con un tipo discriminado y versionado, con rama legacy | Cast ad-hoc de `evidence-detail.tsx` transcrito; único escritor (`risk.ts`) transcrito con la forma exacta del JSON; patrón de referencia (`lesson-blocks.ts`) transcrito completo; riesgo de unión discriminada estricta vs. rama legacy documentado como pitfall |
</phase_requirements>

## Summary

Esta fase no introduce tecnología nueva: aplica un patrón que ya existe cinco veces en el repo (`FOR UPDATE` dentro de `db.$transaction`) a un sexto sitio que lo tiene ausente, escribe una unión discriminada de Zod siguiendo el precedente literal de `lesson-blocks.ts`, y edita dos archivos de infraestructura (`backup.sh`, `docker-compose.prod.yml`) para que coincidan con lo que la producción real ya hace a mano. No hay decisiones de librería que tomar; el trabajo es de precisión textual sobre archivos concretos.

El hallazgo más importante de esta investigación, que **corrige** una entrada de `CONCERNS.md`: el nombre de volumen `prol_uploads` en `docker-compose.prod.yml` NO es una inconsistencia con `prol_prol_uploads` en `backup.sh` — es el comportamiento normal de Docker Compose, que antepone el nombre del proyecto (`prol`) a cada clave de volumen no declarada `external`. `DEPLOY.md` línea 274 lo confirma para la red (`prol-internal` → `prol_prol-internal` en producción). Esto significa que el volumen privado nuevo debe declararse con la clave `prol_private` (no `prol_prol_private`), para que al prefijarse coincida con el volumen `prol_prol_private` que `DEPLOY.md` §7b ya crea a mano en el host.

Segundo hallazgo relevante: **producción no ejecuta `docker compose` en absoluto.** Desde el commit `a41c902` corre podman con quadlets systemd (`/etc/containers/systemd/prol-{web,db}-1.container`), sin `git`, sin `docker`. `docker-compose.prod.yml` es documentación ejecutable para reconstruir desde cero, no el mecanismo real de despliegue — exactamente como ya lo describe `01-CONTEXT.md`. Esto no cambia el trabajo de OPS-02, pero explica por qué el compose puede desincronizarse sin que nada falle visiblemente.

**Primary recommendation:** ejecutar las cuatro correcciones como ediciones quirúrgicas y verificadas línea por línea contra el código citado abajo; no reinterpretar el schema ni tocar Prisma.

## Standard Stack

No aplica librerías nuevas. Todo lo necesario ya es dependencia existente:

| Herramienta | Ya presente | Dónde |
|---|---|---|
| Zod ^3.24.0 | Sí | `packages/shared/package.json` (dependencia directa) |
| Prisma `$queryRaw` / `$transaction` | Sí | patrón repetido en `evidence.ts`, `enrollment.ts`, `evaluation.ts`, `workshop.ts`, `quiz.ts` |
| `@prol/shared` como barrel | Sí | `apps/web` ya importa de él en `video.ts`, `lesson-blocks.ts`, `course.ts`, `video-player.tsx` |

No hay alternativas que considerar ni instalación (`pnpm install`) que ejecutar.

## Architecture Patterns

### Patrón 1: Bloqueo de fila antes de incrementar versión

**Qué:** `SELECT 1 FROM <tabla> WHERE id = ${id} FOR UPDATE` dentro de `db.$transaction`, sobre la fila "padre" que **siempre existe**, no sobre el registro cuya próxima versión se está calculando (ese puede tener cero filas).

**Ejemplo vivo completo** (`apps/web/lib/actions/evidence.ts`, líneas 146-176, dentro de `submitEvidence`):
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
      kind,
      status: "PENDING",
      // ...resto de campos
    },
    select: { id: true },
  });
});
```
Nótese la elección del padre: se bloquea `compliance_activities` (siempre existe, 1 fila por actividad), no `evidence` (podría no tener ninguna fila todavía). Es exactamente el mismo problema que tiene `uploadCompanyDocument`.

**Otros usos del mismo patrón** (confirmados por grep, todos bloquean la tabla padre que siempre existe):
- `apps/web/lib/actions/enrollment.ts:317` — `SELECT 1 FROM enrollments ... FOR UPDATE`
- `apps/web/lib/actions/evaluation.ts:767` — `SELECT 1 FROM evaluation_participants ... FOR UPDATE`
- `apps/web/lib/actions/workshop.ts:438` — `SELECT 1 FROM workshops ... FOR UPDATE`
- `apps/web/lib/actions/quiz.ts:409` — `SELECT 1 FROM enrollments ... FOR UPDATE`

### El sitio que falta el patrón: `uploadCompanyDocument`

**Archivo:** `apps/web/lib/actions/manual.ts`, función completa en líneas 859-906. El bloque problemático es líneas 880-900:

```typescript
860	export async function uploadCompanyDocument(input: {
861	  assignmentId: string;
862	  documentId: string;
863	  file: { fileKey: string; fileName: string; fileSize: number; mimeType: string };
864	  codeOverride?: string;
865	  notes?: string;
866	}) {
867	  const { user, assignment } = await requireAssignmentManageAccess(input.assignmentId);
868	
869	  const doc = await db.manualDocument.findUnique({
870	    where: { id: input.documentId },
871	    select: { manualId: true },
872	  });
873	  if (!doc || doc.manualId !== assignment.manualId) {
874	    return {
875	      success: false as const,
876	      error: "El documento no pertenece a este manual",
877	    };
878	  }
879	
880	  const last = await db.companyDocument.findFirst({
881	    where: { documentId: input.documentId, companyId: assignment.companyId },
882	    orderBy: { version: "desc" },
883	    select: { version: true },
884	  });
885	
886	  // Append-only: la versión anterior se conserva y la vigente es la mayor.
887	  await db.companyDocument.create({
888	    data: {
889	      documentId: input.documentId,
890	      companyId: assignment.companyId,
891	      version: (last?.version ?? 0) + 1,
892	      codeOverride: optionalText(input.codeOverride, 60),
893	      fileKey: input.file.fileKey,
894	      fileName: input.file.fileName,
895	      fileSize: input.file.fileSize,
896	      mimeType: input.file.mimeType,
897	      notes: optionalText(input.notes, 500),
898	      uploadedById: user.id,
899	    },
900	  });
901	
902	  revalidatePath(`/tenant-admin/projects/${assignment.id}`);
903	  revalidatePath(`/professor/projects/${assignment.id}`);
904	  revalidatePath(`/dashboard/manuals/${assignment.id}`);
905	  return { success: true as const };
906	}
907	```

Ninguna transacción envuelve las líneas 880-900: son dos llamadas Prisma independientes, cada una en su propia transacción implícita. Dos peticiones concurrentes pueden leer el mismo `last.version` y ambas intentar crear `version: N+1`, violando `@@unique([documentId, companyId, version])` (ver más abajo).

### Nombres reales de tabla (necesarios para el `$queryRaw`)

Verificado en `packages/db/prisma/schema.prisma`:

| Modelo Prisma | `@@map` (nombre real en Postgres) | Línea |
|---|---|---|
| `ManualDocument` | `manual_documents` | 2519 |
| `CompanyDocument` | `company_documents` | 2684 |
| `ComplianceActivity` | `compliance_activities` | 2730 (confirmado también por el uso ya existente en `evidence.ts:148`) |

La restricción única que hoy puede violarse:
```
// packages/db/prisma/schema.prisma, modelo CompanyDocument, línea 2681
@@unique([documentId, companyId, version])
```

### El bloqueo correcto para OPS-03

Confirmado por lectura del schema: `ManualDocument` (tabla `manual_documents`) es 1:N respecto a `CompanyDocument` vía `documentId` (`ManualDocument.id` es la FK referenciada), y **siempre existe** una fila para cualquier `documentId` válido (se creó en `createManualDocument`, antes de que exista ninguna `CompanyDocument`). Es el padre correcto para serializar "siguiente versión de este documento para cualquier empresa", tal como ya fija `01-CONTEXT.md`. `CompanyDocument` (el par documento+empresa) es el candidato incorrecto porque en la primera subida para una empresa no hay ninguna fila que bloquear.

Patrón a escribir (siguiendo el estilo exacto de `evidence.ts`):
```typescript
const created = await db.$transaction(async (tx) => {
  // Serializa la siguiente versión de este documento para cualquier empresa.
  await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${input.documentId} FOR UPDATE`;
  const last = await tx.companyDocument.findFirst({
    where: { documentId: input.documentId, companyId: assignment.companyId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return tx.companyDocument.create({
    data: {
      documentId: input.documentId,
      companyId: assignment.companyId,
      version: (last?.version ?? 0) + 1,
      codeOverride: optionalText(input.codeOverride, 60),
      fileKey: input.file.fileKey,
      fileName: input.file.fileName,
      fileSize: input.file.fileSize,
      mimeType: input.file.mimeType,
      notes: optionalText(input.notes, 500),
      uploadedById: user.id,
    },
    select: { id: true },
  });
});
```
El chequeo previo (líneas 869-878, que verifica que `doc.manualId === assignment.manualId`) debe quedarse **fuera** de la transacción tal como está — es una validación de pertenencia, no parte de la carrera.

### ¿Hay otros sitios que incrementen `CompanyDocument.version` sin lock?

Verificado con grep exhaustivo sobre `companyDocument` en todo `apps/web`: los únicos usos son lectura (`findMany`, `count`, `findUnique` en `queries/manual.ts`, `manual-documents.tsx`, `files/company-document/[id]/route.ts`) y el único punto de escritura/creación es `uploadCompanyDocument` en `manual.ts:887`. **No hay otro sitio que incremente esta versión.** El fix es puntual a esa función.

### ¿Riesgo de deadlock con otra transacción que bloquee `manual_documents` en otro orden?

Verificado: `manual.ts` no envuelve ninguna otra operación sobre `manualDocument` en `db.$transaction` (líneas 488, 496, 527, 535, 543, 566, 593, 869 son todas llamadas Prisma sueltas, sin transacción explícita). `deleteManualDocument` (línea 564+) cuenta `companyDocument` antes de intentar borrar pero **bloquea la operación si `personalized > 0`** en vez de encadenar un lock — tampoco hay contención de orden inverso ahí. **No se encontró ningún flujo que bloquee `company_documents` primero y luego `manual_documents`** dentro de la misma transacción, así que no hay riesgo de deadlock cruzado; en el peor caso, una `UPDATE` suelta sobre `manual_documents` (p. ej. `updateManualDocument`) espera brevemente el lock de fila mientras dura la transacción de `uploadCompanyDocument`, pero se libera al hacer commit — es contención, no deadlock.

### Patrón 2: Unión discriminada de Zod con degradación (`safeParse`)

**Referencia exacta:** `packages/shared/src/lesson-blocks.ts` (archivo completo leído):

```typescript
export const videoBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  // ...
});
// ...otros 3 schemas con su propio z.literal(type)...

export const lessonBlockSchema = z.discriminatedUnion("type", [
  videoBlockSchema,
  pdfBlockSchema,
  textBlockSchema,
  quizBlockSchema,
]);

export const multiLessonContentSchema = z.object({
  blocks: z.array(lessonBlockSchema).max(20),
});

export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type MultiLessonContent = z.infer<typeof multiLessonContentSchema>;
```

**Escritura:** en `apps/web/lib/actions/lesson-blocks.ts` no se ve en este research un `.parse()` explícito citado con línea, pero el módulo importa `multiLessonContentSchema` para validar antes de guardar (según `CONVENTIONS.md`, `.parse()` lanza si falla).

**Lectura con degradación** (`apps/web/lib/actions/lesson-blocks.ts`, líneas 34-37, función completa):
```typescript
function readContent(content: unknown): MultiLessonContent {
  const parsed = multiLessonContentSchema.safeParse(content);
  return parsed.success ? parsed.data : { blocks: [] };
}
```

**Exportación** (`packages/shared/src/index.ts`, archivo completo):
```typescript
// @prol/shared - Types, Zod schemas, constants
export * from "./constants";
export * from "./types";
export * from "./schemas";
export * from "./video";
export * from "./lesson-blocks";
```
El nuevo archivo `evidence-snapshot.ts` necesita su propia línea `export * from "./evidence-snapshot";` aquí.

**Import en consumidor** (patrón real usado en 4 archivos distintos de `apps/web`, p. ej. `apps/web/lib/actions/lesson-blocks.ts:8-14`):
```typescript
import {
  multiLessonContentSchema,
  lessonBlockSchema,
  type LessonBlock,
  type MultiLessonContent,
} from "@prol/shared";
```
El barrel (`@prol/shared`, no `@prol/shared/evidence-snapshot`) es la forma que ya usa todo el repo.

### El cast a corregir: `evidence-detail.tsx`

**Archivo:** `apps/web/components/evidence-detail.tsx` — componente de servidor (sin `"use client"`), líneas 72-75 exactas:

```typescript
72	  const snapshot = evidence.formSnapshot as
73	    | { items?: RiskSnapshotItem[]; config?: unknown; periodLabel?: string | null }
74	    | null;
75	  const riskConfig = parseRiskConfig(snapshot?.config);
```

Con `RiskSnapshotItem` definido en el mismo archivo, líneas 35-44:
```typescript
interface RiskSnapshotItem {
  type: "RISK" | "OPPORTUNITY";
  description: string;
  probability: number;
  impact: number;
  score: number;
  level: string | null;
  actions: string | null;
  responsible: string | null;
}
```

`snapshot.items` se consume en el `.map()` de la tabla (líneas 166-222) y `snapshot?.config` alimenta `parseRiskConfig()` de `@/lib/compliance` para calcular `riskLevel()`.

### Todos los sitios que tocan `formSnapshot` (grep exhaustivo, excluyendo `.next/`)

| Archivo | Línea | Rol |
|---|---|---|
| `apps/web/lib/queries/evidence.ts` | 110 | `select: { formSnapshot: true }` dentro de `getEvidenceDetail` — pass-through sin transformar, tipa como `Prisma.JsonValue` |
| `apps/web/lib/actions/risk.ts` | 225-245 | **Único escritor.** `db.evidence.update({ data: { formSnapshot: {...} } })` |
| `apps/web/components/evidence-detail.tsx` | 72-75 | **Único lector/consumidor con cast.** |

No hay más lectores ni escritores. El punto de consumo a corregir es uno solo.

### Forma real del JSON guardado hoy (sin discriminador)

Transcrito de `apps/web/lib/actions/risk.ts`, líneas 225-245 (dentro del flujo de envío de matriz de riesgos, tras `submitEvidence`):

```typescript
await db.evidence.update({
  where: { id: result.evidenceId! },
  data: {
    formSnapshot: {
      title: full.title,
      periodLabel: full.periodLabel,
      config: full.config,
      submittedAt: submittedAt.toISOString(),
      items: full.items.map((i) => ({
        type: i.type,
        description: i.description,
        probability: i.probability,
        impact: i.impact,
        score: i.score,
        level: i.level,
        actions: i.actions,
        responsible: i.responsible,
      })),
    },
  },
});
```

Donde:
- `full.title: string`, `full.periodLabel: string | null` — copiados de `RiskAssessment`.
- `full.config: unknown` (Json?) — copiado tal cual de `RiskAssessment.config`; su forma real, cuando presente, es `RiskMatrixConfig` (`apps/web/lib/compliance.ts` líneas 155-166):
  ```typescript
  export interface RiskMatrixConfig {
    scaleMax: number;
    probabilityLabels: string[];
    impactLabels: string[];
    levels: Array<{ min: number; label: string; className: string }>;
  }
  ```
  `parseRiskConfig()` (líneas 189-214 del mismo archivo) ya hace un saneo defensivo campo a campo si `config` no encaja — es el precedente de "degradar sin romper" que la rama legacy de Zod debe imitar para este subcampo si se valida también, o puede seguir tratándose como `unknown`/`z.record` y delegar en `parseRiskConfig` como hoy.
- `full.items[].type: "RISK" | "OPPORTUNITY"` (enum Prisma `RiskItemType`, `packages/db/prisma/schema.prisma` línea 441-444).
- `full.items[].probability`, `.impact`, `.score`: `Int` en el modelo `RiskItem`.
- `full.items[].level: string | null` — etiqueta congelada en el momento de capturar, no recalculada.
- `full.items[].actions`, `.responsible`: `string | null`.

**Discriminador que hoy NO existe:** ni `snapshotVersion` ni `kind` están presentes en este objeto. Cualquier fila de `Evidence.formSnapshot` grabada hasta hoy (incluida cualquier fila de prueba creada durante esta fase antes del cambio) tendrá exactamente esta forma, sin marca de versión.

### Kind de evidencia relevante

`EvidenceRequirementKind` (`packages/db/prisma/schema.prisma` línea 386-390): `FILE | RISK_MATRIX | EVALUATION_LINK`. Sólo `RISK_MATRIX` escribe `formSnapshot` (verificado: `risk.ts` es el único escritor y sólo se invoca desde el flujo de matriz de riesgos). `FILE` y `EVALUATION_LINK` dejan `formSnapshot` en `null`. La unión discriminada por `kind` sólo necesita una rama "real" (`RISK_MATRIX`) más la rama legacy; no hace falta modelar variantes para `FILE`/`EVALUATION_LINK` porque nunca tienen snapshot.

### Diseño sugerido para `evidence-snapshot.ts` (a discreción del planner en nombres exactos)

```typescript
import { z } from "zod";

const riskSnapshotItemSchema = z.object({
  type: z.enum(["RISK", "OPPORTUNITY"]),
  description: z.string(),
  probability: z.number(),
  impact: z.number(),
  score: z.number(),
  level: z.string().nullable(),
  actions: z.string().nullable(),
  responsible: z.string().nullable(),
});

// Forma real emitida hoy por risk.ts, sin discriminador.
const riskSnapshotLegacySchema = z.object({
  title: z.string().optional(),
  periodLabel: z.string().nullable().optional(),
  config: z.unknown().optional(),
  submittedAt: z.string().optional(),
  items: z.array(riskSnapshotItemSchema).optional(),
});

const riskSnapshotV1Schema = riskSnapshotLegacySchema.extend({
  snapshotVersion: z.literal(1),
  kind: z.literal("RISK_MATRIX"),
});

export const evidenceSnapshotSchema = z.union([
  riskSnapshotV1Schema,
  riskSnapshotLegacySchema, // sin discriminador: reconoce las filas actuales por forma
]);

export type EvidenceSnapshot = z.infer<typeof evidenceSnapshotSchema>;
```
Nota: `z.discriminatedUnion` exige que TODAS las ramas compartan la clave discriminadora; como la rama legacy no tiene `snapshotVersion`, no puede ser una unión discriminada real en el sentido estricto de Zod — debe ser `z.union` con la rama legacy al final (Zod prueba en orden) o `z.union` con `.safeParse` intentando primero la v1. Esto es exactamente la trampa que señala `01-CONTEXT.md`: "Añadir una segunda forma sin discriminador es justo lo que convertiría el cast actual en un render silenciosamente incorrecto" — cualquier campo nuevo en v1 que coincida por casualidad con la forma legacy debe evitarse, o el orden de intento en el `z.union`/lógica manual debe probar v1 primero explícitamente.

**Lectura en el componente**, siguiendo el patrón de `readContent` de `lesson-blocks.ts`:
```typescript
const parsed = evidenceSnapshotSchema.safeParse(evidence.formSnapshot);
const snapshot = parsed.success ? parsed.data : null;
```

### Riesgo verificado: ¿algún consumidor se rompe con la validación?

No. Hay un solo lector (`evidence-detail.tsx`) y ya maneja `snapshot?.items?.length` y `snapshot?.config` con optional chaining — degradar a `null` en vez de lanzar no cambia su comportamiento observable para filas que no encajen. El riesgo real es el inverso: que la rama legacy sea *demasiado* laxa y "trague" también una v1 mal formada, ocultando un bug. Mitigación: probar siempre `riskSnapshotV1Schema.safeParse` antes que la legacy, o exigir que la legacy rechace explícitamente objetos que traigan `snapshotVersion`.

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por qué |
|---|---|---|---|
| Serializar incremento de versión concurrente | Un mutex manual en memoria, un campo `isLocked` en la fila, retry con backoff | `SELECT ... FOR UPDATE` dentro de `db.$transaction` (patrón ya usado 4 veces en el repo) | Postgres ya resuelve esto correctamente; cualquier alternativa en aplicación introduce ventanas de carrera nuevas |
| Validar JSON de forma incierta | Interfaces TypeScript con cast (`as`) sin runtime check | Zod `safeParse` con degradación (patrón `lesson-blocks.ts`) | Un cast de TypeScript no protege en runtime; es literalmente el bug que se está corrigiendo |
| Cargar un upload como data-URL para PDF | Reimplementar el parseo de ruta y MIME en cada ruta que genera un PDF (ya pasó 2 veces) | `loadUploadAsDataUrl` de `apps/web/lib/certificate-assets.ts` | Tercera copia = tercera oportunidad de que un bug de path traversal diverja entre implementaciones |

**Key insight:** todo el trabajo de esta fase consiste en reemplazar soluciones caseras (ausencia de lock, cast sin validar, función duplicada) por patrones que el propio repo ya usa en otros cinco a diez lugares. No hay nada que investigar en el ecosistema externo.

## Common Pitfalls

### Pitfall 1: Bloquear la tabla equivocada en OPS-03
**Qué sale mal:** bloquear `company_documents` (el par documento+empresa) en vez de `manual_documents`.
**Por qué pasa:** parece el "padre natural" del recurso que se está versionando.
**Cómo evitarlo:** `SELECT ... FOR UPDATE` sobre una consulta que devuelve cero filas no bloquea nada — la primera subida de un documento para una empresa nueva no tiene ninguna fila `company_documents` que bloquear, así que dos primeras-subidas concurrentes seguirían compitiendo sin protección.
**Señal de alerta:** si el test de concurrencia (dos subidas simultáneas a un documento sin personalizar previamente) sigue fallando con violación de `@@unique`, el lock está sobre la tabla equivocada.

### Pitfall 2: Unión discriminada estricta que rompe con filas legacy
**Qué sale mal:** usar `z.discriminatedUnion("kind", [...])` exigiendo el campo en todas las ramas, y que las filas antiguas (sin `kind` ni `snapshotVersion`) fallen el parse entero.
**Por qué pasa:** `z.discriminatedUnion` de Zod requiere que la clave discriminadora exista y sea literal en cada rama; una rama "legacy sin discriminador" no encaja en esa API.
**Cómo evitarlo:** usar `z.union` (no `z.discriminatedUnion`) probando explícitamente la rama v1 primero, o resolver el discriminador manualmente antes de elegir el schema.
**Señal de alerta:** el criterio 4 de la fase (ver una evidencia de matriz de riesgos ya existente después del cambio) es exactamente la prueba que expone este error — por eso `01-CONTEXT.md` exige crear una evidencia real antes de tocar el código y volver a verla después.

### Pitfall 3: Compose "corregido" que en realidad rompe la convención de nombres de producción
**Qué sale mal:** nombrar la clave del volumen nuevo `prol_prol_private` en vez de `prol_private`, "para que coincida" textualmente con el nombre que ve `podman volume ls` en producción.
**Por qué pasa:** el nombre físico en producción es `prol_prol_private`, así que parece lo correcto copiarlo literal.
**Cómo evitarlo:** Docker Compose antepone el nombre del proyecto (`prol`) a cada clave de volumen no marcada `external`. Con clave `prol_private`, Compose generaría `prol_prol_private` — el nombre correcto. Con clave `prol_prol_private`, generaría `prol_prol_prol_private` — que NO coincide con nada real. La clave existente `prol_uploads` (línea 100) ya sigue esta convención y por eso resuelve a `prol_prol_uploads`, el default real de `backup.sh`.
**Señal de alerta:** contrastar contra `DEPLOY.md` línea 274, que documenta la misma duplicación para la red (`prol-internal` → `prol_prol-internal`).

### Pitfall 4: Declarar el volumen sin la variable de entorno que lo activa
**Qué sale mal:** añadir el volumen y el mount al servicio `web`, pero no `PRIVATE_UPLOAD_DIR` al bloque `environment:`.
**Por qué pasa:** el `docker-compose.prod.yml` actual no tiene `PRIVATE_UPLOAD_DIR` en ningún lugar (confirmado leyendo el archivo completo).
**Cómo evitarlo:** sin esa variable, `resolvePrivateUploadDir()` (`apps/web/lib/upload-paths.ts` líneas 61-76) cae a `<cwd>/private-uploads`, que en el contenedor no es el punto de montaje del volumen (`/app/private-uploads`) — el volumen quedaría declarado pero sin usar, y los archivos seguirían sin persistir.
**Señal de alerta:** si un `docker compose up` limpio (hipotético, para probar) pierde archivos privados al recrear el contenedor, falta esta variable.

### Pitfall 5: "Arreglar" `backup.sh` de `docker` a `podman`
**Qué sale mal:** aprovechar el cambio para cambiar `docker exec`/`docker run` por `podman` ya que se está tocando el archivo.
**Por qué pasa:** `CONCERNS.md` documenta que producción sólo tiene podman y que el script probablemente nunca corre.
**Cómo evitarlo:** `01-CONTEXT.md` lo marca explícitamente como **diferido**: el diagnóstico por SSH de si el cron corre siquiera es una acción sobre producción que necesita su propio plan de riesgo, fuera de esta fase. El bloque nuevo del volumen privado debe escribirse con la **misma** invocación `docker` que ya usa el bloque de uploads, para no mezclar dos problemas en un mismo cambio.
**Señal de alerta:** si el diff de `backup.sh` toca las líneas 44 o 55 (los `docker exec`/`docker run` existentes), se salió del alcance de la fase.

## Code Examples

### Bloque de volúmenes actual del servicio `web` (a extender)
`docker-compose.prod.yml`, líneas 64-66:
```yaml
64	    volumes:
65	      # Persist uploaded files (PDFs, thumbnails, avatars) across rebuilds
66	      - prol_uploads:/app/apps/web/public/uploads
```
Añadir una segunda línea análoga:
```yaml
      - prol_private:/app/private-uploads
```
(mount target confirmado por `DEPLOY.md` línea 220: `Volume=prol_prol_private:/app/private-uploads:Z`, y por `PRIVATE_UPLOAD_DIR=/app/private-uploads` en línea 223).

### Bloque `volumes:` de nivel superior actual (a extender)
`docker-compose.prod.yml`, líneas 98-100:
```yaml
98	volumes:
99	  prol_db_data:
100	  prol_uploads:
```
Añadir:
```yaml
  prol_private:
```

### Variable de entorno que falta (bloque `environment:` del servicio `web`)
No existe hoy ninguna línea `PRIVATE_UPLOAD_DIR` en `docker-compose.prod.yml`. Añadir junto a las demás rutas/URLs del bloque `environment:` (líneas 32-63):
```yaml
      PRIVATE_UPLOAD_DIR: ${PRIVATE_UPLOAD_DIR:-/app/private-uploads}
```

### `backup.sh` — bloque de uploads actual (líneas 52-61, patrón a duplicar/parametrizar)
```bash
52	# ── 2. Uploads tarball (skip if volume is empty) ────────────────────────────
53	uploads_file="$BACKUP_DIR/uploads/uploads_${date_ymd}.tar.gz"
54	log "Uploads tarball → $uploads_file"
55	docker run --rm \
56	  -v "$UPLOADS_VOLUME":/data:ro \
57	  -v "$BACKUP_DIR/uploads":/out \
58	  alpine:3.20 \
59	  sh -c "cd /data && tar czf /out/$(basename "$uploads_file").tmp . && mv /out/$(basename "$uploads_file").tmp /out/$(basename "$uploads_file")"
60	uploads_size="$(du -h "$uploads_file" | cut -f1)"
61	log "Uploads tarball OK ($uploads_size)"
```
Variable a añadir junto a `UPLOADS_VOLUME` (línea 27):
```bash
PRIVATE_VOLUME="${PRIVATE_VOLUME:-prol_prol_private}"
```
(el default `prol_prol_private` es el nombre físico real documentado en `DEPLOY.md` línea 218: `podman volume create prol_prol_private`).

Bloque nuevo, mismo estilo, mismo directorio de salida bajo `$BACKUP_DIR` (crear `mkdir -p "$BACKUP_DIR/private"` junto a la línea 37 existente), mismo patrón de nombre `private_${date_ymd}.tar.gz`, y sumado a la sección de retención (líneas 74-80) con el mismo `RETAIN_UPLOADS_WEEKS`. La rclone sync (líneas 63-72) también debe replicarse para el nuevo tarball si se sigue el mismo nivel de paridad (ver Open Questions).

### `certificate-assets.ts` — la función que sustituye al helper en línea
`apps/web/lib/certificate-assets.ts`, líneas 11-37 (función completa, ya existente, no requiere cambios):
```typescript
export async function loadUploadAsDataUrl(
  url: string | null | undefined
): Promise<string | null> {
  if (!url || !url.startsWith("/uploads/")) return null;
  const parts = url.replace(/^\/uploads\//, "").split("/");
  if (parts.length < 2) return null;
  const [subdir, ...rest] = parts;
  const filename = rest.join("/");
  if (!subdir || !filename || filename.includes("..")) return null;
  const dir = resolveUploadDir(subdir);
  const filePath = join(dir, filename);
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    null;
  if (!mime) return null;
  try {
    const buf = await readFile(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
```
Ya está en uso en 3 rutas: `apps/web/app/api/dc3/[id]/pdf/route.tsx:55-56`, `apps/web/app/api/certificates/preview/route.tsx:122-123`, `apps/web/app/api/certificates/[id]/pdf/route.tsx:66-67,70-71`.

### El helper duplicado a eliminar
`apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx`, líneas 25-52 (función completa) y su único call site (línea 1223: `const logoDataUrl = await loadAsDataUrl(tenant.logo);`).

**Diferencia real entre las dos funciones:** el helper de la ruta tiene una línea extra —
```typescript
28	  if (url.startsWith("data:")) return url;
```
— que `loadUploadAsDataUrl` no tiene. Esta rama es **código muerto** en este call site: `tenant.logo` se valida al escribirse (`apps/web/lib/actions/tenant.ts` líneas 31-37) para que **siempre** empiece con `/uploads/`:
```typescript
31	if (data.logo !== undefined && data.logo !== null) {
32	  // Only accept logos uploaded through our own /api/upload pipeline.
...
35	  if (!data.logo.startsWith("/uploads/")) {
...
37	    "El logotipo debe subirse desde el panel (no se permiten URLs externas)",
```
Por tanto `tenant.logo` nunca puede ser una `data:` URL en runtime, y sustituir `loadAsDataUrl` por `loadUploadAsDataUrl` es un cambio de comportamiento cero para este call site.

**Imports que quedan huérfanos** al borrar el helper en línea (verificado por grep: ningún otro uso en el archivo de 1265 líneas):
```typescript
import { readFile } from "node:fs/promises";   // sólo usado en la línea 47, dentro de loadAsDataUrl
import { join } from "node:path";               // sólo usado en líneas 31, 37, dentro de loadAsDataUrl
import { resolveUploadDir } from "@/lib/upload-paths"; // sólo usado en línea 36, dentro de loadAsDataUrl
```
Reemplazar con:
```typescript
import { loadUploadAsDataUrl } from "@/lib/certificate-assets";
```
y `loadAsDataUrl(tenant.logo)` → `loadUploadAsDataUrl(tenant.logo)` en la línea 1223.

## State of the Art

No aplica — no hay versión de librería que haya cambiado ni deprecación externa. El único "antes/después" es interno al repo:

| Antes | Después | Por qué |
|---|---|---|
| `uploadCompanyDocument` sin lock | Con `FOR UPDATE` sobre `manual_documents` dentro de `db.$transaction` | Alinea con el patrón ya usado 4 veces en el repo |
| Cast `as { items?, config?, ... }` sin runtime check | `evidenceSnapshotSchema.safeParse()` con rama legacy | Alinea con el patrón ya usado en `lesson-blocks.ts` |
| `backup.sh` cubre 1 volumen | Cubre 2 volúmenes con retención idéntica | Cierra el agujero de datos de mayor severidad del milestone |
| `docker-compose.prod.yml` sin el volumen privado | Con `prol_private` declarado y montado | Documentación ejecutable coherente con producción |

## Open Questions

1. **¿El bloque de rclone off-site debe replicarse para el volumen privado?**
   - Lo que sabemos: `backup.sh` líneas 63-72 empujan `db_file` y `uploads_file` a `$RCLONE_REMOTE` si está configurado. `01-CONTEXT.md` sólo exige "un segundo tarball con la misma política de retención", sin mencionar rclone explícitamente.
   - Lo que no está claro: si "misma política" incluye el off-site sync o sólo la retención local.
   - Recomendación: replicarlo también — dejarlo fuera crearía una asimetría donde el volumen más sensible (evidencias confidenciales) es el único que NO llega al remoto off-site, lo cual sería perverso dado que es "el riesgo de mayor severidad del milestone" según `STATE.md`.

2. **¿Se debe añadir una guarda "abort si `mkdir -p` para `$BACKUP_DIR/private` falla" o basta reusar la línea 37 existente?**
   - Lo que sabemos: línea 37 ya hace `mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads"`.
   - Lo que no está claro: si conviene añadir `$BACKUP_DIR/private` a esa misma línea o crear una nueva.
   - Recomendación: extender la misma línea 37 (mismo estilo, sin bifurcar el manejo de errores) — es la opción de menor diff y `set -euo pipefail` (línea 22) ya aborta el script ante cualquier fallo de `mkdir`.

## Validation Architecture

> Omitido — `workflow.nyquist_validation` es `false` en `.planning/config.json`.

## Sources

### Primary (HIGH confidence — leído directamente del repo en esta sesión)
- `apps/web/lib/actions/manual.ts` (líneas 480-906) — función completa `uploadCompanyDocument` y funciones vecinas de `ManualDocument`
- `apps/web/lib/actions/evidence.ts` (líneas 100-220) — `submitEvidence`, patrón `FOR UPDATE`
- `apps/web/components/evidence-detail.tsx` (archivo completo, 304 líneas)
- `apps/web/lib/actions/risk.ts` (líneas 180-249) — escritor único de `formSnapshot`
- `apps/web/lib/queries/evidence.ts` (líneas 60-190) — `getEvidenceDetail`, único `select` de `formSnapshot`
- `apps/web/lib/compliance.ts` (líneas 153-238) — `RiskMatrixConfig`, `parseRiskConfig`, `riskLevel`, `RISK_ITEM_TYPE_LABEL`
- `packages/shared/src/lesson-blocks.ts` (archivo completo, 90 líneas) — patrón de unión discriminada de referencia
- `packages/shared/src/index.ts` (archivo completo, 6 líneas) — barrel de exportación
- `packages/db/prisma/schema.prisma` — modelos `ManualDocument` (2492-2520), `CompanyDocument` (2656-2685), `ComplianceActivity` (2694-2730), `Evidence` (2740+), `RiskAssessment` (2833-2873), `RiskItem` (2877+), enums `EvidenceRequirementKind` (386-390), `RiskItemType` (441-444)
- `scripts/backup.sh` (archivo completo, 83 líneas)
- `scripts/README.md` (archivo completo, 63 líneas)
- `docker-compose.prod.yml` (archivo completo, 107 líneas)
- `DEPLOY.md` (líneas 1-60, 195-260, 260-289) — arquitectura de producción, §7b, orquestación real verificada
- `apps/web/lib/upload-paths.ts` (archivo completo, 77 líneas) — `resolveUploadDir`, `resolvePrivateUploadDir`
- `apps/web/lib/certificate-assets.ts` (archivo completo, 56 líneas)
- `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` (archivo completo, 1265 líneas) — helper duplicado y su único call site
- `apps/web/lib/actions/tenant.ts` (líneas 10-37) — validación de escritura de `tenant.logo`
- `apps/web/lib/actions/lesson-blocks.ts` (líneas 1-45) — `readContent`, patrón de degradación
- `packages/shared/package.json` — confirma `zod ^3.24.0` ya como dependencia
- `.planning/config.json` — confirma `nyquist_validation: false`
- Grep exhaustivo sobre `companyDocument`, `formSnapshot`, `loadUploadAsDataUrl`/`loadAsDataUrl`, `FOR UPDATE`, `manualDocument.` en todo `apps/web` (excluyendo `.next/`)

### Secondary (MEDIUM confidence)
- Ninguna — no se usó WebSearch ni Context7 en esta investigación; todo lo relevante estaba verificable en el propio repo.

### Tertiary (LOW confidence)
- Ninguna.

## Metadata

**Confidence breakdown:**
- OPS-03 (lock de fila): HIGH — código, schema y `@@map` verificados línea por línea; ausencia de otros sitios y de riesgo de deadlock confirmada por grep exhaustivo.
- OPS-04 (snapshot tipado): HIGH — único escritor y único lector identificados y transcritos; forma del JSON confirmada desde el código que lo genera, no inferida.
- OPS-01/OPS-02 (backup/compose): HIGH — la corrección sobre el prefijo de nombre de volumen de Compose está verificada contra `DEPLOY.md` (evidencia de la misma duplicación en el nombre de red), no es una suposición.
- Deduplicación data-URL: HIGH — equivalencia de comportamiento demostrada verificando la validación de escritura de `tenant.logo`, no asumida.

**Research date:** 2026-09-01
**Valid until:** el contenido de esta fase es una fotografía exacta del código en el commit actual; deja de ser válido en cuanto alguien más edite `manual.ts`, `evidence-detail.tsx`, `backup.sh` o `docker-compose.prod.yml` antes de que el plan se ejecute. No hay componente "externo" que caduque por versión de librería.
