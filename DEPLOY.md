# PROL - Deployment Guide (VPS with Dokploy + Traefik)

## Prerequisitos en el VPS

- Docker + Docker Compose
- Traefik corriendo (ya instalado via Dokploy, red `dokploy-network`)
- Certificado Let's Encrypt habilitado en Traefik con resolver `letsencrypt`
- Puerto 80 y 443 expuestos

## 1. Clonar el repositorio en el VPS

```bash
ssh panel-prosuite
sudo mkdir -p /opt/prol
sudo chown $USER:$USER /opt/prol
cd /opt/prol
git clone https://github.com/felixtron/PROL.git .
```

## 2. Configurar variables de entorno

```bash
cp .env.production.example .env
nano .env
```

Llena los valores:
- `DB_PASSWORD`: Password fuerte (ej: `openssl rand -base64 24`)
- `BETTER_AUTH_SECRET`: `openssl rand -hex 32`
- `APP_URL` y `APP_DOMAIN`: `prol.prosuite.pro`
- `STRIPE_*`: Obtener de dashboard.stripe.com
- `RESEND_API_KEY`: resend.com/api-keys
- (Opcional) `CLOUDFLARE_*` para video hosting
- (Opcional) `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY` para módulo AI

## 3. DNS

Configura en tu panel DNS:
```
A     prol.prosuite.pro           → <IP_DEL_VPS>
A     *.prol.prosuite.pro          → <IP_DEL_VPS>   (wildcard para tenants)
```

## 4. Build + Deploy

```bash
cd /opt/prol
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## 5. Inicializar la base de datos

La primera vez necesitas crear las tablas:

```bash
docker compose -f docker-compose.prod.yml exec web sh -c "cd /app && node -e \"require('child_process').execSync('pnpm --filter @prol/db exec prisma db push', { stdio: 'inherit' })\""
```

O más simple, ejecutar el push desde el builder:

```bash
docker compose -f docker-compose.prod.yml run --rm web sh -c "cd packages/db && npx prisma db push --skip-generate"
```

Opcional (seed con datos de demo):

```bash
docker compose -f docker-compose.prod.yml run --rm web sh -c "cd packages/db && npx prisma db seed"
```

## 6. Configurar webhook de Stripe

En el dashboard de Stripe:
1. Ir a Developers → Webhooks
2. Crear endpoint: `https://prol.prosuite.pro/api/webhooks/stripe`
3. Seleccionar eventos: `checkout.session.completed`, `checkout.session.expired`
4. Copiar el `Signing secret` al `.env` como `STRIPE_WEBHOOK_SECRET`
5. Reiniciar: `docker compose -f docker-compose.prod.yml restart web`

## 7. Verificar

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
```

Abrir `https://prol.prosuite.pro` — deberías ver la landing page.

## Updates

Para desplegar cambios del repositorio:

```bash
cd /opt/prol
git pull
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

## Rollback

```bash
git reset --hard <commit_anterior>
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

## Comandos útiles

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f web

# Abrir shell en el container web
docker compose -f docker-compose.prod.yml exec web sh

# Abrir psql en la DB
docker compose -f docker-compose.prod.yml exec db psql -U prol -d prol

# Backup de la DB
docker compose -f docker-compose.prod.yml exec db pg_dump -U prol prol > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_XXXX.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U prol -d prol
```
