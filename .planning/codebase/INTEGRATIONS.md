# Integraciones Externas

**Análisis:** 2026-09-01

## APIs & Servicios Externos

**Anthropic Claude:**
- Propósito: Generación de contenido y análisis de IA
- SDK: `@anthropic-ai/sdk@^0.30.0` (`/packages/ai/package.json`)
- Auth: `ANTHROPIC_API_KEY` (env var)
- Wrapper: `/packages/ai/src/claude.ts`
  - Singleton client con inicialización lazy
  - Funciones: `generateText(options)`, `generateJSON<S>(options & schema)`
  - Modelo por defecto: `claude-sonnet-4-5-20250929`
  - MaxTokens por defecto: 4096, temperatura: 0.7
  - Validación: Zod schema para respuestas JSON
- Usado por: Content factory, generación automatizada
- CSP: `https://api.anthropic.com` en `/apps/web/middleware.ts`

**Stripe (Pagos):**
- Propósito: Procesamiento de pagos y checkout
- SDK: `stripe@^20.4.1` (`/apps/web/package.json`)
- Auth: `STRIPE_SECRET_KEY` (env var), `STRIPE_WEBHOOK_SECRET` (para validación)
- Wrapper: `/apps/web/lib/stripe.ts`
  - Singleton client con globalThis caching
  - API version: `2026-02-25.clover`
  - TypeScript bindings habilitado
- Webhook handler: `/apps/web/app/api/webhooks/stripe/route.ts`
  - Verifica firma del evento con `webhooks.constructEvent()`
  - Procesa: `charge.succeeded`, `charge.failed`, etc.
  - Actualiza BD con estado de pago y triggers enrollment
- Usado por: `/apps/web/app/courses/[slug]/checkout-button.tsx`, settings Stripe Connect
- CSP: `https://api.stripe.com` en `/apps/web/middleware.ts`

**Resend (Email):**
- Propósito: Envío transaccional de emails
- SDK: `resend@^6.9.4` (web) / `^4.1.2` (email package)
- Auth: `RESEND_API_KEY`, `RESEND_DOMAIN` (env vars)
- Client: `/packages/email/src/client.ts`
  - Singleton con validación de clave en inicialización
  - Verifica `NODE_ENV` para caching (en dev = singleton global)
  - Deprecated: `/packages/email/package.json` es wrapper, usar web app directamente
- Templates: `/packages/email/src/` (React components compiladas a HTML)
- Usado por: Webhooks Stripe, enrollment, password resets
- Nota: Web app tiene versión 6.9.4 (más nueva que package email)

**Cloudflare Stream (Video):**
- Propósito: Hosting y entrega de videos
- SDK: API REST directo (no SDK npm)
- Auth: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN` (env vars)
- Client: `/apps/web/lib/cloudflare-stream.ts`
  - Endpoint base: `https://api.cloudflare.com/client/v4`
  - Funciones: `createDirectUploadUrl()`, `getVideoDetails(uid)`
  - Direct upload: maxDurationSeconds=21600 (6h), requireSignedURLs=false
- Usado por: Video lesson uploads, course content
- CSP: 
  - `https://upload.cloudflarestream.com` (upload endpoint)
  - `https://api.cloudflare.com` (API calls)
  - `https://*.cloudflarestream.com` (video delivery)
  - `https://videodelivery.net` (fallback CDN)

**AssemblyAI (Transcripción):**
- Propósito: Transcripción automática de videos
- Auth: `ASSEMBLYAI_API_KEY` (env var)
- Wrapper: `/apps/worker/src/jobs/process-video.ts`
  - Lógica: Submit video a AssemblyAI → poll status → retrieve transcript
- Usado por: Background jobs en Trigger.dev (post-upload)
- No es crítica: si no está configurada, la sección de transcripción aparece deshabilitada
- CSP: `https://api.assemblyai.com` en `/apps/web/middleware.ts`

**Better Auth (Autenticación):**
- Propósito: Session management, OAuth, account creation, password reset
- SDK: `better-auth@^1.2.0` (`/apps/web/package.json`)
- Auth: `BETTER_AUTH_SECRET` (env var, ≥32 caracteres)
- Configuración: `/apps/web/lib/auth.ts`
  - Adapter: Prisma PostgreSQL
  - Base URL: `NEXT_PUBLIC_APP_URL`
  - Trusted origins: apex domain + subdomains (multi-tenant)
  - Plugins:
    - **Cloudflare Turnstile** (captcha) — protege sign-up, sign-in, password reset
      - Secret key: `TURNSTILE_WEBHOOK_SECRET` (env var)
      - Solo se activa si env var presente
      - Cliente envía token en header `x-captcha-response`
    - **nextCookies()** — gestiona cookies del lado del servidor
  - OAuth providers:
    - **Google** (opcional, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
      - `accessType: "offline"` + `prompt: "select_account consent"`
      - `disableSignUp: true` — No crea usuarios vía Google, solo integración de Meet
      - Requiere refresh_token para Meet API calls
  - Database hooks: Auto-asigna tenant por subdominio en creación de usuario (B2C)
- Rutas: `/apps/web/app/api/auth/[...all]/route.ts` (handler universal)
- Middleware: `/apps/web/middleware.ts`
  - Valida sesión: `better-auth.session_token` (dev/HTTP) o `__Secure-better-auth.session_token` (prod/HTTPS)
  - Protege rutas: `/dashboard`, `/professor`, `/admin`, `/tenant-admin`, `/preview`
- Cookies: Better Auth maneja automáticamente (seguras, HttpOnly, SameSite)

**Cloudflare Turnstile (Captcha):**
- Propósito: Bot protection en auth flows
- SDK: Plugin integrado en Better Auth
- Auth: `TURNSTILE_SITE_KEY` (client-side), `TURNSTILE_SECRET_KEY` (server-side)
- Usado por: Sign-up, sign-in, password reset (automático vía Better Auth)
- Configuración: `/apps/web/lib/auth.ts` (condicional)
- CSP: `https://challenges.cloudflare.com`

**Google Calendar / Meet (Integración):**
- Propósito: Crear eventos de Meet en calendario del tenant
- SDK: OAuth2 flow vía Better Auth (no SDK npm)
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (env vars)
- Configuración: `/apps/web/lib/auth.ts`
  - Basado en disponibilidad de credenciales
  - NO es método de login (disableSignUp: true)
  - Requiere offline access para refresh_token
- Implementación: `/apps/web/lib/google-calendar.ts`
  - Checa si está configurada: `isGoogleIntegrationConfigured()`
  - Gestiona autenticación, creación de eventos
- Usado por: `/apps/web/app/tenant-admin/settings/google-meet-section.tsx`
  - Interfaz para vincular cuenta Google
- Estado: Deshabilitado si sin credenciales (no es crítico)

## Almacenamiento de Datos

**Base de datos:**
- **PostgreSQL** (conexión vía `DATABASE_URL`)
  - Client: Prisma ORM
  - Schema: `/packages/db/prisma/schema.prisma` (107 KB, single source of truth)
  - **SIN migraciones**: usa `prisma db push` (despliegue directo)
  - Seeds: `/packages/db/prisma/seed.ts` — datos iniciales
  - No soporta cambios destructivos — solo aditivos

**Almacenamiento de archivos (público):**
- Sistema: Filesystem local (volumen persistente en prod)
- Path: `UPLOAD_DIR` env var o fallback `./public/uploads`
- Rutas HTTP: `/apps/web/app/uploads/[...path]/route.ts` (NO requiere autenticación)
- Tipos soportados: PNG, JPEG, GIF, WebP, SVG, PDF, TXT, Markdown, DOCX, XLSX, PPTX, ZIP
- Ejemplos: Course thumbnails, lesson PDFs, downloadable materials
- Path traversal: Bloqueado (rechaza `..` en segmentos)
- MIME mapping: `/apps/web/app/uploads/[...path]/route.ts` (líneas 11-25)

**Almacenamiento de archivos (confidencial):**
- Sistema: Filesystem separado (fuera de `public/`)
- Path: `PRIVATE_UPLOAD_DIR` env var o fallback `./private-uploads`
- Rutas HTTP: `/apps/web/app/files/evidence/[id]/route.ts`, `/apps/web/app/files/manual-document/[id]/route.ts`
- **REQUIERE autenticación**: valida contra DB antes de servir byte
- Ejemplos: Evidencias de cumplimiento, plantillas documentales de empresa
- Autorización: Personal del tenant + miembros de empresa propietaria
- Archivo eliminado logicamente: deja de descargarse aunque archivo persista en disco
- **Lógica de protección**: `/apps/web/app/files/evidence/[id]/route.ts` (líneas 25-49)
  - Checa `requireUser()`
  - Valida tenant contra BD
  - Verifica role: SUPER_ADMIN, tenant personal, o company member

**Cache:**
- Estrategia: Next.js default (revalidation en rutas dinámicas)
- No detectado: Servicio de cache centralizado (Redis, Memcached)

## Autenticación & Identidad

**Provider primario:** Better Auth (sesiones locales + OAuth)
**Provider de identidad social:** Google OAuth (opcional, solo Meet integration)
**Método de signup:** Email/password (required) o invitación

## Monitoreo & Observabilidad

**Error tracking:** No detectado en codebase
**Logging:** 
- Estrategia: `console` con JSON structured logging
- Ejemplo: `/apps/web/app/api/webhooks/stripe/route.ts` usa `createLogger("stripe-webhook")`
- Acceso: stdout/stderr de contenedor

## CI/CD & Deployment

**Hosting:** Docker container en VPS
- Cwd production: `/app/apps/web`
- Build: `next build` (standalone bundle)
- Runtime: `next start`
- Env: `/opt/prol/.env` (aplicado vía SSH en VPS)

**CI Pipeline:** No detectado (probablemente GitHub Actions o manual)

## Configuración de Entorno

**Archivo de configuración:**
- `.env` (desarrollo) / `/opt/prol/.env` (producción)
- No tracked en git (`.gitignore`)

**Variables críticas (aplicación arranca sin ellas → error):**
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://prol.prosuite.pro
NEXT_PUBLIC_DOMAIN=prosuite.pro
BETTER_AUTH_SECRET=<32+ caracteres aleatorios>
```

**Variables condicionales (característica deshabilitada si falta):**
```
ANTHROPIC_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_STREAM_API_TOKEN=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_DOMAIN=no-reply@prol.prosuite.pro
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

**Variables de infraestructura:**
```
UPLOAD_DIR=/data/uploads              # Público
PRIVATE_UPLOAD_DIR=/data/private      # Confidencial
CRON_SECRET=<random>                  # Job scheduling
WORKSHOP_TIME_ZONE=America/Bogota      # o tu zona
SEED_FORCE=false                       # Force DB seeding
```

**Ubicación de validación:** `/apps/web/lib/env.ts`
- Función: `assertCriticalServerEnv()`
- Invocada en: `/apps/web/lib/auth.ts` (first import en app)
- Comportamiento:
  - Prod: Lanza excepción si falta variable crítica
  - Dev: Aviso en console, app sigue funcionando
  - Build time: Se salta (NEXT_PHASE=phase-production-build)

## Webhooks & Callbacks

**Incoming (Stripe → App):**
- Endpoint: `/apps/web/app/api/webhooks/stripe/route.ts`
- Eventos procesados: `charge.succeeded`, `charge.failed`, etc.
- Validación: Firma HMAC con `STRIPE_WEBHOOK_SECRET`
- Rate limit: Especial (fuera de `/api` para evitar throttle)

**Outgoing (App → servicios externos):**
- Stripe Payments: Charge creation via SDK
- Resend Emails: Transactional emails via SDK
- Cloudflare Stream: Direct upload URLs via REST API
- AssemblyAI: Transcription requests via SDK (worker)
- Google Calendar: Event creation via OAuth tokens (web app)
- Anthropic: Prompt submission via SDK

---

*Auditoría de integraciones: 2026-09-01*
