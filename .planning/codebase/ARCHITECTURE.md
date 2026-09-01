# Arquitectura

**Análisis Date:** 2026-09-01

## Resumen

PROL es una plataforma SaaS white-label de LMS construida con Next.js App Router. Implementa un modelo de **arquitectura de capas explícita** donde cada flujo de datos sigue un patrón bien definido: **Server Actions** para mutaciones, **RSC + cache()** para consultas, y **Route Handlers** solo cuando es necesario retornar un objeto `Response` (webhooks, descargas, uploads binarios).

El modelo de datos es **multi-tenant**: cada `Tenant` es una academia independent del creador; cada `Company` es un cliente dentro de ese tenant; el control de acceso por rol ocurre en **layouts de página** (no en middleware), lo que permite que diferentes rutas usen diferentes protecciones.

## Patrón General: Tres Capas de Datos

### 1. Server Actions (Mutaciones)

**Ubicación:** `apps/web/lib/actions/*`
**Patrón:** Archivos con `"use server"` al inicio

```typescript
// Ejemplo: apps/web/lib/actions/course.ts
"use server";

export async function createCourse(formData: FormData) {
  const user = await requireUser();
  // validar, escribir a BD, revalidar cache
}

export async function updateCourse(courseId: string, formData: FormData) {
  // ...
}
```

**Responsabilidades:**
- Validación de entrada (Zod schemas de `@prol/shared`)
- Verificación de autorización con funciones de guarda (`requireUser()`, `assertCourseOwnerAccess()`, etc.)
- Transacciones de base de datos
- Revalidación de ISR/On-Demand (`revalidatePath()`, `revalidateTag()`)
- Retorno de datos o errores (nunca `Response`)

**Cuando usar:**
- Crear, actualizar, eliminar recursos
- Cambios de estado que requieren BD
- Formularios desde componentes de cliente

### 2. RSC Queries (Consultas de Lectura)

**Ubicación:** `apps/web/lib/queries/*`
**Patrón:** Funciones envueltas en `cache()` de React

```typescript
// Ejemplo: apps/web/lib/queries/course.ts
import { cache } from "react";

export const getCourseForEdit = cache(async (courseId: string) => {
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { /* ... */ }
  });
  // ...
  return course;
});
```

**Responsabilidades:**
- Lectura de BD con `@prol/db` (Prisma)
- Verificación de autorización (pero no lanza; devuelve `null` si no accede)
- Deduplicación automática de solicitudes en el mismo render (gracias a `cache()`)
- Retorno de datos serializables JSON

**Cuando usar:**
- Obtener datos en componentes de servidor (layouts, páginas, componentes RSC)
- Datos que no cambian frecuentemente (caché de aplicación)
- Consultas que necesitan ejecutarse múltiples veces en el mismo árbol de componentes

**Nota:** `cache()` de React no es lo mismo que `unstable_cache()` de Next.js. `cache()` desdublica en el mismo request; `unstable_cache()` persiste entre requests (ISR).

### 3. Route Handlers (Respuestas HTTP Raw)

**Ubicación:** `apps/web/app/api/*`
**Patrón:** Archivos `route.ts` con exportaciones `GET`, `POST`, etc.

```typescript
// Ejemplo: apps/web/app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 503 }
    );
  }
}
```

**Responsabilidades:**
- Webhooks externos (Stripe, AssemblyAI)
- Uploads binarios (archivos, imágenes)
- Descargas de archivos (PDFs, CSVs)
- Liveness/readiness checks (`/health`)
- Rutas que requieren headers HTTP específicos

**Cuando usar:**
- Stripe webhooks: `/api/webhooks/stripe` (`apps/web/app/api/webhooks/stripe/route.ts`)
- Upload de archivos: `/api/upload/*` (`apps/web/app/api/upload/evidence/route.ts`, etc.)
- Descarga de PDFs: generado on-demand en route handler
- Health checks: `/api/health`

**Patrón importante:** Los route handlers de uploads (`/api/upload/*`, `/api/upload/evidence/route.ts`, `/api/upload/assignment/route.ts`) retornan `NextResponse.json()` con la metadata del archivo guardado. El archivo se almacena en el disco privado (`uploads/private/`), y la URL para descargar va a una ruta protegida en `/files/*` que verifica autorización antes de servir.

## Modelo Multi-Tenant

### Jerarquía de Datos

```
Tenant (academia del creador)
  ↓
  Company (cliente dentro del tenant)
    ↓
    User (miembro de la empresa)
```

**Tenant** (`packages/db/prisma/schema.prisma`, línea 452):
- `id`, `slug`, `customDomain`
- Relacionado con: `courses`, `users`, `companies`, `evaluations`, `surveys`, `manuals`, etc.
- Propiedad: cada recurso de contenido (cursos, evaluaciones, encuestas) pertenece a un tenant específico
- Feature flags: `workshopsEnabled`, `aiEnabled`, `companiesEnabled`, `evaluationsEnabled`, `surveysEnabled`, `advisoryEnabled`, `documentsEnabled`

**Company** (línea ~1980 del schema):
- `id`, `tenantId`, `name`, `slug`, `logo`
- **`leaderId`** (FK a User, UNIQUE): un usuario STUDENT con permisos extra:
  - Puede invitar nuevos miembros a la empresa (si `allowMemberInvitations = true`)
  - Puede ver un reporte de progreso consolidado de su equipo
  - Puede supervisar evidencias de su empresa (en el módulo de Gestión Documental)
- Relación: cada empresa pertenece a un tenant

**User** (línea 546):
- `id`, `email`, `role` (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN)
- `tenantId` (FK): identifica a qué tenant está afiliado (null para SUPER_ADMIN)
- `companyId` (FK): si es miembro de una empresa, cuál
- Relación bidireccional `Company.leaderId ↔ User.companyLed`

### Scoping de Acceso

**STUDENT:**
- Ve solo sus propios datos: cursos en los que está inscrito, sus certificados, su empresa (si pertenece a una)
- Si es líder de empresa: acceso extra a panel de evidencias y reporte de equipo

**PROFESSOR:**
- Pertenece a un tenant
- Enseña cursos dentro de ese tenant
- Puede ver todos sus alumnos (inscritos en sus cursos)
- Consultor/revisor: puede revisar evidencias si el tenant habilita `documentsEnabled`

**ADMIN:**
- Pertenece a un tenant específico
- Administra ese tenant: usuarios, empresas, cursos, activaciones de módulos
- Crea y publica evaluaciones, encuestas, manuales

**SUPER_ADMIN:**
- TenantId = null (sin tenant propio)
- Acceso global: puede actuar sobre cualquier recurso si específica explícitamente el tenant
- Rara vez usado en operación, principalmente para setup y auditoría

## Control de Acceso por Rol

### División: Middleware vs Layouts

**middleware.ts** (`apps/web/middleware.ts`):
- Solo verifica la **presencia de la cookie de sesión** (Better Auth)
- NO verifica rol
- Redirige rutas protegidas a `/sign-in` si no hay sesión
- **No redirige por rol**

**Layouts** (`apps/web/app/dashboard/layout.tsx`, `apps/web/app/professor/layout.tsx`, `apps/web/app/tenant-admin/layout.tsx`):
- Verifican el rol específico del usuario
- Redirigen según rol:
  - Dashboard (STUDENT): redirige ADMIN/PROFESSOR a su propia ruta
  - `/professor`: redirige si no es PROFESSOR
  - `/tenant-admin`: redirige si no es ADMIN o SUPER_ADMIN
- Esta arquitectura permite que **diferentes rutas compartan usuarios** sin conflictos

**Ejemplo:**
```typescript
// apps/web/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  
  if (!user) redirect("/sign-in");
  
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "ADMIN") redirect("/tenant-admin");
  if (user.role === "PROFESSOR") redirect("/professor");
  
  // STUDENT → sírvele el dashboard
  return <StudentDashboard>{children}</StudentDashboard>;
}
```

### Módulos de Autorización (Guards)

**Ubicación:** `apps/web/lib/manual-access.ts`, `apps/web/lib/survey-access.ts`, etc.

**Patrón compartido:**

```typescript
// Funciones requireX que lanzan si no autoriza
export async function requireSurveyAdmin(): Promise<SurveyAdmin> {
  const user = await requireUser();
  if (!ADMIN_ROLES.has(user.role)) {
    throw new Error("No autorizado: solo administrador gestiona encuestas");
  }
  // ...
  return user;
}

// Funciones isX que verifican sin lanzar (para UI condicional)
export function isSurveyAdmin(user: { role: string }): boolean {
  return ADMIN_ROLES.has(user.role);
}

// Contexto completo para operaciones
export async function requireSurveyManageAccess(surveyId: string) {
  const user = await requireSurveyAdmin();
  const survey = await db.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new Error("Encuesta no encontrada");
  assertTenantScope(user, survey.tenantId); // Verifica que pertenece al tenant del usuario
  return { user, survey };
}
```

**Módulos actuales:**
- `manual-access.ts`: autorización del módulo de Gestión Documental (manuales, evidencias, matrices)
- `survey-access.ts`: autorización de encuestas
- `course-access.ts`: acceso a cursos (propietario, profesor, admin)
- `advisory-access.ts`: sesiones de asesoría

**Por qué en Server Actions:**
```typescript
// En apps/web/lib/actions/survey.ts
"use server";

export async function createSurvey(data: CreateSurveyInput) {
  const { user } = await requireSurveyManageAccess(); // Lanza si no autoriza
  // ... crear survey
}
```

La autorización lanza en server actions; en queries a veces devuelve `null` silenciosamente.

## Feature Flags por Tenant

Están en el modelo `Tenant`:
- `workshopsEnabled` (Boolean, default false)
- `aiEnabled` (Boolean, default false)
- `companiesEnabled` (Boolean, default true)
- `evaluationsEnabled` (Boolean, default false)
- `surveysEnabled` (Boolean, default false)
- `advisoryEnabled` (Boolean, default true)
- `documentsEnabled` (Boolean, default false)

**Consulta en layouts/queries:**

```typescript
// apps/web/app/dashboard/layout.tsx
const tenant = await db.tenant.findUnique({
  where: { id: user.tenantId },
  select: { surveysEnabled: true, advisoryEnabled: true, documentsEnabled: true }
});

// Si el flag está deshabilitado, no incluir en la navegación
const navItems = [
  ...(tenant?.surveysEnabled ? [{ label: "Encuestas" }] : []),
  ...(tenant?.advisoryEnabled ? [{ label: "Consultoría Online" }] : [])
];
```

**Verificación en server actions/queries:**

```typescript
// apps/web/lib/survey-access.ts
async function assertSurveysEnabled(tenantId: string, userRole: string) {
  if (userRole === "SUPER_ADMIN") return; // Exento
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { surveysEnabled: true }
  });
  if (!tenant?.surveysEnabled) {
    throw new Error("Encuestas no habilitadas");
  }
}
```

## Separación de Código Puro vs Server-Only

**Problema:** Next.js bundlea todos los imports en el cliente. Si importas un módulo que usa `node:fs`, `node:crypto`, o una librería de servidor, se intenta enviar al navegador, lo que causa errores o bundle inflado.

**Solución:** Separar en dos archivos:
1. **Código puro:** tipos, constantes, lógica sin APIs de servidor → se puede importar desde cliente
2. **Código server:** imports de `node:*`, librerías de servidor → solo se importa en server actions/route handlers

### Ejemplo 1: document-files.ts vs document-storage.ts

**`lib/document-files.ts`** (puro):
```typescript
// NO usa node:fs
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const EVIDENCE_ACCEPT = ".pdf,.jpg,.docx,...";

export function safeFilename(name: string): string {
  // Lógica pura de sanitización
  return clean;
}

export interface StoredFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
}
```

**`lib/document-storage.ts`** (server-only):
```typescript
// Sí usa node:fs
import { writeFile, readFile } from "node:fs/promises";
import { safeFilename, MAX_FILE_SIZE } from "./document-files";

export async function storePrivateFile(file: File, subdir: string) {
  // Usa node:fs
  await writeFile(join(dir, name), buffer);
}

export async function readPrivateFile(fileKey: string) {
  // Usa node:fs
  return await readFile(path);
}
```

**Uso:**
```typescript
// apps/web/components/upload-form.tsx (CLIENT)
import { EVIDENCE_ACCEPT, safeFilename } from "@/lib/document-files";
// ✅ Seguro: no intenta importar node:fs

// apps/web/lib/actions/evidence.ts (SERVER)
import { storePrivateFile } from "@/lib/document-storage";
// ✅ Seguro: es server action
```

### Ejemplo 2: certificate-templates/catalog.ts vs index.tsx

**`lib/certificate-templates/catalog.ts`** (puro):
```typescript
// NO usa @react-pdf/renderer (librería grande de servidor)

export const CERTIFICATE_TEMPLATES = [
  { id: "IBIZA", label: "IBIZA — vertical", description: "..." },
  { id: "CLASSIC", label: "Clásica — horizontal", description: "..." }
];

export function resolveCertificateTemplate(explicit, tenant) {
  // Lógica pura de selección de template
}
```

**`lib/certificate-templates/index.tsx`** (server-only, renderiza PDFs):
```typescript
// Sí usa @react-pdf/renderer
import { Document, Page } from "@react-pdf/renderer";
import { IbizaCertificate } from "./ibiza";
import { resolveCertificateTemplate } from "./catalog"; // ✅ Re-importa lo puro

export function renderCertificate(templateId, data) {
  if (templateId === "IBIZA") {
    return <IbizaCertificate {...data} />;
  }
  return <ClassicCertificate {...data} />;
}
```

**Uso:**
```typescript
// apps/web/app/professor/courses/[courseId]/settings/page.tsx (CLIENT/RSC híbrido)
import { CERTIFICATE_TEMPLATES } from "@/lib/certificate-templates/catalog";
// ✅ Seguro: es puro

// apps/web/app/api/certificates/[folio]/route.ts (SERVER)
import { renderCertificate } from "@/lib/certificate-templates";
// ✅ Seguro: es route handler (server)
```

**Por qué importa:**
- Cliente no puede usar librerías de servidor → bundle se mantiene pequeño
- Pero cliente necesita los tipos y las opciones → `catalog.ts` está disponible para ambos
- Renderizar PDF es costoso → solo en el servidor, on-demand

## Flujos de Datos Típicos

### Crear un Recurso (Ejemplo: Curso)

```
Formulario (Client) 
  → submitForm()
    → createCourse() [Server Action en lib/actions/course.ts]
      → requireUser() [Verifica sesión]
      → validateInput() [Zod de @prol/shared]
      → assertCourseOwnerAccess() [Verifica rol/tenant]
      → db.course.create()
      → revalidatePath("/professor/courses")
      → Return { success: true, courseId } | { error: "..." }
    → Revalidation ocurre automáticamente
    → UI se actualiza
```

### Ver un Curso (Ejemplo: Profesor Editando)

```
Page (RSC) 
  → getCourseForEdit(courseId) [Query en lib/queries/course.ts, wrapped in cache()]
    → requireUser() [Verifica sesión]
    → assertCourseOwnerAccess() [Verifica rol/tenant]
    → db.course.findUnique() [Con SELECT específico]
    → Return course | null
  → Render form con datos
    → onChange → updateCourse() [Server Action]
```

### Webhook Externo (Ejemplo: Pago de Stripe)

```
Stripe → POST /api/webhooks/stripe [Route Handler]
  → Verificar firma de Stripe
  → Procesar evento (payment.success, etc.)
  → db.coursePayment.update()
  → eventActions.process() [Acciones secundarias: emisión de certificado, notificaciones]
  → Return 200 OK
```

## Abstracciones Principales

### Autorización Centralizada

Cada módulo que requiere permisos especiales tiene su propio módulo de `*-access.ts`:
- `manual-access.ts`: 3 círculos de acceso (autoría, revisión, cliente)
- `survey-access.ts`: solo administrador
- `course-access.ts`: propietario del curso o profesor colaborador
- `advisory-access.ts`: consultor o administrador

Todas siguen el mismo patrón: funciones `requireX()` que lanzan, funciones `isX()` que devuelven boolean, y funciones de contexto que cargan el recurso completo.

### Queries Cacheadas

Todas las queries públicas usan `cache()` de React:
```typescript
export const getCourseById = cache(async (id: string) => {
  return db.course.findUnique({ where: { id } });
});
```

Esto evita N+1 queries en el mismo render.

### Validación de Input

Todos los server actions usan Zod de `@prol/shared`:
```typescript
// @prol/shared/schemas.ts
export const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priceInCents: z.number().nonnegative(),
});

// apps/web/lib/actions/course.ts
export async function createCourse(formData: FormData) {
  const validated = createCourseSchema.parse(Object.fromEntries(formData));
  // ...
}
```

### Tenant Scoping

Todos los accesos protegidos verifican que el usuario pertenece al tenant del recurso:
```typescript
// En manual-access.ts, survey-access.ts, etc.
export function assertTenantScope(user: ManualUser, resourceTenantId: string): void {
  if (user.role === "SUPER_ADMIN") return; // Exento
  if (!user.tenantId || user.tenantId !== resourceTenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
}
```

---

*Arquitectura analizada: 2026-09-01*
