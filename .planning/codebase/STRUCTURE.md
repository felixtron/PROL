# Estructura de Codebase

**Análisis Date:** 2026-09-01

## Distribución de Directorios

```
/Users/flx/Documents/Developer/PROL/
├── apps/
│   ├── web/                          # Aplicación principal (Next.js App Router)
│   │   ├── app/                      # Rutas de Next.js (directorio de rutas)
│   │   │   ├── dashboard/            # Panel del estudiante
│   │   │   ├── professor/            # Panel del profesor
│   │   │   ├── tenant-admin/         # Panel del admin del tenant
│   │   │   ├── admin/                # Panel del super admin
│   │   │   ├── api/                  # Route handlers
│   │   │   ├── sign-in/              # Autenticación
│   │   │   ├── courses/              # Catálogo de cursos (público/student)
│   │   │   ├── surveys/              # Respuesta de encuestas (público/estudiante)
│   │   │   └── ...                   # Otras rutas (verify, onboarding, etc.)
│   │   ├── components/               # Componentes React reutilizables
│   │   │   ├── landing/              # Página de inicio
│   │   │   ├── charts/               # Gráficos
│   │   │   ├── notification-bell.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── ...
│   │   ├── lib/                      # Lógica compartida
│   │   │   ├── actions/              # Server actions ("use server")
│   │   │   ├── queries/              # RSC queries con cache()
│   │   │   ├── certificate-templates/
│   │   │   ├── dc3/                  # Lógica DC-3 (constancias)
│   │   │   ├── *-access.ts           # Módulos de autorización
│   │   │   ├── auth.ts               # getCurrentUser(), requireUser()
│   │   │   ├── document-files.ts     # Contrato puro de archivos
│   │   │   ├── document-storage.ts   # Acceso a disco (server-only)
│   │   │   └── ...
│   │   ├── public/                   # Activos estáticos
│   │   │   ├── uploads/              # Archivos públicos (cursos)
│   │   │   │   └── private/          # Archivos privados (evidencias, plantillas)
│   │   │   ├── cert-assets/          # Imágenes/firmas para diplomas
│   │   │   └── fonts/
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── worker/                       # Worker (cron jobs, tareas en background)
│       ├── src/                      # Tareas (cron)
│       └── package.json
├── packages/                         # Paquetes compartidos (monorepo)
│   ├── db/                           # Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Esquema de BD (Tenant, User, Course, etc.)
│   │   └── src/
│   │       ├── index.ts              # Exporta PrismaClient y tipos
│   │       └── credits.ts            # Lógica de créditos de IA
│   ├── shared/                       # Tipos, esquemas, constantes
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts              # Tipos TypeScript compartidas
│   │       ├── schemas.ts            # Validaciones Zod
│   │       ├── constants.ts          # Constantes globales
│   │       ├── video.ts              # Enums y helpers de video
│   │       └── lesson-blocks.ts      # Tipo de bloques de lecciones MULTI
│   ├── ui/                           # Componentes UI reutilizables
│   │   └── src/
│   │       ├── avatar.tsx
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── ...
│   ├── email/                        # Plantillas y envío de email
│   │   └── src/
│   │       ├── client.ts             # Cliente (Resend/SMTP)
│   │       ├── send.ts               # Función send()
│   │       └── templates.ts          # Todas las plantillas HTML
│   ├── ai/                           # Integración con Claude y AssemblyAI
│   │   └── src/
│   │       ├── claude.ts             # Cliente de Claude
│   │       ├── assemblyai.ts         # Cliente de AssemblyAI (transcripciones)
│   │       ├── prompts.ts            # Prompts del sistema
│   │       └── index.ts              # Exporta funciones principales
│   ├── content-factory/              # Generación de contenido (pipelines)
│   │   └── src/
│   │       ├── pipelines/            # Módulos de generación (outline, lesson, etc.)
│   │       └── index.ts
│   ├── eslint-config/                # Configuración compartida de ESLint
│   └── typescript-config/            # Configuración compartida de TypeScript
├── .github/
│   └── workflows/                    # CI/CD (GitHub Actions)
├── .planning/
│   ├── codebase/                     # Documentación de arquitectura (este archivo)
│   └── debug/                        # Notas de debugging
├── docs/                             # Documentación pública
├── scripts/                          # Scripts de setup/deploy
├── .turbo/                           # Cache de Turborepo
├── middleware.ts                     # Middleware de Next.js (rate limit, headers, auth)
├── turbo.json                        # Configuración de Turborepo
├── pnpm-workspace.yaml               # Workspaces de pnpm
├── package.json                      # Dependencias de root
└── tsconfig.json                     # Configuración base de TypeScript
```

## Directorios Principales

### `apps/web/app` (Rutas de Next.js App Router)

**Estructura:** Convención de Next.js = carpeta = segmento de URL

**Rutas principales:**

#### Panel de Estudiante
- **`/dashboard`** (`apps/web/app/dashboard/layout.tsx`, `page.tsx`)
  - Inicio del estudiante
  - Mis cursos, mi empresa, talleres, diplomas
  - Manuales, agenda (si tenant habilita `documentsEnabled`)
  - Encuestas (si tenant habilita `surveysEnabled`)
  - Consultoría Online (si tenant habilita `advisoryEnabled`)
  - Feature flag checks en el layout

#### Panel del Profesor
- **`/professor`** (`apps/web/app/professor/layout.tsx`)
  - Requiere rol = PROFESSOR
  - Cursos que enseña, alumnos inscritos, talleres
  - Calificación de quizzes y exámenes finales

#### Panel del Admin del Tenant
- **`/tenant-admin`** (`apps/web/app/tenant-admin/layout.tsx`)
  - Requiere rol = ADMIN (o SUPER_ADMIN con tenantId explícito)
  - Administración de empresas, usuarios, cursos
  - Gestión de DC-3, encuestas, evaluaciones, manuales
  - Configuración del tenant (feature flags, branding, etc.)

#### Panel del Super Admin
- **`/admin`** (`apps/web/app/admin/layout.tsx`)
  - Requiere rol = SUPER_ADMIN
  - Administración global: tenants, usuarios, auditoría

#### Catálogo de Cursos
- **`/courses`** (`apps/web/app/courses/page.tsx`)
  - Listado público de cursos disponibles
  - Búsqueda, filtros por categoría
  - Carrito de compras (si curso es de pago)
  - Acceso: públicos si estudiante anónimo, filtrados por tenant si inscrito

#### Respuesta de Encuestas
- **`/surveys/[publicSlug]`** (`apps/web/app/surveys/[publicSlug]/page.tsx`)
  - Formulario para responder encuesta
  - Acceso mediante enlace o panel del estudiante
  - Público (sin autenticación) o autenticado, según configuración de campaña

#### Autenticación
- **`/sign-in`** (`apps/web/app/sign-in/[[...sign-up]]`)
  - Página de login (Better Auth)
  - Manejo de OAuth y credentials
- **`/sign-up`**
  - Página de registro
- **`/verify/[code]`** — Verificación de email
- **`/forgot-password`**, **`/reset-password`** — Recuperación de contraseña
- **`/force-reset-password`** — Cambio obligatorio (user.mustResetPassword = true)
- **`/onboarding`** — Setup inicial de profesor

#### Files (Descargas Protegidas)
- **`/files/[...path]`** (`apps/web/app/files/[...path]/route.ts`)
  - Descarga de archivos privados (evidencias, plantillas, certificados)
  - Verifica autorización contra BD antes de servir

#### API
- **`/api/*`** (`apps/web/app/api/`)
  - Webhooks: `/api/webhooks/stripe`
  - Uploads: `/api/upload/*` (evidencias, asignaciones, PDFs, etc.)
  - Cron jobs: `/api/cron/*` (tareas automáticas)
  - Auth: `/api/auth/[...all]` (Better Auth)
  - Health checks: `/api/health`
  - Queries específicas de cliente: `/api/quiz/[lessonId]/answers`, etc.

### `apps/web/lib` (Lógica Compartida)

#### `lib/actions` — Server Actions
Todos los archivos aquí tienen `"use server"` al inicio.

- `course.ts` — createCourse, updateCourse, archiveCourse, updateCourseThumbnail
- `quiz.ts` — createQuiz, updateQuiz, submitQuizAttempt
- `enrollment.ts` — enrollInCourse, cancelEnrollment, markLessonComplete
- `module.ts` — createModule, updateModule, reorderModules
- `lesson-blocks.ts` — createBlock, updateBlock (lecciones MULTI)
- `manual.ts` — createManual, publishManual, activateManualForCompany, submitEvidence, reviewEvidence, requestDeletion
- `survey.ts` — createSurvey, publishSurvey, launchCampaign, submitSurveyResponse
- `evidence.ts` — uploadEvidence, submitForReview, approveEvidence, requestCorrection
- `company.ts` — createCompany, inviteUserToCompany, acceptInvitation, setCompanyLeader
- `dc3.ts` — issuedc3Certificate, confirmdc3Data
- `payment.ts` — createPayment, handleStripeWebhook
- `evaluation.ts` — createEvaluation, publishEvaluation, submitEvaluationParticipation
- Y más...

Patrón: `"use server"; export async function actionName(params) { ... }`

#### `lib/queries` — RSC Queries
Todos usan `cache()` de React.

- `course.ts` — getCourseForEdit, getCourseDetail, getCourseModules
- `quiz.ts` — getQuizzesByLesson, getQuizAttempts, getQuizResults
- `student.ts` — getStudentEnrollments, getStudentProgress
- `professor.ts` — getProfessorCourses, getProfessorStudents
- `manual.ts` — getManualByAssignment, getEvidencePendingReview, getAllActivities
- `survey.ts` — getSurveyTemplates, getSurveyResults, getSurveyResponses
- `company.ts` — getCompanyMembers, getCompanyProgress
- `notifications.ts` — getUnreadNotificationCount
- Y más...

Patrón: `export const queryName = cache(async (params) => { ... })`

#### `lib/*-access.ts` — Autorización Centralizada

Estos módulos implementan el patrón de guarda:

- `manual-access.ts` — 416 líneas
  - `requireManualAdmin()` — Lanza si no es ADMIN/SUPER_ADMIN y módulo no habilitado
  - `requireManualReviewer()` — Lanza si no es ADMIN/PROFESSOR/SUPER_ADMIN
  - `requireAssignmentManageAccess()` — Carga activación + verifica acceso de revisión
  - `requireAssignmentMemberAccess()` — Carga activación + verifica acceso de lectura (miembro o staff)
  - `isManualAdmin()`, `isManualReviewer()` — Predicados para UI condicional
  - `assertTenantScope()` — Verifica que el recurso pertenece al tenant del usuario
  - `resolveAdminTenantId()` — Resuelve tenant para SUPER_ADMIN sin tenant propio
  - Y más...

- `survey-access.ts` — 166 líneas
  - `requireSurveyAdmin()` — Igual que `requireManualAdmin()` pero para encuestas
  - `requireSurveyManageAccess()` — Carga plantilla + verifica permisos
  - `requireCampaignManageAccess()` — Carga lanzamiento + verifica permisos
  - Y más...

- `course-access.ts` — Acceso a cursos
  - `assertCourseOwnerAccess()` — Lanza si no es propietario o admin
  - `courseAccessWhere()` — Cláusula WHERE para filtrar cursos visibles

- `advisory-access.ts` — Sesiones de asesoría
  - Patrón similar: `requireAdvisoryAdmin()`, etc.

**Importancia:** Usar estos en `lib/actions/*` para validar antes de mutar:
```typescript
// apps/web/lib/actions/survey.ts
export async function createSurvey(data: CreateSurveyInput) {
  const { user } = await requireSurveyManageAccess(); // Lanza aquí
  await db.survey.create({ data });
}
```

#### `lib/auth.ts` — Autenticación

- `getCurrentUser()` — Obtiene usuario actual (null si no autenticado)
- `requireUser()` — Lanza si no autenticado
- Integración con Better Auth: `auth` object

#### `lib/certificate-templates/`

- `catalog.ts` — Constantes y lógica pura (sin @react-pdf/renderer)
  - `CERTIFICATE_TEMPLATES` — Lista de plantillas disponibles
  - `resolveCertificateTemplate()` — Elige plantilla (explícita o fallback por tenant)
  - `isIbizaTenant()` — Reconoce al tenant IBIZA por slug/nombre
  - `isCertificateTemplateId()` — Type guard

- `index.tsx` — Renderizador de PDF (server-only)
  - `renderCertificate(templateId, data)` — Retorna ReactElement para @react-pdf/renderer
  - Imports de `ibiza.tsx`, `classic.tsx`

- `ibiza.tsx` — Componente PDF del template IBIZA
  - Hoja vertical, papel de seguridad, franja azul
  - Firma autorizada, código de norma

- `classic.tsx` — Componente PDF del template CLASSIC
  - Hoja horizontal, doble marco
  - SHA-256 impreso, calificación final

**Patrón de uso:**
```typescript
// En route handler para generar PDF
import { renderCertificate } from "@/lib/certificate-templates";

const templateId = resolveCertificateTemplate(course.certificateTemplate, tenant);
const doc = renderCertificate(templateId, certificateData);
// ... generar PDF con @react-pdf/renderer
```

#### `lib/document-files.ts` — Contrato Puro de Archivos

Código puro, sin `node:fs`:
- `MAX_FILE_SIZE` — 25 MB
- `EVIDENCE_ACCEPT` — Extensiones aceptadas para evidencias
- `TEMPLATE_ACCEPT` — Extensiones aceptadas para plantillas
- `safeFilename()` — Sanitiza nombres de archivo
- Tipos: `StoredFile`, `PrivateSubdir`

#### `lib/document-storage.ts` — Acceso a Disco (Server-Only)

Código server, importa `node:fs`:
- `storePrivateFile(file, subdir, allowed)` — Guarda archivo en disco privado
  - Valida tipo y tamaño
  - Retorna `StoreResult | StoreError`
  - Archivo se guarda como UUID.ext
- `readPrivateFile(fileKey)` — Lee desde disco privado
  - Valida path (anti path-traversal)
  - Retorna Buffer | null
- `privateFileResponse()` — Crea Response HTTP para descargar
  - Cache headers: `private, no-store`

**Por qué está separado:**
- Cliente necesita `MAX_FILE_SIZE` y `EVIDENCE_ACCEPT` para validar antes de subir
- Cliente NO necesita `node:fs`
- Si juntaramos, el bundler intentaría incluir `fs` en el cliente

#### Otros módulos en `lib/`

- `dc3/` — Lógica DC-3 (constancias de capacitación STPS)
  - `dc3-content.ts`, `dc3-pdf.ts`, etc.
- `quiz-gate.ts` — Lógica de gate de examen final (80% requiero)
- `notifications.ts` — Tipos de notificación
- `compliance.ts` — Lógica de cumplimiento (agendas, actividades)
- `survey-dispatch.ts` — Despacho de lógica de encuestas
- `tenant.ts` — Helpers de tenant
- `upload-paths.ts` — Resolución de directorios de upload
- Y más...

### `apps/web/components` (Componentes React)

- `landing/` — Componentes de página de inicio
- `charts/` — Gráficos (Revenue, Enrollment, etc.)
- `notification-bell.tsx` — Icono de campana con unread count
- `user-menu.tsx` — Menú de usuario (perfil, logout)
- `sidebar-shell.tsx` — Layout de sidebar para admin/profesor
- `tenant-brand.tsx` — Logo y nombre del tenant
- `tenant-theme.tsx` — CSS variables para colores del tenant
- Otros componentes reutilizables...

### `packages/db/prisma/schema.prisma` (Esquema de BD)

Archivo único que define toda la BD:
- `Tenant` (línea 452) — Academia blanca
- `User` (línea 546) — Usuarios
- `Company` (línea ~1980) — Empresas cliente
- `Course` (línea 697) — Cursos
- `Module`, `Lesson`, `Quiz` — Estructura de contenido
- `Enrollment`, `LessonProgress`, `QuizAttempt` — Progreso
- `Certificate`, `Dc3Certificate` — Diplomas y constancias
- `Workshop`, `AdvisorySession` — Talleres y asesorías
- `Manual`, `ManualAssignment`, `Evidence` — Gestión documental
- `Survey`, `SurveyCampaign`, `SurveyRecipient` — Encuestas
- `Evaluation`, `EvaluationSubmission` — Evaluaciones
- `RiskAssessment` — Matrices de riesgos
- Y muchos más...

**Enums clave:**
- `UserRole` — STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN
- `TenantStatus` — TRIAL, ACTIVE, PAUSED, CHURNED
- `CourseStatus` — DRAFT, REVIEW, PUBLISHED, ARCHIVED
- `LessonType` — VIDEO, TEXT, QUIZ, ASSIGNMENT, MULTI, DOWNLOAD
- Y más...

### `packages/shared/src` (Tipos y Esquemas Compartidas)

- `types.ts` — Tipos TypeScript (TS solo)
- `schemas.ts` — Validaciones Zod (runtime)
- `constants.ts` — Constantes globales
- `video.ts` — Enums de proveedores de video (CLOUDFLARE, VIMEO, YOUTUBE)
- `lesson-blocks.ts` — Tipo de bloques en lecciones MULTI

**Importancia:** Los schemas se reutilizan en server actions para validar input:
```typescript
// apps/web/lib/actions/course.ts
import { createCourseSchema } from "@prol/shared";
const validated = createCourseSchema.parse(Object.fromEntries(formData));
```

### `packages/ui` (Componentes UI Reutilizables)

Componentes base, normalmente con CSS classes (Tailwind):
- `button.tsx` — <Button variant="primary" />
- `input.tsx` — <Input type="text" />
- `card.tsx` — <Card>
- `avatar.tsx` — <Avatar src="" />
- `badge.tsx` — <Badge color="red" />
- `progress.tsx` — <Progress value={75} />
- `sidebar.tsx` — <Sidebar>
- `stat-card.tsx` — <StatCard label="Alumnos" value="42" />

### `packages/email/src` (Email Templates)

- `templates.ts` — Todas las plantillas HTML (survey invitations, course updates, certificates, etc.)
- `send.ts` — Función `sendEmail()` que envía via Resend o SMTP
- `client.ts` — Instancia del cliente

### `packages/ai/src` (IA)

- `claude.ts` — Cliente de Claude (completions, streaming)
- `assemblyai.ts` — Cliente de AssemblyAI (transcripciones de video)
- `prompts.ts` — Prompts del sistema
- `index.ts` — Exporta funciones principales

### `packages/content-factory/src` (Generación de Contenido)

- `pipelines/` — Módulos de generación:
  - `course-outline.ts` — Generar esquema de curso
  - `lesson-content.ts` — Generar contenido de lección
  - `course-enrichment.ts` — Enriquecer contenido existente

## Ubicaciones Clave para Tareas Comunes

### Agregar una Nueva Ruta (Página)

1. **Crear ruta en `apps/web/app`:**
   - `apps/web/app/my-feature/layout.tsx` — Estructura (con protección por rol)
   - `apps/web/app/my-feature/page.tsx` — Página
   - Si sub-rutas: `apps/web/app/my-feature/[id]/page.tsx`

2. **Crear query en `apps/web/lib/queries/my-feature.ts`:**
   ```typescript
   import { cache } from "react";
   
   export const getMyFeature = cache(async (id: string) => {
     const user = await requireUser();
     // ... verify access ...
     return db.myFeature.findUnique({ where: { id } });
   });
   ```

3. **Crear server action en `apps/web/lib/actions/my-feature.ts`:**
   ```typescript
   "use server";
   
   export async function createMyFeature(data: CreateInput) {
     const user = await requireUser();
     // ... validate and mutate ...
   }
   ```

4. **Si requiere protección especial, crear `apps/web/lib/my-feature-access.ts`:**
   ```typescript
   export async function requireMyFeatureAccess() {
     const user = await requireUser();
     if (!isMyFeatureManager(user)) throw new Error("...");
     return user;
   }
   ```

### Agregar un Feature Flag

1. **Agregar boolean en `packages/db/prisma/schema.prisma`:**
   ```prisma
   model Tenant {
     // ...
     myNewFeatureEnabled Boolean @default(false) @map("my_new_feature_enabled")
   }
   ```

2. **Migrar:**
   ```bash
   pnpm -F @prol/db exec prisma migrate dev --name add_my_new_feature_enabled
   ```

3. **Usar en layout:**
   ```typescript
   const tenant = await db.tenant.findUnique({
     where: { id: user.tenantId },
     select: { myNewFeatureEnabled: true }
   });
   
   if (tenant?.myNewFeatureEnabled) {
     navItems.push({ label: "Mi Función", href: "/dashboard/my-feature" });
   }
   ```

4. **Verificar en server actions:**
   ```typescript
   async function assertMyNewFeatureEnabled(tenantId: string) {
     const tenant = await db.tenant.findUnique({
       where: { id: tenantId },
       select: { myNewFeatureEnabled: true }
     });
     if (!tenant?.myNewFeatureEnabled) {
       throw new Error("Función no habilitada");
     }
   }
   ```

### Agregar un Modelo a la BD

1. **Editar `packages/db/prisma/schema.prisma`:**
   ```prisma
   model MyModel {
     id        String @id @default(cuid())
     tenantId  String @map("tenant_id")
     tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     
     name      String
     createdAt DateTime @default(now()) @map("created_at")
     
     @@index([tenantId])
     @@map("my_models")
   }
   ```

2. **Migrar:**
   ```bash
   pnpm -F @prol/db exec prisma migrate dev --name create_my_model
   ```

3. **Usar en queries/actions:**
   ```typescript
   import { db } from "@prol/db";
   
   const item = await db.myModel.findUnique({ where: { id } });
   ```

### Enviar un Email

1. **Usar función `sendEmail()` de `@prol/email`:**
   ```typescript
   import { sendEmail } from "@prol/email";
   
   await sendEmail({
     to: user.email,
     template: "survey-invitation",
     data: { userName: user.name, surveyUrl: "..." }
   });
   ```

2. **Si la plantilla no existe, agregarla en `packages/email/src/templates.ts`**

### Usar IA (Claude)

1. **En un server action:**
   ```typescript
   "use server";
   
   import { generateCourseOutline } from "@prol/ai";
   
   export async function generateCourse(topic: string) {
     const outline = await generateCourseOutline(topic);
     await db.courseDraft.create({ data: { outline } });
   }
   ```

2. **Los créditos de IA se deducen automáticamente** (`packages/db/src/credits.ts`)

### Agregar Validación Zod

1. **En `packages/shared/src/schemas.ts`:**
   ```typescript
   import { z } from "zod";
   
   export const createMyFeatureSchema = z.object({
     title: z.string().min(3).max(100),
     description: z.string().optional(),
   });
   ```

2. **Reutilizar en server actions:**
   ```typescript
   import { createMyFeatureSchema } from "@prol/shared";
   
   const validated = createMyFeatureSchema.parse(input);
   ```

## Convenciones de Nombres

### Directorios
- Minúsculas, kebab-case: `lib-actions`, `tenant-admin`, `course-draft`
- Guiones entre palabras: `manual-access`, `dc3`, `interactive-stops`

### Archivos
- Componentes: PascalCase + `.tsx` — `UserMenu.tsx`, `NotificationBell.tsx`
- Lógica: camelCase + `.ts` — `course-access.ts`, `quiz-gate.ts`, `notify.ts`
- Server actions/queries: camelCase + `.ts` — `course.ts`, `manual.ts`, `survey.ts`
- Modelos: PascalCase + `.tsx` (componentes) o `.ts` (tipos) — `Certificate.tsx`, `types.ts`

### Funciones
- Server actions: verbales — `createCourse()`, `updateQuiz()`, `submitEvidence()`
- Queries: `get*` — `getCourseForEdit()`, `getStudentEnrollments()`, `getUnreadNotificationCount()`
- Guards: `require*()` — `requireUser()`, `requireSurveyAdmin()`, `assertCourseOwnerAccess()`
- Predicados: `is*()` — `isManualAdmin()`, `isCourseManager()`

### Rutas (App Router)
- Rutas protegidas por rol en nivel alto: `/dashboard`, `/professor`, `/tenant-admin`, `/admin`
- Subrutas descriptivas: `/dashboard/courses`, `/professor/students`, `/tenant-admin/surveys`
- Rutas dinámicas con corchetes: `/courses/[courseId]`, `/surveys/[publicSlug]`
- Rutas opcionales con dobles corchetes: `/sign-up/[[...sign-up]]` (para embed en Clerk)

### Base de Datos
- Tablas: snake_case, plural (convención Prisma): `courses`, `users`, `quiz_attempts`
- Campos: snake_case: `created_at`, `updated_at`, `video_duration_seconds`
- Relaciones: camelCase en schema (convención Prisma): `tenantId`, `professorId`, `companyId`

### Types / Interfaces
- `ContextType` — Contexto de una operación (carga de recurso + verificación de acceso)
- `InputType` — Input para server action
- `ResultType` — Resultado de una operación

Ejemplo:
```typescript
export interface SurveyManageContext {
  user: SurveyAdmin;
  survey: { id: string; tenantId: string; status: string };
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
}
```

## Orden de Imports

Convención observada en los archivos:
1. Imports de librerías externas (`react`, `next`, `zod`)
2. Imports de `node:*` (si server-only)
3. Imports de `@prol/*` (paquetes compartidos)
4. Imports relativos: `@/lib/...`, `@/components/...`

Ejemplo:
```typescript
import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { courseAccessWhere } from "@/lib/course-access";
```

---

*Estructura analizada: 2026-09-01*
