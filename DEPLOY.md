# PROL - Deployment Guide

Estado actual: **Desplegado en produccion en https://prol.prosuite.pro**

Este documento es referencia para:
1. Entender como se hizo el deploy inicial
2. Hacer re-deploys o aplicar cambios
3. Replicar el setup en otro VPS

---

## Arquitectura de produccion

```
Internet (HTTPS)
    |
    v
Cloudflare/DNS (prol.prosuite.pro → 66.29.152.229)
    |
    v
Traefik v3 (puerto 443, SSL Let's Encrypt automatico, red swarm dokploy-network)
    |
    v
prol-web-1 (Next.js 16 standalone, puerto 3000, red prol_prol-internal)
    |
    v
prol-db-1 (PostgreSQL 16 + pgvector, puerto 5432 solo interno)
```

---

## Prerequisitos en el VPS

- Docker + Docker Compose
- Traefik corriendo (ya instalado via Dokploy, red `dokploy-network` attachable)
- Let's Encrypt habilitado con resolver `letsencrypt` en Traefik
- Puertos 80 y 443 expuestos
- Deploy key SSH registrada en el repo privado de GitHub

---

## Setup inicial (ya realizado)

### 1. Clonar el repo con deploy key

```bash
ssh panel-prosuite

# Generar deploy key
ssh-keygen -t ed25519 -N '' -f ~/.ssh/prol_deploy_key -C 'prol-deploy@vps'

# Registrar la public key en GitHub (desde maquina local con gh CLI):
#   gh repo deploy-key add -R felixtron/PROL -t "VPS" pub_key_file

# SSH config para usar la key
cat >> ~/.ssh/config << 'EOF'
Host github.com-prol
  HostName github.com
  User git
  IdentityFile ~/.ssh/prol_deploy_key
  IdentitiesOnly yes
EOF

# Clonar
sudo mkdir -p /opt && sudo chown $USER:$USER /opt
cd /opt
GIT_SSH_COMMAND='ssh -i ~/.ssh/prol_deploy_key' git clone git@github.com:felixtron/PROL.git prol
cd prol
git config core.sshCommand "ssh -i ~/.ssh/prol_deploy_key"
```

### 2. Configurar `.env` de produccion

```bash
cd /opt/prol
DB_PWD=$(openssl rand -base64 24 | tr -d '/+=')
AUTH_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
APP_URL="https://prol.prosuite.pro"
APP_DOMAIN="prol.prosuite.pro"
APP_DOMAIN_REGEX="prol\\.prosuite\\.pro"

DB_USER="prol"
DB_PASSWORD="$DB_PWD"
DB_NAME="prol"

BETTER_AUTH_SECRET="$AUTH_SECRET"

# API keys - llenar cuando tengas cuentas de servicios externos
STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_STREAM_API_TOKEN=""
RESEND_API_KEY=""
RESEND_DOMAIN="prosuite.pro"
ANTHROPIC_API_KEY=""
ASSEMBLYAI_API_KEY=""
TRIGGER_SECRET_KEY=""
EOF

chmod 600 .env
```

### 3. DNS

```
A     prol.prosuite.pro       →  66.29.152.229
A     *.prol.prosuite.pro      →  66.29.152.229   (wildcard para tenants)
```

### 4. Build + levantar containers

```bash
cd /opt/prol
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
```

### 5. Aplicar schema a la DB

La DB se crea vacia. Hay que aplicar el schema de Prisma:

```bash
cd /opt/prol
set -a; . .env; set +a

# Habilitar pgvector
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U prol -d prol -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Push del schema
docker run --rm --network prol_prol-internal -v /opt/prol/packages/db:/work -w /work \
  -e DATABASE_URL="postgresql://prol:${DB_PASSWORD}@db:5432/prol?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl libc6-compat >/dev/null && \
    npx -y prisma@5.22.0 db push --skip-generate"
```

### 6. (Opcional) Seed con datos demo

```bash
cd /opt/prol
set -a; . .env; set +a

docker run --rm --network prol_prol-internal -v /opt/prol:/work -w /work/packages/db \
  -e DATABASE_URL="postgresql://prol:${DB_PASSWORD}@db:5432/prol?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl libc6-compat >/dev/null && \
    corepack enable >/dev/null && corepack prepare pnpm@9.0.0 --activate >/dev/null && \
    cd /work && pnpm install --frozen-lockfile --filter=@prol/db... --ignore-scripts >/dev/null && \
    cd packages/db && npx -y prisma@5.22.0 generate >/dev/null && \
    npx -y tsx@4.19.0 prisma/seed.ts"
```

El seed crea 5 usuarios, 3 cursos, 50 lecciones, etc. (ver [CREDENTIALS.md](./CREDENTIALS.md)).

### 7. Verificar

```bash
# Ver status de containers
docker compose -f docker-compose.prod.yml ps

# Probar HTTPS desde fuera
curl -I https://prol.prosuite.pro

# Logs
docker compose -f docker-compose.prod.yml logs -f web
```

---

## Re-deploy (cambios de codigo)

```bash
# En local
git push

# En VPS
ssh panel-prosuite
cd /opt/prol
git pull
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
docker compose -f docker-compose.prod.yml logs -f web   # Verificar
```

## Re-deploy con cambio de schema

Ver seccion "Aplicar cambios de schema en produccion" en [CREDENTIALS.md](./CREDENTIALS.md).

---

## Rollback

```bash
cd /opt/prol
git log --oneline | head -10          # Ver commits recientes
git reset --hard <commit_hash>
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

---

## Comandos utiles

```bash
# Ver logs de web
docker compose -f docker-compose.prod.yml logs -f web

# Ver logs de DB
docker compose -f docker-compose.prod.yml logs -f db

# Abrir shell en el container web
docker compose -f docker-compose.prod.yml exec web sh

# Abrir psql en la DB
docker compose -f docker-compose.prod.yml exec db psql -U prol -d prol

# Backup de DB
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U prol prol > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_YYYYMMDD.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U prol -d prol

# Reiniciar solo web (sin tocar DB)
docker compose -f docker-compose.prod.yml restart web

# Bajar todo
docker compose -f docker-compose.prod.yml down

# Bajar + eliminar DATA (destructivo!)
docker compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

### App no responde pero containers estan up

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs web --tail 50

# Testear desde dentro del container
docker exec prol-web-1 wget -qO- http://127.0.0.1:3000/ | head -20
```

### Traefik no enruta al container

```bash
# Verificar que el container esta en dokploy-network
docker inspect prol-web-1 | grep -A5 Networks

# Ver labels de Traefik
docker inspect prol-web-1 | grep -A20 Labels

# Ver logs de Traefik
docker service logs dokploy-traefik --tail 50
```

### Build falla con ENOTEMPTY

Eliminar `.next` en el builder (el volumen local no es el del container, es transient):

```bash
docker compose -f docker-compose.prod.yml build --no-cache web
```

### Prisma error "Could not parse schema engine response"

Instalar OpenSSL en el container donde corres Prisma:
```bash
apk add --no-cache openssl libc6-compat
```
