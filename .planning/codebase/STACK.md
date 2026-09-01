# Technology Stack

**Análisis:** 2026-09-01

## Lenguajes

**Primario:**
- **TypeScript** `5.9.2` — Todo el codebase: `/apps/web`, `/apps/worker`, `/packages/*`

**Secundario:**
- **JavaScript** — Configuración y scripts auxiliares (Turbo, Prettier, etc.)

## Runtime

**Entorno:**
- **Node.js** `>=18` — Runtime de desarrollo y producción (especificado en `/package.json`)

**Gestor de paquetes:**
- **pnpm** `9.0.0` — Monorepo package manager (especificado en `/package.json`)
- Lockfile: `pnpm-lock.yaml` presente

## Frameworks

**Core:**
- **Next.js** `16.2.0` — Web app (`/apps/web/package.json`): SSR, API routes, file serving, middleware
- **React** `^19.2.0` — UI library (`/apps/web/package.json`)
- **React DOM** `^19.2.0` — DOM renderer

**Estilos:**
- **Tailwind CSS** `^4.1.0` — Utility-first CSS framework (`/apps/web/package.json`)
- **@tailwindcss/postcss** `^4.1.0` — PostCSS plugin (`/apps/web/package.json`)
- **tailwind-merge** `^2.6.0` — Merge Tailwind classes conflict-free (`/apps/web/package.json`)

**Base de datos:**
- **Prisma** `^5.22.0` — ORM PostgreSQL (`/packages/db/package.json`)
  - Client: `@prisma/client@^5.22.0`
  - **NO tiene directorio de migraciones**: usa `prisma db push` (despliegue directo de esquema)
  - Schema: `/packages/db/prisma/schema.prisma` (107 KB)
  - Seeds: `/packages/db/prisma/seed.ts` (39 KB)

**Testing & Build:**
- **TypeScript Compiler** `5.9.2` — Type checking y compilación
- **tsx** `^4.19.0` — TypeScript executor (`/packages/db/package.json`, `/apps/worker/package.json`)

**Herramientas de desarrollo:**
- **Turbo** `^2.8.19` — Monorepo build orchestration (`/turbo.json`)
- **Prettier** `^3.7.4` — Code formatter
- **ESLint** `^9.39.1` — Linting (`/apps/web/package.json`)

## Dependencias Críticas

**Autenticación:**
- **better-auth** `^1.2.0` — Auth framework con sesiones, OAuth, captcha (`/apps/web/package.json`)
  - Adapter: Prisma
  - Plugins: Cloudflare Turnstile (captcha), Google OAuth
  - Configuración: `/apps/web/lib/auth.ts`

**Pagos:**
- **stripe** `^20.4.1` — Payment processing (`/apps/web/package.json`)
  - API version: `2026-02-25.clover`
  - Client wrapper: `/apps/web/lib/stripe.ts`
  - Webhook handler: `/apps/web/app/api/webhooks/stripe/route.ts`

**Email:**
- **resend** `^6.9.4` (web) / `^4.1.2` (email package) — Email delivery
  - Web app usa versión más nueva: `/apps/web/package.json`
  - Email package (deprecated): `/packages/email/package.json`
  - Client: `/packages/email/src/client.ts` (singleton con validación `RESEND_API_KEY`)

**IA & Procesamiento:**
- **@anthropic-ai/sdk** `^0.30.0` — Claude API (`/packages/ai/package.json`)
  - Model por defecto: `claude-sonnet-4-5-20250929` (en `/packages/ai/src/claude.ts`)
  - Funciones: `generateText()`, `generateJSON<T>()` con validación Zod
  - Client: `/packages/ai/src/claude.ts`

**Validación:**
- **zod** `^3.24.0` — Schema validation y parsing (usado en `@prol/ai`, `@prol/content-factory`, `@prol/shared`)
  - Validación de env críticas: `/apps/web/lib/env.ts` (DATABASE_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_DOMAIN, BETTER_AUTH_SECRET)

**PDF & Documentos:**
- **@react-pdf/renderer** `^4.3.2` — PDF generation (React components → PDF)
- **sanitize-html** `^2.17.7` — HTML sanitization (user-generated content)
- **mammoth** `^1.12.0` — DOCX → HTML conversion
- **pdf-parse** `^2.4.5` — PDF text extraction

**UI & Utilities:**
- **lucide-react** `^0.468.0` — Icon library
- **clsx** `^2.1.1` — Conditional CSS class builder

**CSV & QR:**
- **papaparse** `^5.5.3` — CSV parsing
- **qrcode** `^1.5.4` — QR code generation

**Job Queue:**
- **@trigger.dev/sdk** `^3.3.0` — Background job scheduling (`/apps/worker/package.json`)
  - Configuración del worker: `/apps/worker/src/`
  - Usado para: procesamiento de videos, generación de transcripciones

## Configuración

**Entorno:**
- Variables críticas (producción lanza error):
  - `DATABASE_URL` — PostgreSQL connection
  - `NEXT_PUBLIC_APP_URL` — Base URL del app (p.ej. `https://prol.prosuite.pro`)
  - `NEXT_PUBLIC_DOMAIN` — Apex domain (p.ej. `prosuite.pro`)
  - `BETTER_AUTH_SECRET` — Auth session encryption (≥32 caracteres)

- Variables condicionales (gateadas por feature flags o módulo):
  - `ANTHROPIC_API_KEY` — Claude API
  - `ASSEMBLYAI_API_KEY` — Video transcription
  - `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN` — Video hosting
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Payment processing
  - `RESEND_API_KEY`, `RESEND_DOMAIN` — Email delivery
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Meet integration
  - `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — Captcha
  - `UPLOAD_DIR`, `PRIVATE_UPLOAD_DIR` — File storage paths
  - `CRON_SECRET` — Job scheduling security
  - `WORKSHOP_TIME_ZONE` — Event timezone
  - `SEED_FORCE` — Database seeding

- Definición formal: `/apps/web/lib/env.ts`
  - En producción: `assertCriticalServerEnv()` lanza error si falta algo crítico
  - En desarrollo: solo avisa en console

**Globales (Turbo):**
- Variables compartidas en `/turbo.json` bajo `globalEnv`: reutilizadas en todos los tasks para invalidar cache

**Build:**
- TypeScript config: `/packages/typescript-config/` (workspace shared)
- ESLint config: `/packages/eslint-config/` (workspace shared)
- Prettier: `.prettierrc` (global)

## Requisitos de Plataforma

**Desarrollo:**
- Node.js ≥18
- pnpm 9.0.0+
- PostgreSQL (local o remoto)

**Producción:**
- Node.js ≥18
- PostgreSQL 12+
- Volúmenes persistentes:
  - `UPLOAD_DIR` — Archivos públicos (thumbnails, PDFs, etc.)
  - `PRIVATE_UPLOAD_DIR` — Archivos confidenciales (evidencias, templates)
  - Fallback en dev: `./public/uploads` y `./private-uploads`

**Infraestructura externa (requerida):**
- PostgreSQL database
- Stripe (pagos)
- Better Auth + Cloudflare Turnstile (auth)
- Anthropic Claude API (IA)
- Resend (email)

**Infraestructura externa (opcional):**
- Cloudflare Stream (video hosting; fallback a Vimeo/YouTube)
- AssemblyAI (transcription; puede ser async sin bloqueo)
- Google Calendar API (Meet integraciones; deshabilitado si sin credenciales)

---

*Análisis de stack: 2026-09-01*
