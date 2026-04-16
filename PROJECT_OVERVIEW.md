# PROL - Project Overview

**Estado**: En produccion en https://prol.prosuite.pro

## Proposito

**PROL** es una **plataforma SaaS LMS (Learning Management System) white-label** disenada para creadores de cursos y educadores. Permite:

- **Creadores de cursos (Profesores)**: Construir, gestionar y monetizar cursos online
- **Estudiantes**: Inscribirse, aprender y obtener certificados
- **Administradores**: Gestionar multiples academias con marca propia (multi-tenant)
- **Generacion de contenido con IA**: Outlines de cursos, contenido de lecciones y transcripcion de video
- **Talleres/Workshops**: Programacion de eventos presenciales, virtuales e hibridos
- **Stripe Connect**: Revenue sharing entre creadores y la plataforma

---

## Stack Tecnologico

### Frontend & Web
| Tecnologia | Version | Uso |
|---|---|---|
| Next.js | 16.2.0 | Framework fullstack |
| React | 19.2.0 | UI library |
| TypeScript | 5.9.2 | Tipado estatico |
| Tailwind CSS | 4.1.0 | Estilos utilitarios |
| Lucide React | - | Iconos |
| @react-pdf/renderer | 4.3.2 | Generacion de PDFs (certificados) |

### Backend & Auth
| Tecnologia | Version | Uso |
|---|---|---|
| Next.js API Routes | - | API REST |
| Better Auth | 1.2.0 | Autenticacion (email/password, sesiones) |
| Prisma | 5.22.0 | ORM |
| PostgreSQL | 16 | Base de datos principal |
| pgvector | - | Extension para busqueda vectorial |

### IA & Contenido
| Tecnologia | Version | Uso |
|---|---|---|
| Anthropic Claude API | 0.30.0 | Generacion de contenido (claude-sonnet-4-5) |
| AssemblyAI | - | Transcripcion de audio/video |
| Zod | 3.24.0 | Validacion de schemas JSON |

### Pagos & Integraciones
| Tecnologia | Version | Uso |
|---|---|---|
| Stripe | 20.4.1 | Pagos + Stripe Connect (revenue sharing) |
| Resend | 4.1.2 | Emails transaccionales |
| Trigger.dev | 3.3.0 | Background jobs |
| Cloudflare Stream | - | Video hosting + CDN (opcion A, requiere API key) |
| Vimeo oEmbed | - | Video hosting via URL pegada (opcion B, sin API key) |

### Monorepo & Tooling
| Tecnologia | Version | Uso |
|---|---|---|
| Turborepo | 2.8.19 | Orquestacion del monorepo |
| pnpm | 9.0.0 | Package manager |
| ESLint | 9.39.1 | Linting |
| Prettier | 3.7.4 | Formateo de codigo |

---

## Arquitectura

### Estructura del Monorepo

```
PROL/
├── apps/
│   ├── web/                    # App principal Next.js
│   │   ├── app/                # App Router (rutas y paginas)
│   │   │   ├── admin/          # Panel de administracion
│   │   │   ├── api/            # API endpoints
│   │   │   ├── courses/        # Catalogo y detalle de cursos
│   │   │   ├── dashboard/      # Dashboard del estudiante
│   │   │   ├── professor/      # Dashboard del profesor
│   │   │   ├── onboarding/     # Onboarding de usuarios
│   │   │   ├── sign-in/        # Login
│   │   │   ├── sign-up/        # Registro
│   │   │   ├── verify/         # Verificacion de email
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── components/         # Componentes React
│   │   ├── lib/                # Logica de negocio
│   │   │   ├── actions/        # Server Actions (mutaciones)
│   │   │   ├── queries/        # Data fetching
│   │   │   └── auth.ts         # Configuracion de auth
│   │   └── middleware.ts       # Rate limiting, auth, tenants
│   │
│   └── worker/                 # Background jobs (Trigger.dev)
│
├── packages/
│   ├── db/                     # Prisma schema + utilidades
│   ├── ai/                     # Wrappers Claude API + AssemblyAI
│   ├── content-factory/        # Pipelines de generacion de contenido IA
│   ├── email/                  # Templates de email (Resend)
│   ├── shared/                 # Tipos, schemas Zod, constantes
│   ├── ui/                     # Component library (Button, Card, Avatar, Charts...)
│   ├── eslint-config/          # Config ESLint compartida
│   └── typescript-config/      # Config TypeScript compartida
│
├── docker-compose.yml          # PostgreSQL + pgvector local
├── turbo.json                  # Task orchestration
└── pnpm-workspace.yaml         # Workspace definition
```

### Decisiones Arquitectonicas Clave

1. **Multi-Tenancy**: Resolucion de tenant via subdominio (`academy.prol.pro`) o dominio custom
2. **Flujo de request**: Middleware -> Page/API -> Server Actions/Queries -> Database
3. **Server Actions**: React Server Components para mutaciones
4. **Rate Limiting**: En memoria con tracking por IP (20 req/min auth, 60 req/min API)
5. **RBAC**: Control de acceso basado en roles (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN)

---

## Modelo de Datos (Prisma)

### Identidad & Multi-Tenancy
- **Tenant** - Academia con marca (slug, dominio custom, colores, tasa de revenue share)
- **User** - Usuarios (roles: STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN)
- **Session** - Sesiones de Better Auth
- **Account** - Proveedores OAuth
- **Verification** - Tokens de verificacion y reset de password

### Contenido & Cursos
- **Course** - Curso (titulo, descripcion, precio, status: DRAFT/REVIEW/PUBLISHED/ARCHIVED)
- **Module** - Seccion/capitulo del curso
- **Lesson** - Leccion individual (tipos: VIDEO, TEXT, QUIZ, ASSIGNMENT)
- **Quiz** - Evaluacion (preguntas, puntuacion, intentos maximos)

### Aprendizaje & Progreso
- **Enrollment** - Inscripcion del estudiante (ACTIVE/COMPLETED/EXPIRED/REFUNDED)
- **LessonProgress** - Progreso por leccion (posicion de video, estado de completado)
- **QuizAttempt** - Intentos de quiz (respuestas, score, aprobado/reprobado)
- **Certificate** - Certificado de completado

### Contenido Interactivo
- **InteractiveStop** - Puntos de pausa en video (QUESTION, REFLECTION, EXERCISE, POLL)
- **InteractiveStopResponse** - Respuestas del estudiante

### Workshops & Eventos
- **Workshop** - Sesion programada (IN_PERSON, VIRTUAL, HYBRID)
- **WorkshopBooking** - Reservacion (CONFIRMED, WAITLISTED, CANCELLED)
- **WorkshopAttendance** - Check-in/check-out con feedback

### Pagos & Monetizacion
- **CoursePayment** - Registro de pago Stripe con desglose de revenue share

### Sistema
- **Notification** - Notificaciones in-app
- **AuditLog** - Audit trail inmutable
- **AIGenerationJob** - Tracking de generacion de contenido IA asincrono

---

## Funcionalidades

### Estudiante (`/dashboard/*`, `/courses/*`)
- Catalogo de cursos con busqueda y filtros
- Compra e inscripcion via Stripe
- Reproductor de video con tracking de progreso
- Aprendizaje interactivo (preguntas, reflexiones, ejercicios en video)
- Sistema de quizzes con calificacion automatica
- Tracking visual de progreso por curso y leccion
- Certificados automaticos al completar curso
- Notificaciones in-app
- Configuracion de perfil

### Profesor (`/professor/*`)
- Dashboard con estadisticas (estudiantes, ingresos, cursos activos, tasa de completado)
- Creacion de cursos manual o con IA
- Gestion de cursos (editar, modulos, lecciones, precios, publicar)
- Generacion de contenido con IA:
  - Outlines completos (modulos + lecciones)
  - Resumenes y transcripciones de video
  - Sugerencias de interactive stops
  - Enriquecimiento de cursos
- Upload de videos a Cloudflare Stream + transcripcion con AssemblyAI
- Alternativa: pegar URL de Vimeo (publico/unlisted) — validacion automatica via oEmbed, sin API keys
- Constructor de quizzes
- Gestion de workshops
- Gestion de estudiantes y progreso
- Dashboard de ingresos y payouts
- Onboarding de Stripe Connect

### Admin (`/admin/*`)
- Dashboard de analytics de la plataforma
- Gestion de tenants (crear, editar, pausar academias)
- Gestion de profesores
- Gestion de usuarios
- Tracking de revenue de la plataforma
- Configuracion general

### Autenticacion & Seguridad
- Registro/login con email y password
- Verificacion de email con token
- Reset de password self-service
- Onboarding de usuario nuevo (seleccion de rol, completar perfil)
- RBAC con 4 niveles de acceso
- Rate limiting por IP
- Headers de seguridad (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

### Multi-Tenancy
- Academias con marca propia (colores, logos, CSS, dominio)
- Aislamiento de datos por tenant ID
- Revenue sharing configurable (default 30% PROL / 70% creador)
- Trial y billing (TRIAL/ACTIVE/PAUSED/CHURNED)
- Emails con branding del tenant

---

## API Endpoints

| Ruta | Metodo | Proposito |
|---|---|---|
| `/api/auth/[...all]` | * | Rutas de Better Auth |
| `/api/auth/check-role` | GET | Verificar permisos de rol |
| `/api/interactive-stops/[lessonId]` | GET/POST | Respuestas de interactive stops |
| `/api/quiz/[lessonId]` | GET | Obtener preguntas de quiz |
| `/api/quiz/[lessonId]/answers` | POST | Enviar respuestas y calificar |
| `/api/quiz/professor/[lessonId]` | POST | Crear quiz (solo profesor) |
| `/api/upload` | POST | Upload de archivos/video |
| `/api/notifications` | GET | Obtener notificaciones |
| `/api/webhooks/stripe` | POST | Eventos de Stripe (pagos) |

---

## Server Actions Principales

### Cursos (`lib/actions/course.ts`)
- `createCourse()` - Crear curso
- `updateCourse()` - Editar curso
- `publishCourse()` - Publicar curso

### Video (`lib/actions/video.ts`)
- `uploadVideo()` - Upload a Cloudflare Stream
- `deleteVideo()` - Eliminar video
- `startTranscription()` - Iniciar transcripcion AssemblyAI

### Modulos/Lecciones (`lib/actions/module.ts`)
- `createModule()` - Agregar seccion
- `createLesson()` - Agregar leccion
- `updateLesson()` - Editar leccion

### Inscripciones (`lib/actions/enrollment.ts`)
- `enrollInCourse()` - Inscribir estudiante
- `completeLesson()` - Marcar leccion como completada
- `updateLessonProgress()` - Guardar posicion de video

### Pagos (`lib/actions/payment.ts`)
- `createCheckoutSession()` - Checkout de Stripe
- `createConnectOnboardingLink()` - Onboarding Stripe Connect
- `getConnectAccountStatus()` - Estado de cuenta de payout

### IA (`lib/actions/ai.ts`)
- `generateCourseOutline()` - Generar outline del curso
- `generateLessonContent()` - Generar resumen/contenido
- `enrichCourse()` - Sugerencias IA para mejorar curso

---

## Background Jobs (Trigger.dev)

| Job | Proposito |
|---|---|
| `sendWelcomeEmail` | Email de bienvenida al registrarse |
| `processVideoTranscription` | Transcribir videos con AssemblyAI |
| `generateCourseOutlineJob` | Generar estructura completa del curso |
| `generateLessonContentJob` | Generar contenido de lecciones |
| `calculateRevenue` | Calcular revenue share y payouts |

---

## Emails (Resend)

- Email de bienvenida
- Instrucciones de reset de password
- Confirmacion de inscripcion
- Recibos de pago
- Notificacion de certificado obtenido
- Recordatorios de workshops

Todos los templates estan en espanol con branding de PROL.

---

## Variables de Entorno

```
DATABASE_URL                    # PostgreSQL con pgvector
NEXT_PUBLIC_APP_URL             # URL de la app
NEXT_PUBLIC_DOMAIN              # Dominio base para subdominios
BETTER_AUTH_SECRET              # Clave de encriptacion de sesiones
STRIPE_SECRET_KEY               # API key de Stripe
STRIPE_WEBHOOK_SECRET           # Verificacion de webhooks
CLOUDFLARE_ACCOUNT_ID           # Video hosting
CLOUDFLARE_STREAM_API_TOKEN     # Token de upload
ANTHROPIC_API_KEY               # Claude API
ASSEMBLYAI_API_KEY              # Transcripcion de audio
RESEND_API_KEY                  # Envio de emails
TRIGGER_SECRET_KEY              # Auth de background jobs
```

---

## Desarrollo Local

```bash
# Levantar PostgreSQL con pgvector
docker compose up -d

# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm --filter @prol/db db:generate

# Ejecutar migraciones
pnpm --filter @prol/db db:push

# Seed de datos
pnpm --filter @prol/db db:seed

# Desarrollo
pnpm dev
```

---

## Integraciones

| Servicio | Proposito |
|---|---|
| Better Auth | Autenticacion y sesiones |
| Prisma + PostgreSQL | ORM y base de datos |
| Stripe Connect | Pagos y revenue sharing |
| Cloudflare Stream | Video hosting y CDN (con upload directo) |
| Vimeo (URL) | Video hosting via link pegado (oEmbed, sin API key) |
| AssemblyAI | Transcripcion de video/audio |
| Claude API (Anthropic) | Generacion de contenido IA |
| Resend | Emails transaccionales |
| Trigger.dev | Background jobs |
