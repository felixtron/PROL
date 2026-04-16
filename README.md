# PROL

White-label SaaS LMS (Learning Management System) platform for course creators and educators.

**Production**: https://prol.prosuite.pro

---

## Documentacion

| Archivo | Contenido |
|---------|-----------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Proposito, stack tecnologico, arquitectura completa del monorepo |
| [LAUNCH_PLAN.md](./LAUNCH_PLAN.md) | Plan de lanzamiento por modulos y estado de cada uno |
| [DEPLOY.md](./DEPLOY.md) | Guia paso a paso de deploy al VPS |
| [CREDENTIALS.md](./CREDENTIALS.md) | Usuarios seed, acceso a servicios, procedimientos admin |

---

## Quick Start (desarrollo local)

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar .env (copiar de .env.example)
cp .env.example .env
# Generar BETTER_AUTH_SECRET: openssl rand -hex 32

# 3. Tunelar PostgreSQL del VPS (o levantar local con Docker)
ssh -f -N -L 5433:localhost:5433 panel-prosuite

# 4. Preparar DB + seed
DATABASE_URL="postgresql://prol:prol_dev_2026@localhost:5433/prol?schema=public" \
  pnpm --filter @prol/db exec prisma db push

DATABASE_URL="postgresql://prol:prol_dev_2026@localhost:5433/prol?schema=public" \
  pnpm --filter @prol/db exec prisma db seed

# 5. Arrancar dev server
pnpm dev
```

Abrir http://localhost:3000 y usar credenciales del seed (ver [CREDENTIALS.md](./CREDENTIALS.md)).

---

## Stack principal

- **Next.js 16** + React 19 + TypeScript
- **Prisma** ORM + PostgreSQL 16 + pgvector
- **Better Auth** (email/password)
- **Stripe Connect** (revenue sharing)
- **Cloudflare Stream** + **Vimeo URL** (video hosting)
- **Resend** (emails transaccionales)
- **Trigger.dev** (background jobs, opcional)
- **Claude API** + **AssemblyAI** (modulo AI opcional)
- **Turborepo** + **pnpm** (monorepo)

---

## Estructura del monorepo

```
PROL/
├── apps/
│   ├── web/          # Next.js app principal
│   └── worker/       # Background jobs (Trigger.dev)
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── ai/           # Claude + AssemblyAI wrappers
│   ├── content-factory/  # Pipelines de generacion IA
│   ├── email/        # Templates transaccionales (Resend)
│   ├── shared/       # Types, schemas Zod, utilidades
│   ├── ui/           # Component library compartido
│   ├── eslint-config/
│   └── typescript-config/
├── Dockerfile        # Multi-stage build para produccion
├── docker-compose.prod.yml
└── docker-compose.yml    # Dev local (PostgreSQL + pgvector)
```

---

## Modulos del producto

| # | Modulo | Estado |
|---|--------|--------|
| 0 | Infraestructura (DB, build, seed) | LISTO |
| 1 | Auth + Onboarding | LISTO |
| 2 | Catalogo + Inscripcion | LISTO |
| 3 | Profesor: gestion de cursos | LISTO |
| 4 | Pagos con Stripe | LISTO (requiere API keys) |
| 5 | Video (Cloudflare Stream + Vimeo URL) | LISTO |
| 6 | Certificados + Notificaciones + Emails | LISTO |
| 7 | Multi-Tenancy + Admin | LISTO |
| 8 | Workshops | LISTO |
| 9 | Deploy a produccion | LISTO (https://prol.prosuite.pro) |
| AI | Generacion de contenido con IA | ADICIONAL (gated por tenant.aiEnabled) |

---

## Scripts disponibles

```bash
pnpm dev            # Arrancar dev servers (web + worker)
pnpm build          # Build de todos los packages
pnpm check-types    # TypeScript check en todo el monorepo
pnpm lint           # ESLint
pnpm format         # Prettier
```

---

## Deploy

Ver [DEPLOY.md](./DEPLOY.md) para el procedimiento completo.

Para actualizar produccion despues de un push a GitHub:

```bash
ssh panel-prosuite
cd /opt/prol
git pull
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```
