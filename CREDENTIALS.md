# PROL - Credenciales y Procedimientos Admin

> ATENCION: este archivo contiene credenciales del seed de desarrollo. El repo es privado.
> Las passwords del seed son conocidas y deben cambiarse en produccion real.

---

## Usuarios del Seed

Presentes tanto en la DB de **dev** como en **produccion** (https://prol.prosuite.pro).

| Rol | Email | Password | Redirect despues de login |
|-----|-------|----------|---------------------------|
| SUPER_ADMIN | `super@prol.prosuite.pro` | `password123` | `/admin` |
| ADMIN | `admin@prol.prosuite.pro` | `password123` | `/admin` |
| PROFESSOR | `maria.garcia@academiadigitalmx.com` | `password123` | `/professor` |
| STUDENT | `carlos.mendoza@gmail.com` | `password123` | `/dashboard` (curso al 65%) |
| STUDENT | `ana.rodriguez@outlook.com` | `password123` | `/dashboard` (curso completado + certificado) |

### Datos demo asociados

- **1 tenant**: Academia Digital MX (`aiEnabled: true`, revenue share 30%)
- **3 cursos**:
  - Marketing Digital Avanzado ($14.99 USD, publicado, 3 modulos / 24 lecciones)
  - Copywriting para Ventas ($9.99 USD, publicado, 3 modulos / 18 lecciones)
  - Diseno UX/UI para Principiantes (draft, 2 modulos / 8 lecciones)
- **50 lecciones** totales
- **4 inscripciones** activas con progreso real
- **4 pagos** COMPLETED ($4996 MXN total, con revenue share ya calculado)
- **1 certificado** emitido (Ana completo Marketing Digital)
- **1 workshop**: Taller Presencial Facebook Ads (scheduled)
- **2 notificaciones** para la profesora

---

## Acceso al VPS

```bash
ssh panel-prosuite
```

Host alias configurado en `~/.ssh/config`. IP: `66.29.152.229` (Debian 12, Dokploy).

### Recursos en el VPS

| Path | Descripcion |
|------|-------------|
| `/opt/prol/` | Codigo de produccion clonado desde GitHub (deploy key read-only) |
| `/opt/prol/.env` | Variables de entorno de produccion (chmod 600, no en git) |
| `/etc/dokploy/traefik/traefik.yml` | Configuracion de Traefik (gestionada por Dokploy) |

### Containers de produccion (docker-compose.prod.yml)

| Container | Imagen | Puerto interno | Red |
|-----------|--------|----------------|-----|
| `prol-web-1` | prol-web (local build) | 3000 | prol_prol-internal + dokploy-network |
| `prol-db-1` | pgvector/pgvector:pg16 | 5432 | prol_prol-internal |

### Container de dev (docker-compose.yml, separado)

| Container | Imagen | Puerto host | Uso |
|-----------|--------|-------------|-----|
| `prol-db` | pgvector/pgvector:pg16 | 5433 | DB de desarrollo, accesible via SSH tunnel |

### SSH tunnel para desarrollo

```bash
ssh -f -N -L 5433:localhost:5433 panel-prosuite
# Ahora localhost:5433 apunta a la DB de dev en el VPS
```

---

## GitHub

- **Repo**: https://github.com/felixtron/PROL (privado)
- **Deploy key** (read-only): instalada en el VPS, ID `148724265`
- **SSH key del VPS**: `~/.ssh/prol_deploy_key` (solo para clone/pull del repo)

### Flujo de deploy

```bash
# Local
git push

# VPS
ssh panel-prosuite
cd /opt/prol
git pull                                                # usa deploy key automaticamente
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
docker compose -f docker-compose.prod.yml logs -f web   # verificar que arranca OK
```

---

## Variables de entorno de produccion

Archivo: `/opt/prol/.env` (chmod 600, no en git).

Ya configuradas:
- `APP_URL`, `APP_DOMAIN`, `APP_DOMAIN_REGEX`
- `DB_USER`, `DB_PASSWORD` (generado con `openssl rand -base64 24`)
- `DB_NAME`
- `BETTER_AUTH_SECRET` (generado con `openssl rand -hex 32`, 64 chars)

Pendientes (app funciona pero algunas features requeriran estas keys):

| Variable | Necesaria para | Donde obtener |
|----------|----------------|---------------|
| `STRIPE_PUBLISHABLE_KEY` | Checkout de cursos | dashboard.stripe.com |
| `STRIPE_SECRET_KEY` | Server-side Stripe ops | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Verificar webhooks | dashboard.stripe.com/webhooks |
| `CLOUDFLARE_ACCOUNT_ID` | Upload de video | dash.cloudflare.com |
| `CLOUDFLARE_STREAM_API_TOKEN` | Upload de video | Crear token con scope Stream:Edit |
| `RESEND_API_KEY` | Emails transaccionales | resend.com/api-keys |
| `RESEND_DOMAIN` | Dominio verificado de envio | Configurar en Resend |
| `ANTHROPIC_API_KEY` | Modulo AI (opcional) | console.anthropic.com |
| `ASSEMBLYAI_API_KEY` | Transcripcion de video (opcional) | assemblyai.com |
| `TRIGGER_SECRET_KEY` | Background jobs (opcional) | cloud.trigger.dev |

### Como actualizar variables

```bash
ssh panel-prosuite "nano /opt/prol/.env"
# Luego reiniciar solo el web container:
ssh panel-prosuite "cd /opt/prol && docker compose -f docker-compose.prod.yml up -d web"
```

---

## Procedimientos admin comunes

### Crear tu propio super admin (borrando los del seed)

```bash
# 1. Registrate en https://prol.prosuite.pro/sign-up con tu email real

# 2. Promoverte a SUPER_ADMIN
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db \
  psql -U prol -d prol -c \"UPDATE users SET role='SUPER_ADMIN' WHERE email='tu@email.com';\""

# 3. (Opcional) Borrar los super admin del seed
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db \
  psql -U prol -d prol -c \"DELETE FROM users WHERE email IN ('super@prol.prosuite.pro', 'admin@prol.prosuite.pro');\""
```

### Ver todos los usuarios

```bash
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db \
  psql -U prol -d prol -c 'SELECT email, name, role, \"createdAt\" FROM users ORDER BY role;'"
```

### Promover usuario existente

```bash
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db \
  psql -U prol -d prol -c \"UPDATE users SET role='PROFESSOR' WHERE email='usuario@ejemplo.com';\""
```

### Backup de la DB

```bash
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db \
  pg_dump -U prol prol" > backup_$(date +%Y%m%d).sql
```

### Restaurar backup

```bash
cat backup_YYYYMMDD.sql | ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec -T db psql -U prol -d prol"
```

### Abrir psql interactivo

```bash
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml exec db psql -U prol -d prol"
```

### Ver logs de la app

```bash
ssh panel-prosuite "docker compose -f /opt/prol/docker-compose.prod.yml logs -f web"
```

### Reiniciar servicios

```bash
# Solo web
ssh panel-prosuite "cd /opt/prol && docker compose -f docker-compose.prod.yml restart web"

# Todo
ssh panel-prosuite "cd /opt/prol && docker compose -f docker-compose.prod.yml restart"
```

---

## Aplicar cambios de schema en produccion

Cuando cambies `packages/db/prisma/schema.prisma`:

```bash
# 1. Push a GitHub desde local
git add packages/db/prisma/schema.prisma
git commit -m "schema: describe cambio"
git push

# 2. En el VPS, pull + aplicar schema
ssh panel-prosuite
cd /opt/prol
git pull

# 3. Aplicar el cambio a la DB de produccion
set -a; . .env; set +a
docker run --rm --network prol_prol-internal -v /opt/prol/packages/db:/work -w /work \
  -e DATABASE_URL="postgresql://prol:${DB_PASSWORD}@db:5432/prol?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl libc6-compat >/dev/null && \
    npx -y prisma@5.22.0 db push --skip-generate"

# 4. Rebuild + redeploy de la app (incluye nuevo Prisma client)
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

---

## Stripe Webhook (cuando configures Stripe)

1. Obtener `STRIPE_SECRET_KEY` de https://dashboard.stripe.com/apikeys
2. Crear webhook endpoint en https://dashboard.stripe.com/webhooks:
   - URL: `https://prol.prosuite.pro/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `checkout.session.expired`
3. Copiar el `Signing secret` a `/opt/prol/.env` como `STRIPE_WEBHOOK_SECRET`
4. Reiniciar: `docker compose -f docker-compose.prod.yml restart web`

---

## DNS

Configurado en el panel del proveedor de DNS de `prosuite.pro`:

| Tipo | Host | Destino | Proposito |
|------|------|---------|-----------|
| A | prol | 66.29.152.229 | Dominio principal |
| A | *.prol (pendiente) | 66.29.152.229 | Wildcard para subdominios de tenant |

Traefik v3 ya esta configurado para servir `prol.prosuite.pro` y cualquier subdominio `<tenant>.prol.prosuite.pro` en el mismo contenedor web.
