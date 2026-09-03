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

### 7a-bis. Respaldo diario

> **Estado: RESTAURADO el 2026-09-01.** El respaldo automatico llevaba
> **sin correr desde el 2026-05-19**: al migrar de `panel-prosuite` a
> `panel-prosuite-2` no se recreo la entrada del cron, y el script tampoco
> habria funcionado porque invocaba `docker` y el host nuevo solo tiene podman.
> En ese periodo lo unico que protegio la base fueron los `pg_dump` manuales
> previos a cada despliegue.

```bash
# Script (elige podman o docker segun cual exista)
scp scripts/backup.sh panel-prosuite-2:/usr/local/bin/prol-backup.sh
ssh panel-prosuite-2 'chmod 700 /usr/local/bin/prol-backup.sh'

# Cron diario a las 03:00 UTC
#   0 3 * * * /usr/local/bin/prol-backup.sh >> /opt/prol/backups/backup.log 2>&1 # prol-backup
```

Cadencia y retencion en `scripts/README.md`. Resumen: dump de la base y tarball
privado a diario, tarball de uploads **solo los domingos** (pesa ~1.5 GB), poda
por cantidad. Estado estable ~12 GB.

Verificar que sigue vivo:

```bash
ssh panel-prosuite-2 'tail -12 /opt/prol/backups/backup.log; du -sh /opt/prol/backups/*'
```

---

### 7b. Gestion documental y evidencias

El modulo reutiliza el mismo `CRON_SECRET` y anade una segunda linea al
crontab, mas un volumen propio para los archivos confidenciales.

**Volumen privado.** Las evidencias y las plantillas por empresa NO pueden
vivir bajo `public/uploads`: ese arbol lo sirve Next sin comprobar sesion, y
estos archivos solo deben salir por `/files/*`, que autoriza contra la base.

> **Estado: APLICADO en `panel-prosuite-2` el 2026-09-01.** Hasta esa fecha esta
> receta nunca se habia ejecutado: el quadlet solo montaba `prol_prol_uploads`,
> el volumen privado no existia y `PRIVATE_UPLOAD_DIR` no estaba en el env. El
> modulo se desplego apagado (`documents_enabled = false` en los tres tenants),
> asi que no llego a escribirse ninguna evidencia en el directorio efimero.

```bash
# 1) Volumen dedicado, montado FUERA de public/
podman volume create prol_prol_private
# En /etc/containers/systemd/prol-web-1.container, anadir:
#   Volume=prol_prol_private:/app/private-uploads:Z

# 2) Ruta en el env del contenedor
printf "PRIVATE_UPLOAD_DIR=%s\n" "/app/private-uploads" >> /etc/containers/env/prol-web-1.env
systemctl daemon-reload && systemctl restart prol-web-1.service
```

Sin `PRIVATE_UPLOAD_DIR` la aplicacion arranca igual y deja los archivos en
`./private-uploads` dentro del contenedor: no quedan expuestos, pero se pierden
al recrearlo. El arranque lo avisa por log.

`docker-compose.prod.yml` declara el mismo volumen con la clave `prol_private`,
que Compose antepone con el nombre del proyecto y resuelve a `prol_prol_private`,
el mismo nombre que crea el `podman volume create` de arriba. El compose y el
quadlet se mantienen sincronizados: produccion corre con quadlets, pero el
compose es la receta para reconstruir desde cero, y si divergen el siguiente
que reconstruya pierde el volumen. `backup.sh` respalda ese volumen a diario
(`private_<date>.tar.gz`).

**Barrido de recordatorios.** Manda los avisos de las actividades que se
acercan a su fecha comprometida.

> **Estado: INSTALADO en `panel-prosuite-2` el 2026-09-01.**

```bash
# Copia de prol-surveys-cron.sh apuntando a /api/cron/compliance (modo 700)
# crontab -e — 16:15 en Europe/Berlin = 08:15 en America/Mexico_City,
# 15 min despues del barrido de encuestas para no solaparlos.
15 16 * * * /usr/local/bin/prol-compliance-cron.sh >/dev/null 2>&1 # prol-compliance
```

Verificacion:

```bash
curl -s -X POST https://prol.prosuite.pro/api/cron/compliance   # sin credencial: 401
ssh panel-prosuite-2 '/usr/local/bin/prol-compliance-cron.sh && echo OK'
```

Mientras `documentsEnabled` este apagado en todos los tenants el barrido es un
no-op: corre, no encuentra actividades y sale en 0.

Aqui no hay nada que cerrar: una actividad vencida se calcula por fecha en cada
lectura, asi que si el barrido no corre solo se retrasan los avisos y la agenda
sigue diciendo la verdad.

**Flag por tenant.** El modulo no aparece hasta activar `documentsEnabled` en
`/admin/tenants/<id>`.

### 7c. Cloudflare R2 para los archivos confidenciales

Las evidencias y las plantillas por empresa se guardan en un bucket de R2 en vez
del volumen local, si —y sólo si— las cuatro variables estan presentes. Con
ninguna, la app usa `PRIVATE_UPLOAD_DIR` y todo sigue como antes.

> **Estado: APLICADO en `panel-prosuite-2` el 2026-09-01.** Imagen `55c020d`
> (anterior: `64f7476`). Las cuatro variables R2 estan en
> `/etc/containers/env/prol-web-1.env` (600, root), aplicadas por SSH como
> parte de este mismo despliegue. El volumen `prol_prol_private` seguia
> **vacio** al desplegar (0 archivos), asi que la migracion de mas abajo no
> llego a ejecutarse en produccion: la receta contra el host sigue sin
> verificar, solo la local (plan 02-03). El modulo documental continua
> **apagado** (`documents_enabled = false` en los tres tenants), asi que el
> camino de escritura en produccion todavia no se ha ejercitado por la
> interfaz — queda demostrado en local (plan 02-02) contra el bucket real, no
> en produccion.
>
> Los alias `panel-prosuite-2` y `propodvps2` resuelven al **mismo host**
> (`195.26.255.71`, hostname real `propodvps2`). Este despliegue uso
> `panel-prosuite-2`. Anotado aqui para no tener que volver a averiguarlo.

**El bucket esta COMPARTIDO.** Contiene datos de produccion de otro producto bajo
los prefijos `empresas/` y `leads/`. PROL escribe **solo** bajo `prol/`, no borra
nada, y no se activan reglas de ciclo de vida ni versionado sobre el bucket:
afectarian tambien a los datos ajenos. Si algun dia se quiere versionado para
PROL, el camino es un bucket dedicado, no una regla sobre este.

**El prefijo no entra en la base.** `fileKey` guarda `<subdir>/<uuid>.<ext>`; el
`prol/` se antepone al escribir y no sale de `apps/web/lib/document-storage.ts`.
Si se filtrara, las filas existentes dejarian de resolver y el rollback de abajo
dejaria de funcionar.

**Aplicar las variables** (por SSH, nunca commiteadas, nunca por
`docker-compose.prod.yml` — el host no lo usa):

```bash
# Los valores salen del .env local (gitignored) o del panel de Cloudflare.
ssh panel-prosuite-2 'cat >> /etc/containers/env/prol-web-1.env' <<'EOF'
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
EOF
ssh panel-prosuite-2 'chmod 600 /etc/containers/env/prol-web-1.env && systemctl daemon-reload && systemctl restart prol-web-1.service'
```

> **Trampa operativa (encontrada el 2026-09-01):** no uses `grep` para extraer o
> canalizar credenciales por SSH en esta maquina, ni siquiera dentro de un pipe.
> Un hook local de shell (`rtk`) reescribe la invocacion de `grep` aunque este en
> mitad de una tuberia, y en vez del `VAR=valor` esperado se agrega la salida
> formateada del propio `rtk` (lineas `path:linea:contenido`) con el valor real
> incrustado en una linea que no es `VAR=valor`. Se detecto de inmediato porque
> el conteo de verificacion (`grep -c '^R2_' ...`) dio 0 en vez de 4, nunca llego
> a exponerse en una salida visible ni a git. Usa `awk '/^R2_/'` o una variable
> de shell capturada para mover valores sensibles; `grep` sirve para contar
> despues (paso de verificacion), no para copiar antes.

Las **cuatro juntas o ninguna**. Con `R2_BUCKET` y sin alguna de las otras tres el
contenedor **arranca igual** —una errata en una variable del modulo documental no
puede dejar sin servicio a cursos, evaluaciones y certificados—, pero deja en el
log el aviso "Configuración de R2 incompleta" nombrando las que faltan y
**rechaza las subidas de archivos confidenciales** con un 503. Es deliberado:
degradar a disco en silencio esparciria evidencias por almacenamiento efimero, que
es el fallo que la fase 1 cerro. Consecuencia practica: **el arranque ya no avisa
por ti**, asi que despues de cada cambio del env hay que mirar ese grep.

**Rollback (R2-04): quitar `R2_BUCKET` y reiniciar.** Sin desplegar codigo.

```bash
ssh panel-prosuite-2 "sed -i '/^R2_BUCKET=/d' /etc/containers/env/prol-web-1.env && systemctl restart prol-web-1.service"
```

Las otras tres pueden quedarse: sin bucket, no se usan. Los archivos que se
hubieran escrito en R2 mientras estuvo activo **no** estan en el disco local: el
rollback devuelve la app al disco, no los datos. Por eso la migracion de abajo
copia en vez de mover.

Este primer nivel se verifico de punta a punta en local (plan 02-03, ida y
vuelta R2 → disco → R2 sin desplegar codigo), pero **no se ha ejecutado en
produccion** porque no hizo falta: el despliegue del 2026-09-01 quedo sano a la
primera. El segundo nivel — retaggear `localhost/prol-web:64f7476` como
`latest` y reiniciar — tampoco se ejecuto, pero la imagen anterior sigue
tagueada en el host, asi que el comando esta listo para copiar y pegar si
hiciera falta.

**Migrar el disco al bucket.** Hoy en produccion es un no-op: el volumen
`prol_prol_private` esta **vacio** (el modulo se desplego apagado y nunca se
escribio una evidencia). La receta existe para el dia que no lo este.

```bash
# En local, con el .env cargado
node --env-file=.env apps/web/scripts/migrate-private-to-r2.mjs --dry-run
node --env-file=.env apps/web/scripts/migrate-private-to-r2.mjs
```

En el host de produccion, con el volumen montado en solo lectura y el script del
checkout de despliegue (receta **no ejecutada todavia**; la verificada de punta a
punta es la local):

```bash
podman run --rm \
  -v prol_prol_private:/data:ro \
  -v /opt/prol-deploy-$SHA/apps/web/scripts:/scripts:ro \
  --env-file /etc/containers/env/prol-web-1.env \
  -e PRIVATE_UPLOAD_DIR=/data \
  docker.io/library/node:22-alpine \
  sh -c 'mkdir -p /tmp/mig && cd /tmp/mig && cp /scripts/migrate-private-to-r2.mjs . \
         && npm i --no-save aws4fetch && node migrate-private-to-r2.mjs'
```

El script es idempotente y no borra: se puede repetir. `backup.sh` sigue
respaldando el volumen (`private_<fecha>.tar.gz`) como cinturon y tirantes,
aunque una vez todo se escriba en R2 ese tarball deje de capturar nada nuevo.

### 7d. Documentos nativos (fase 3)

Los procedimientos se redactan, importan desde Word, emiten por empresa y versionan
dentro de la plataforma. Requiere columnas nuevas en `manual_documents` y
`company_documents`, y dos enums.

> **Estado: APLICADO en `panel-prosuite-2` el 2026-09-02.** Imagen `04135ca`
> (anteriores, ambas siguen tagueadas para rollback: `55c020d` y `64f7476`).
> Cambio de esquema aplicado con `db push` desde el schema que trae la imagen
> nueva: 2 `CREATE TYPE` -- `ManualDocumentKind` (FILE, PROCEDIMIENTO, REGISTRO)
> y `CompanyDocumentStatus` (BORRADOR, VIGENTE, OBSOLETO) -- 3 columnas nuevas en
> `manual_documents` (kind, content_html, template_version), 7 en
> `company_documents` (kind, content_html, name_override, status,
> source_template_version, published_at, published_by con su FK), y las 4
> columnas de `company_documents` que pasan a nullable (file_key, file_name,
> file_size, mime_type). Las 14 columnas y los 2 enums se releyeron de la base
> real de produccion despues del despliegue, con su nulabilidad correcta --
> comprobado por este mismo agente, no supuesto del preview.
>
> Dump previo en `/opt/prol/backup_20260902_1953_pre_fase3.sql` (3.4M).
> `company_documents` tenia **0 filas** al desplegar (releido tambien despues:
> sigue en 0), asi que el backfill del invariante fue un **no-op comprobado**,
> no una correccion: cero pares con mas de una fila VIGENTE, antes y despues.
>
> El arreglo del 401 (`5e2352d`) viajo dentro de esta imagen y se confirmo en
> produccion, no solo en local: `GET /files/evidence/<inexistente>` sin sesion
> devuelve ahora **401** (antes de este despliegue devolvia 403). Cierra en
> produccion el hallazgo que la fase 2 dejo abierto sobre R2-03.
>
> **`documents_enabled` no se toco en este despliegue**, pero el registro previo
> de este mismo documento (heredado del cierre de la fase 2) estaba mal: no es
> "false en los tres tenants". La realidad, releida directo de la base de
> produccion, es `academia-digital=false`, `mecanica-g3=false`,
> **`ibiza-online=true`** -- ya estaba en `true` antes de este despliegue, nadie
> en la fase 3 la encendio, y es una decision del usuario dejarla asi (IBIZA es
> su propia consultoria). Con `company_documents` en 0 filas en los tres
> tenants, hoy no hay ningun manual expuesto. Pero la frase "el modulo se quedo
> apagado, nadie puede ejercitarlo" necesita ese matiz: un administrador de
> IBIZA puede abrir "Manuales" en produccion ahora mismo y, si construyera uno,
> ejercitaria de verdad el editor de la fase 3 -- a diferencia de Academia
> Digital MX y Mecanica G3, donde el modulo sigue sin aparecer en el menu. Ver
> `STATE.md` para el detalle completo y la correccion del registro.
>
> **Verificacion humana pendiente.** Lo automatizable esta confirmado: servicio
> activo, `/api/health` y `/sign-in` en 200, log de arranque limpio, enums y
> columnas presentes, cero pares con mas de una fila VIGENTE, y el 401 del
> arreglo de autenticacion confirmado en vivo. Falta que el propio usuario entre
> al panel, lo vea normal y baje un certificado o un PDF de resultados -- ese
> paso todavia no se hizo. Rollback listo mientras tanto (mas abajo).

Y debajo, el orden que importa, para quien vuelva con la fase 4 o la 5:

**El `latest` se mueve DESPUES del `db push`.** Es la unica secuencia valida: si el
contenedor reinicia antes, arranca contra columnas que todavia no existen.

**Backfill del invariante** -- obligatorio despues de cada `db push` que introduzca
`company_documents.status`, y barato de repetir porque es idempotente:

```sql
UPDATE company_documents c SET status = 'OBSOLETO'
WHERE c.status = 'VIGENTE'
  AND EXISTS (SELECT 1 FROM company_documents c2
              WHERE c2.document_id = c.document_id
                AND c2.company_id  = c.company_id
                AND c2.version     > c.version);
```

**Rollback.** Dos niveles, de menor a mayor impacto:

```bash
# 1) Solo la imagen -- retaggear y reiniciar. Las columnas nuevas se quedan en
#    la base y no estorban, porque el codigo anterior no las lee.
ssh panel-prosuite-2 "podman tag localhost/prol-web:55c020d localhost/prol-web:latest && systemctl restart prol-web-1.service"

# 2) Imagen + base -- lo anterior mas restaurar el dump, solo si el db push
#    dejara la base en un estado inesperado (no fue el caso el 2026-09-02).
cat /opt/prol/backup_20260902_1953_pre_fase3.sql | ssh panel-prosuite-2 'podman exec -i prol-db-1 psql -U prol -d prol'
```

### 7e. Ibiza Experts 360 y gestión documental en Drive (fase 3.1)

El menú agrupado con rótulo por tenant, el enlace de Drive por proyecto y el
requisito que se cumple sin subir archivo a PROL.

> **Estado: APLICADO en `panel-prosuite-2` el 2026-09-03.** Imagen `9bf55ee`
> (venía de `04135ca`; anteriores, ambas siguen tagueadas para rollback:
> `55c020d` y `64f7476`). El usuario aprobó explícitamente "desplegar-ahora"
> tras revisar alcance, riesgo, rollback y verificación — y sabiendo, porque se
> le dijo antes de decidir, que el despliegue **lleva dentro el cierre de
> siete brechas de DC-3** (`aaaf8d5 feat(dc3): cerrar las siete brechas del
> modulo DC-3`), commiteado por la sesión `prol-1d` **por debajo** de los seis
> planes de esta fase — fijar el SHA de esta fase no lo excluye, porque
> `aaaf8d5` está entre `04135ca` y HEAD. Si algo va mal en producción y hay que
> atribuirlo a uno de los dos trabajos, éste es el registro.
>
> Dump previo en `/opt/prol/backup_20260903_0404_pre_fase31.sql` (3.4M).
>
> **Esquema aplicado — cinco sentencias, todas aditivas, ninguna sin
> atribuir:**
> ```sql
> ALTER TABLE "tenants"              ADD COLUMN "documents_menu_label" TEXT;   -- fase 3.1
> ALTER TABLE "manual_assignments"   ADD COLUMN "drive_url" TEXT;              -- fase 3.1
> ALTER TABLE "dc3_course_editions"  ADD COLUMN "company_id" TEXT;             -- DC-3 (aaaf8d5)
> CREATE INDEX "dc3_course_editions_company_id_idx" ON "dc3_course_editions"("company_id");  -- DC-3 (aaaf8d5)
> ALTER TABLE "dc3_course_editions"  ADD CONSTRAINT … FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;  -- DC-3 (aaaf8d5)
> ```
> Ni `DROP`, ni `SET NOT NULL`, ni enum nuevo, ni `--accept-data-loss` pedido
> en ningún momento. El `db push` se aplicó **antes** de mover `latest`.
>
> **Verificación posterior (automatizable, confirmada por este agente y
> re-confirmada por el orquestador de forma independiente):**
>
> | Comprobación | Resultado |
> | --- | --- |
> | `systemctl is-active prol-web-1.service` | `active` |
> | `GET /api/health` | `200` |
> | `GET /sign-in` | `200` |
> | `tenants.documents_menu_label` / `manual_assignments.drive_url` | `text`, `nullable`, sin `default` |
> | `tenants` con `documents_menu_label` no nulo | `0` |
> | `EvidenceRequirementKind` | sin cambios, 3 valores |
> | `documents_enabled` antes/después | idéntico: `ibiza-online=true`, `academia-digital=false`, `mecanica-g3=false` |
> | `POST /api/upload/evidence` | `404` (retirada en 03.1-05, cero llamantes confirmados por grep) |
> | Imágenes tagueadas | `9bf55ee` (nueva), `04135ca`, `55c020d`, `64f7476` |
> | Log de arranque (`06:10:46`) | limpio, ninguna traza de Prisma por columna desconocida, ninguna credencial |
> | `manual_assignments` / `evidences` en producción | `0` filas cada una |
>
> **`documents_enabled` no se tocó.** Este despliegue no encendió ni apagó el
> módulo en ningún tenant.
>
> **Confirmación visual humana: PENDIENTE, otra vez.** El checkpoint final de
> este plan pedía explícitamente tres respuestas (¿se descargó un
> certificado o PDF?, ¿un desplegable o cuatro entradas sueltas en el sidebar
> de IBIZA?, ¿qué rótulo exacto lleva?) para poder registrar la aprobación
> como verificación real. El usuario respondió únicamente **"aprobado"**, sin
> contestar ninguna de las tres — pese a que se le dijo, inmediatamente antes
> de responder, que una aprobación en blanco se registraría como "aprobado
> sin ejercitar" y que el estado de producción quedaría descrito como
> "automatizable confirmado, confirmación humana pendiente". Se registra
> exactamente así, sin inventar una confirmación que no ocurrió:
> - **Nadie ha visto el sidebar de IBIZA en producción.** No hay confirmación
>   de que el menú agrupado, el desplegable con sus cuatro hijos ni el
>   rótulo se estén viendo como se diseñaron.
> - **La deuda heredada del plan 03-08 sigue abierta.** Nadie ha descargado un
>   certificado o un PDF de resultados en producción desde entonces. Van ya
>   **tres** checkpoints de verificación humana consecutivos en esta fase
>   (03.1-02 sí se ejerció; 03.1-04 y 03.1-06 no) sin ese paso, y ésta es la
>   segunda vez que la misma deuda de la fase 3 se traslada sin saldarse.
> - Lo automatizable de la tabla de arriba sigue siendo válido: producción está
>   sana, las columnas están donde deben, y `documents_enabled` no se movió.
>   Lo que falta es exclusivamente el juicio humano sobre lo que se ve en
>   pantalla.
>
> **Rollback, un comando, con `04135ca` todavía tagueada:**
> ```bash
> ssh panel-prosuite-2 "podman tag localhost/prol-web:04135ca localhost/prol-web:latest && systemctl restart prol-web-1.service"
> ```
> Las dos columnas nuevas se quedan en la base sin molestar: el código
> anterior no las lee. Segundo nivel, sólo para una catástrofe del push:
> restaurar `/opt/prol/backup_20260903_0404_pre_fase31.sql`.
>
> **Lo que este despliegue NO demuestra:** que alguien pegue un enlace de
> Drive real en producción y lo abra. `manual_assignments` está en 0 filas —
> no hay dónde pegarlo hasta que IBIZA cree su primer manual. Eso se demostró
> en local, en pantalla y con confirmación del usuario (plan 03.1-04); sigue
> siendo evidencia local, no de producción.

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
