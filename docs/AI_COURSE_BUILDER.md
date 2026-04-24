# AI Course Builder — Planeación

Módulo de generación asistida de cursos con IA. Flujo de 4 pasos que guía al profesor desde un briefing mínimo hasta un esqueleto de curso editable, con regeneración granular por módulo o lección.

---

## 1. Estado actual (lo que ya existe)

- `packages/content-factory/src/pipelines/course-outline.ts`: generador one-shot (tema + audiencia + nivel + conteos → JSON de módulos y lecciones).
- `packages/ai/src/{claude,prompts}.ts`: wrapper de Anthropic SDK con `generateJSON` tipado con Zod.
- `prisma.AIGenerationJob` con `AIJobType.COURSE_OUTLINE`: tracking async de jobs.
- `Tenant.aiEnabled` (Boolean): feature flag para activar IA por tenant.
- `apps/web/app/professor/courses/new/ai-course-form.tsx`: UI actual de paso único.

**Gap**: el flujo actual es one-shot y destructivo. No hay refinamiento, ni edición iterativa, ni control de costos. No hay monetización del valor IA.

---

## 2. El flujo de 4 pasos

```
[1] Briefing    →  [2] Refinamiento  →  [3] Generación   →  [4] Edición
  Tema/Audiencia/   IA infiere params   Outline completo    Regeneración
  Nivel + conteos   y pregunta dudas    con streaming       granular
```

Cada paso persiste en DB vía `CourseDraft` → el profesor puede salir y volver sin perder trabajo. La transición 3→4 es la que crea el `Course` real en la DB (con sus `Module` y `Lesson`).

### Paso 1 — Briefing
3 campos mínimos (tema, audiencia, nivel) + conteos sugeridos de módulos/lecciones. Sin IA.

### Paso 2 — Refinamiento
Una llamada ligera al modelo (Haiku, ~500 tokens output) que devuelve:
- **Inferencias** con nivel de confianza: objetivo de transformación, duración total sugerida, tono, ratio práctico/teórico, evaluación, conocimientos previos asumidos.
- **Preguntas críticas** (2–4 máx): las decisiones que más impactan el outline. Tipos: `single_choice`, `multi_choice`, `text`, `slider`.
- **Advertencias**: incoherencias detectadas (ej. "25 lecciones en 8 horas = 19 min/lección, considera reducir").

El profesor ajusta y confirma. Esto ahorra costos: cualquier cambio al outline se hace sobre decisiones ya validadas.

### Paso 3 — Generación
Llamada pesada (Sonnet, streaming) que devuelve el outline completo en JSON estructurado (schema abajo). Streaming SSE módulo por módulo para UX responsiva.

Al aceptar, se crea el `Course` + `Module[]` + `Lesson[]` reales (status `DRAFT`) y el `CourseDraft` queda archivado como versión 1.

### Paso 4 — Edición con IA asistida
Operaciones sobre el `Course` ya creado:
- **Regenerar lección**: mantiene posición, objetivo y duración; cambia contenido según feedback del profesor.
- **Regenerar módulo**: rehace todas las lecciones de un módulo preservando objetivo.
- **Dividir / fusionar lecciones**: redistribuye contenido sin perder datos.
- **Revisar coherencia**: prompt de validación que reporta issues sin reescribir.
- **Edición manual directa**: sin IA, editando campos.

Cada regeneración crea un `CourseDraftVersion` para rollback.

---

## 3. Modelos de base de datos

### 3.1 Nuevos modelos

```prisma
enum CourseDraftStatus {
  BRIEFING        // Paso 1: capturando inputs mínimos
  REFINING        // Paso 2: inferencias generadas, esperando ajuste
  GENERATING      // Paso 3: IA generando outline (streaming en curso)
  READY           // Paso 3 completado, esperando aceptación
  PUBLISHED       // Paso 4: convertido en Course real
  ABANDONED       // Profesor salió sin completar (>30 días)
}

enum DraftOperationType {
  BRIEFING_SUBMITTED
  REFINEMENT_GENERATED
  REFINEMENT_EDITED
  OUTLINE_GENERATED
  OUTLINE_ACCEPTED
  LESSON_REGENERATED
  MODULE_REGENERATED
  LESSON_SPLIT
  LESSONS_MERGED
  COHERENCE_CHECKED
  MANUAL_EDIT
}

/// Borrador de curso generado con IA. Persistente a través de los 4 pasos.
/// Al aceptar (paso 3 → 4), genera un Course real y queda archivado como historial.
model CourseDraft {
  id              String            @id @default(cuid())
  tenantId        String            @map("tenant_id")
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  professorId     String            @map("professor_id")
  professor       User              @relation(fields: [professorId], references: [id], onDelete: Cascade)

  status          CourseDraftStatus @default(BRIEFING)

  // Paso 1: briefing
  topic           String
  audience        String
  level           String            // "beginner" | "intermediate" | "advanced"
  moduleCount     Int               @map("module_count")
  lessonsPerModule Int              @map("lessons_per_module")
  language        String            @default("es")

  // Paso 2: refinamiento (JSON con inferencias + respuestas del profesor)
  // Schema: { inferences: {...}, userAnswers: {...}, warnings: [...] }
  refinement      Json?

  // Paso 3: outline generado (JSON — ver schema abajo)
  outline         Json?
  outlineModel    String?           @map("outline_model")      // "claude-sonnet-4-6"
  outlineTokens   Int?              @map("outline_tokens")     // total tokens consumidos

  // Costo acumulado en centavos USD (para billing interno y cuotas)
  totalCostCents  Int               @default(0) @map("total_cost_cents")

  // Cuando se publica, apunta al Course creado
  publishedCourseId String?         @unique @map("published_course_id")

  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  publishedAt     DateTime?         @map("published_at")

  versions        CourseDraftVersion[]
  operations      CourseDraftOperation[]

  @@index([tenantId])
  @@index([professorId])
  @@index([status])
  @@index([tenantId, status])
  @@map("course_drafts")
}

/// Snapshot inmutable del outline en un momento dado. Permite rollback y diff.
model CourseDraftVersion {
  id          String       @id @default(cuid())
  draftId     String       @map("draft_id")
  draft       CourseDraft  @relation(fields: [draftId], references: [id], onDelete: Cascade)

  version     Int          // 1, 2, 3... autoincrementa por draft
  snapshot    Json         // outline completo en ese momento
  reason      String?      // "initial_generation", "regenerated_lesson_1-3", etc.

  createdAt   DateTime     @default(now()) @map("created_at")

  @@unique([draftId, version])
  @@index([draftId])
  @@map("course_draft_versions")
}

/// Log de operaciones para auditoría, analytics y debugging.
model CourseDraftOperation {
  id          String              @id @default(cuid())
  draftId     String              @map("draft_id")
  draft       CourseDraft         @relation(fields: [draftId], references: [id], onDelete: Cascade)

  type        DraftOperationType
  target      String?             // "module:mod-1" | "lesson:lec-1-2" | null
  input       Json?               // feedback del profesor, parámetros
  output      Json?               // resultado de la operación
  model       String?             // modelo usado ("haiku-4-5", "sonnet-4-6")
  tokensIn    Int?                @map("tokens_in")
  tokensOut   Int?                @map("tokens_out")
  costCents   Int?                @map("cost_cents")
  durationMs  Int?                @map("duration_ms")

  createdAt   DateTime            @default(now()) @map("created_at")

  @@index([draftId])
  @@index([type])
  @@index([createdAt])
  @@map("course_draft_operations")
}

/// Cuota de créditos IA consumibles por tenant. Se consume con cada operación
/// del Course Builder (y potencialmente otros módulos IA).
model AICreditsLedger {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Positivo = recarga; negativo = consumo
  delta       Int
  reason      String   // "plan_monthly", "topup_purchase", "course_outline", "lesson_regenerated", "refund"
  balance     Int      // balance resultante después de este movimiento (para auditoría rápida)

  // Referencias opcionales
  draftId     String?  @map("draft_id")
  operationId String?  @map("operation_id")   // CourseDraftOperation.id
  stripePaymentId String? @map("stripe_payment_id")

  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tenantId])
  @@index([tenantId, createdAt])
  @@map("ai_credits_ledger")
}
```

### 3.2 Modificaciones a modelos existentes

```prisma
model Tenant {
  // ... campos existentes ...

  // IA: ya existe aiEnabled. Añadir:
  aiPlan            String   @default("none") @map("ai_plan")       // "none" | "starter" | "pro" | "unlimited"
  aiCreditsBalance  Int      @default(0)      @map("ai_credits_balance")
  aiMonthlyAllotment Int     @default(0)      @map("ai_monthly_allotment")
  aiAllotmentResetAt DateTime? @map("ai_allotment_reset_at")

  // ... resto ...
  courseDrafts      CourseDraft[]
  aiCreditsLedger   AICreditsLedger[]
}

model User {
  // ... existentes ...
  courseDrafts CourseDraft[]
}

enum AIJobType {
  COURSE_OUTLINE
  VIDEO_TRANSCRIPTION
  LESSON_CONTENT
  COURSE_ENRICHMENT
  DRAFT_REFINEMENT        // nuevo — paso 2
  LESSON_REGENERATION     // nuevo — paso 4
  MODULE_REGENERATION     // nuevo — paso 4
  COHERENCE_CHECK         // nuevo — paso 4
}
```

### 3.3 Schema JSON del outline (persistido en `CourseDraft.outline`)

```typescript
type CourseOutlineV2 = {
  version: 2;
  generatedAt: string;
  titleSuggested: string;
  titleAlternatives: string[];
  shortDescription: string;
  longDescription: string;
  transformationPromise: string;
  learningObjectives: Array<{
    id: string;
    text: string;
    bloom: "recordar" | "comprender" | "aplicar" | "analizar" | "evaluar" | "crear";
  }>;
  prerequisites: string[];
  totalDurationMin: number;
  difficultyProgression: number[]; // uno por módulo, 1–5

  modules: Array<{
    id: string;                // estable: "mod-1"
    number: number;            // reordenable sin cambiar id
    title: string;
    moduleObjective: string;
    durationMin: number;
    prerequisiteOf: string[];  // ids de otros módulos
    coversObjectives: string[]; // ids de learningObjectives

    lessons: Array<{
      id: string;              // estable: "lec-1-1"
      number: number;
      title: string;
      type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "MULTI";
      durationMin: number;
      summary: string;
      keyPoints: string[];     // 3–5 bullets
      deliverable: string | null;
      suggestedResources: string[];
      bloom: string;
    }>;

    evaluation?: {
      type: "quiz" | "assignment" | "none";
      description: string;
      durationMin: number;
    };
  }>;

  finalProject?: {
    title: string;
    description: string;
    evaluationCriteria: string[];
  };

  generationMetadata: {
    model: string;
    inputsUsed: { topic: string; audience: string; level: string; };
    unresolvedWarnings: string[];
  };
};
```

---

## 4. Modelo de negocio

Tres opciones, de menos a más complejas. Recomiendo **B (créditos)** para V1 por la predictibilidad y porque encaja con el ledger ya diseñado.

### Opción A — Feature incluido en plan Pro

IA disponible solo en tenants con plan "Pro" (bandera `aiEnabled = true`). Sin límites estrictos, pero con rate-limit suave por tenant (ej. 20 cursos/mes).

- **Pros**: simple, fomenta upsell a Pro, sin fricción de compra.
- **Contras**: costos variables sin cap — un tenant abusivo puede quemar margen. No monetiza regeneraciones.
- **Precio sugerido**: +$49 USD/mes sobre plan base.

### Opción B — Créditos IA (recomendado)

Cada operación consume créditos. Los créditos vienen de dos fuentes:
1. **Allotment mensual** del plan (se reinicia cada mes, no se acumula).
2. **Top-ups** que compra el tenant (no expiran).

**Consumo por operación** (calibrar con costos reales de Anthropic):

| Operación | Créditos | Modelo | Notas |
|-----------|---------:|--------|-------|
| Refinamiento (paso 2) | 1 | Haiku | Ligero, ~500 tokens out |
| Outline completo (paso 3) | 10 | Sonnet | ~4k–8k tokens out |
| Regenerar lección | 1 | Sonnet | Prompt cacheado |
| Regenerar módulo | 3 | Sonnet | |
| Check de coherencia | 1 | Haiku | Solo reporta issues |
| Dividir/fusionar lección | 1 | Haiku | |

**Planes propuestos** (adicional al plan base del LMS):

| Plan | Precio/mes | Créditos/mes | Top-up |
|------|-----------:|-------------:|-------:|
| Starter AI | $19 USD | 30 | $10 por 30 créditos |
| Pro AI | $49 USD | 100 | $10 por 35 créditos |
| Studio AI | $149 USD | 400 | $10 por 50 créditos |

Un curso típico (1 outline + 3 regeneraciones + 2 coherencia checks) ≈ 15 créditos.

- **Pros**: predecible, escalable, monetiza uso real, el ledger soporta analytics.
- **Contras**: fricción adicional en UX (mostrar balance, advertir cuando bajo). Requiere manejo de Stripe extra.

### Opción C — Revenue share dinámico

Subir el `revenueShareRate` en tenants que usen IA. Ej: 30% → 35% cuando se use IA para crear el curso.

- **Pros**: alinea pago con valor — si el curso no vende, no pagas.
- **Contras**: difícil de comunicar, genera resentimiento, complica contabilidad. Descartaría para V1.

### Recomendación concreta

**V1**: Opción B con 3 planes. Bundleable con el plan LMS base (descuento de 20% si se combinan). Los **créditos se consumen solo al aceptar** (paso 3→4 y paso 4), no al explorar — el paso 2 es gratis para remover fricción de adopción.

**Free tier**: 3 créditos gratis al activar la cuenta → suficiente para generar 1 curso completo y ver el valor.

---

## 5. Arquitectura técnica

### 5.1 Ubicación del código

```
packages/content-factory/src/pipelines/
├── course-outline.ts           # ya existe, se refactoriza
├── course-draft/               # nuevo módulo
│   ├── refinement.ts           # paso 2
│   ├── outline-v2.ts           # paso 3 (streaming)
│   ├── regenerate-lesson.ts    # paso 4
│   ├── regenerate-module.ts    # paso 4
│   ├── coherence-check.ts      # paso 4
│   ├── split-lesson.ts         # paso 4
│   └── merge-lessons.ts        # paso 4

apps/web/app/professor/courses/new/
├── ai-course-form.tsx          # refactor: pasar a multi-paso
├── steps/
│   ├── step-briefing.tsx
│   ├── step-refinement.tsx
│   ├── step-generating.tsx     # con streaming
│   └── step-editing.tsx
└── draft-context.tsx           # React context para el draft activo

apps/web/app/api/ai/course-draft/
├── route.ts                    # POST crear draft, GET listar
├── [id]/
│   ├── route.ts                # GET/PATCH/DELETE draft
│   ├── refine/route.ts         # POST paso 2
│   ├── generate/route.ts       # POST paso 3 (SSE)
│   ├── publish/route.ts        # POST paso 3→4 (crea Course real)
│   ├── lessons/[lessonId]/regenerate/route.ts
│   ├── modules/[moduleId]/regenerate/route.ts
│   └── coherence/route.ts

apps/web/lib/ai-credits.ts      # consumeCredits(), getBalance()
```

### 5.2 Streaming en paso 3

Usar `stream: true` del SDK de Anthropic + SSE en Next.js route handler. El cliente consume con `EventSource` y renderiza módulos conforme llegan. Si el stream se corta, el `CourseDraft` queda en `GENERATING` y el profesor puede reintentar (créditos ya consumidos no se cobran de nuevo por 24h via idempotency key).

### 5.3 Prompt caching

El system prompt + schema + contexto del curso son grandes (~4k tokens) y se reutilizan en paso 4. Usar `cache_control: { type: "ephemeral" }` de Anthropic → 80–90% ahorro en regeneraciones.

### 5.4 Idempotencia y cobro de créditos

```
1. Cliente envía X-Idempotency-Key por operación.
2. Servidor verifica balance ANTES de llamar al modelo.
3. Reserva créditos (decremento optimista).
4. Ejecuta operación.
5. Si falla: revierte reserva.
6. Si éxito: confirma en ledger con referencia a la operación.
```

### 5.5 Worker para jobs largos

El `apps/worker` existente puede procesar:
- Generaciones que exceden 60s (evita timeouts de Vercel/Next).
- Reintento automático con backoff en caso de 429/5xx del API de Anthropic.
- Limpieza de drafts abandonados (cron nocturno: `ABANDONED` si `updatedAt < now-30d`).

---

## 6. UX — decisiones clave

1. **Mostrar costo antes de ejecutar**: cada botón que consume créditos muestra "Esto consumirá X créditos". Nunca cobres sin advertir.
2. **Balance visible en header**: chip pequeño con créditos restantes del mes + link a top-up.
3. **Diff visual en regeneración**: cuando regeneras una lección, mostrar antes/después en columnas antes de aceptar.
4. **Dos alternativas por regeneración**: cada regeneración devuelve 2 variantes — el profesor elige. Doble el costo pero elimina el dolor de "no me gustó ninguna".
5. **Paso 2 gratis**: nunca cobra créditos. Es el gancho de adopción.
6. **Skip refinamiento**: usuarios expertos pueden saltar paso 2 con 1 clic y generar directo con defaults.
7. **Undo global**: barra flotante con "↩ Deshacer" que revierte la última operación IA.

---

## 7. Métricas a trackear (analytics)

- **Funnel**: % de drafts que pasan de briefing → refinement → generated → published.
- **Tiempo a primer curso publicado** desde activación de IA.
- **Regeneraciones promedio por curso**: si es >10, el outline inicial es malo — tunear prompts.
- **Créditos gastados vs cursos publicados** por tenant: detectar abuso o usuarios en problemas.
- **Tasa de abandono por paso**: en cuál paso el profesor se va y no vuelve.
- **Top razones de regeneración** (de los feedback libres): input para mejorar el prompt maestro.

---

## 8. Plan de implementación (fases)

**Fase 0 — Foundation (1 semana)**
- Migración de DB: nuevos modelos + modificaciones a `Tenant` y `AIJobType`.
- `AICreditsLedger` helper (`consume`, `refund`, `getBalance`).
- Feature flag `aiEnabled` por tenant (ya existe, solo instrumentarlo).

**Fase 1 — Flujo 4 pasos happy path (2 semanas)**
- Refactor de `course-outline.ts` a nuevo schema V2.
- Pipelines: `refinement.ts`, `outline-v2.ts` con streaming.
- UI multi-paso con persistencia en `CourseDraft`.
- Endpoint `publish` que crea `Course` + `Module` + `Lesson` reales.
- Sin edición asistida por IA todavía — solo edición manual del outline final.

**Fase 2 — Edición asistida (1.5 semanas)**
- Pipelines: `regenerate-lesson`, `regenerate-module`, `coherence-check`.
- UI de diff visual y dos alternativas.
- Versioning con `CourseDraftVersion`.

**Fase 3 — Monetización (1 semana)**
- Planes Stripe (Starter / Pro / Studio AI).
- Top-ups.
- UI de balance + paywalls.
- Emails transaccionales (allotment bajo, top-up exitoso, recarga mensual).

**Fase 4 — Polish (1 semana)**
- `split-lesson`, `merge-lessons`.
- Dashboard de analytics interno.
- Cron de limpieza de drafts abandonados.
- Prompt caching.

**Total estimado: 6.5 semanas** para una V1 sólida.

---

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Costo IA > ingresos | Alto | Calibrar créditos con margen 60%+ sobre costo real. Rate-limit duro por tenant. |
| Outputs inconsistentes | Medio | JSON schema con Zod + reintentos con temperatura baja si falla validación. |
| Alucinaciones pedagógicas | Medio | Prompt explícito "no inventes datos específicos"; paso 2 captura expertise del profesor. |
| Abandono en paso 3 (genera pero no publica) | Bajo | Paso 2 gratis + streaming + email de recordatorio a las 48h. |
| Dependencia de Anthropic | Medio | Abstraer en `packages/ai` para poder swap a Gemini/OpenAI si cambia pricing. |
| Fraude con top-ups | Bajo | Stripe Radar + límite de top-up/día nuevo en cuentas <30 días. |

---

## 10. Decisiones pendientes

- ¿Los créditos se venden en USD o en MXN? (MXN alinea con moneda del LMS, USD con costo real de Anthropic).
- ¿Se permite regenerar usando referencias a cursos existentes del mismo profesor? (RAG interno — añadiría valor pero suma complejidad).
- ¿El paso 4 debería permitir "tono de voz del profesor" subiendo un ejemplo de texto suyo? (feature killer para V2).
- ¿Ofrecer planes anuales con descuento? (reduce churn pero compromete margen si Anthropic sube precios).
