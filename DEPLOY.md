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
Cloudflare/DNS (prol.prosuite.pro → 195.26.255.71)
    |
    v
Traefik v3 (puerto 443, SSL Let's Encrypt automatico, red `traefik`)
    |
    v
prol-web-1 (Next.js 16 standalone, puerto 3000, red prol_prol-internal)
    |
    v
prol-db-1 (PostgreSQL 16 + pgvector, puerto 5432 solo interno)
```

> **Host actual: `panel-prosuite-2` (195.26.255.71).** El setup inicial de mas
> abajo se hizo en `panel-prosuite` (66.29.152.229), que ya no sirve el sitio;
> se conserva como referencia del procedimiento, pero los re-deploys van al
> host nuevo.
>
> **`docker-compose.prod.yml` esta modificado sin commitear en el VPS**: usa la
> red `traefik` en vez de `dokploy-network` y agrega las variables de
> Turnstile. Un `git pull` lo respeta mientras el repo no toque ese archivo; si
> alguna vez se modifica upstream, el pull fallara y habra que reconciliar a
> mano antes de desplegar.

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
A     prol.prosuite.pro       →  195.26.255.71
A     *.prol.prosuite.pro      →  195.26.255.71   (wildcard para tenants)
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

### 7. Cron de encuestas

El modulo de Encuestas manda recordatorios y cierra los lanzamientos vencidos
desde una ruta protegida. No hay worker en produccion, asi que lo dispara el
cron del host una vez al dia.

> Ojo: el host **no** usa `docker compose` ni lee `/opt/prol/.env` (ver la nota
> de orquestacion real mas abajo). Las envs del contenedor viven en
> `/etc/containers/env/prol-web-1.env`.

```bash
# 1) Secreto en el env del contenedor (queda en 600, root)
printf "CRON_SECRET=%s\n" "$(openssl rand -hex 32)" >> /etc/containers/env/prol-web-1.env
chmod 600 /etc/containers/env/prol-web-1.env
systemctl restart prol-web-1.service

# 2) Script del barrido — lee el secreto del env para no repetirlo en el crontab
#    (ya instalado en /usr/local/bin/prol-surveys-cron.sh, modo 700)

# 3) Crontab de root. El host va en Europe/Berlin: 16:00 alli = 08:00 en
#    America/Mexico_City, que es la zona de la plataforma.
#    crontab -e
0 16 * * * /usr/local/bin/prol-surveys-cron.sh >/dev/null 2>&1 # prol-surveys
```

Verificacion:

```bash
# Sin credencial debe responder 401
curl -s -X POST https://prol.prosuite.pro/api/cron/surveys

# Con credencial devuelve el resumen del barrido
/usr/local/bin/prol-surveys-cron.sh && echo OK
```

Sin `CRON_SECRET` la ruta responde 503 en vez de quedar abierta. Si el barrido
no corre, lo unico que se pierde son los recordatorios: una encuesta vencida
sigue rechazando respuestas porque la ventana se comprueba al responder.

### 8. Verificar

```bash
# Ver status de containers
docker compose -f docker-compose.prod.yml ps

# Probar HTTPS desde fuera
curl -I https://prol.prosuite.pro

# Logs
docker compose -f docker-compose.prod.yml logs -f web
```

---

## Orquestacion real del VPS (verificado 2026-08-28)

**Esta guia esta desactualizada de la mitad hacia abajo.** El host
`195.26.255.71` ya no corre Docker Compose:

| Lo que dice esta guia | Lo que hay en el host |
| --- | --- |
| `git pull` en `/opt/prol` | **no hay binario `git`**; `/opt/prol` es un checkout congelado en `a41c902` |
| `docker compose ... build/up` | **no hay `docker`** (`docker.service` inactivo); corre **podman 5.4.2** |
| Servicios de compose | **quadlets**: `/etc/containers/systemd/prol-{web,db}-1.container` → units `prol-web-1.service`, `prol-db-1.service` |
| Envs en `/opt/prol/.env` | `/etc/containers/env/prol-web-1.env` (600, root) |
| Imagen construida en el host | quadlet con `Image=localhost/prol-web` y **`Pull=never`**: la imagen se etiqueta por commit (`prol-web:<sha corto>`) y `latest` |
| Red `dokploy-network` | redes `prol_prol-internal` (alias `db`) + `traefik` |

Operaciones que si aplican hoy:

```bash
systemctl restart prol-web-1.service          # recrea el contenedor y toma cambios del env
podman inspect prol-web-1 --format '{{.State.Health.Status}}'
podman logs --since 10m prol-web-1
podman images | grep prol-web                 # que tag/commit esta desplegado
```

Backup antes de cualquier cambio de schema (precedente en `/opt/prol/backup_*.sql`):

```bash
podman exec prol-db-1 pg_dump -U prol -d prol > /opt/prol/backup_$(date -u +%Y%m%d_%H%M)_pre_<motivo>.sql
```

Cambio de schema, usando **el schema que trae la imagen nueva** (no el de
`/opt/prol`, que esta viejo). `migrate diff` muestra el SQL sin aplicarlo:

```bash
CID=$(podman create localhost/prol-web:latest)
podman cp "$CID":/app/packages/db/prisma /root/prol-dbpush/prisma && podman rm -f "$CID"

podman run --rm --network prol_prol-internal \
  --env-file /etc/containers/env/prol-web-1.env \
  -v /root/prol-dbpush:/work:Z -w /work docker.io/node:20-alpine \
  sh -c 'apk add --no-cache openssl libc6-compat >/dev/null && \
         npx -y prisma@5.22.0 migrate diff --from-url "$DATABASE_URL" \
           --to-schema-datamodel prisma/schema.prisma --script'   # preview
# ...y el mismo run cambiando el subcomando por: db push --schema prisma/schema.prisma --skip-generate
```

Build + despliegue completo (no hay CI/CD para PROL). El host no tiene `git`,
asi que el arbol se manda con `git archive` a un directorio limpio, dejando
`/opt/prol` intacto:

```bash
# en local, con el commit a desplegar en HEAD
SHA=$(git rev-parse --short HEAD)
git archive --format=tar.gz HEAD | ssh propodvps2 "mkdir -p /opt/prol-deploy-$SHA && tar -xz -C /opt/prol-deploy-$SHA"

# en el host
podman build -t localhost/prol-web:$SHA /opt/prol-deploy-$SHA
# ...backup + db push (arriba)...
podman tag localhost/prol-web:$SHA localhost/prol-web:latest
systemctl restart prol-web-1.service
```

**El `latest` se mueve DESPUES del db push.** Si el contenedor reinicia antes,
arranca contra tablas que todavia no existen.

Rollback: `podman tag localhost/prol-web:<sha-anterior> localhost/prol-web:latest`
y `systemctl restart prol-web-1.service`. Exige que cada imagen lleve su tag de
SHA; si el cambio tocaba la DB, restaurar ademas el dump correspondiente.

La directiva canonica de operacion vive en el vault ProBrain:
`Projects/Prosuite-Directiva-Deployment-2026-08-22-Podman.md`.

---

## Re-deploy (cambios de codigo)

```bash
# En local
git push

# En VPS (ojo: panel-prosuite-2, no panel-prosuite)
ssh panel-prosuite-2
cd /opt/prol
git pull --ff-only
set -a; . .env; set +a          # el compose lee ${DB_PASSWORD} y demas
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
docker compose -f docker-compose.prod.yml logs -f web   # Verificar
```

Sin cambios de schema no hay que tocar la DB: basta reconstruir `web`. El
`up -d web` recrea el contenedor, con unos segundos de corte.

## Re-deploy con cambio de schema

Ver seccion "Aplicar cambios de schema en produccion" en [CREDENTIALS.md](./CREDENTIALS.md).

---

## Rollback

```bash
ssh panel-prosuite-2
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
