#!/usr/bin/env bash
#
# Despliegue de una instancia de PROL sobre Podman + quadlets.
#
# Sustituye la secuencia manual que vivía en DEPLOY.md. Existe porque a partir
# de la separación hay DOS instancias sobre el mismo host: la misma secuencia a
# mano, dos veces, con nombres distintos, es exactamente como se pierde un paso.
# Ya pasó una vez con la entrada de cron al migrar de host.
#
#   scripts/deploy.sh <instancia> [sha]
#
# `instancia` es el prefijo de las units y del tag (p. ej. `ibiza`, `prol`).
# `sha` por defecto es el HEAD local; se puede pasar otro para desplegar o
# revertir a una versión concreta.
#
# Lo que hace, en este orden:
#   1. comprueba que el árbol está limpio (se despliega lo que está commiteado);
#   2. manda el árbol al host con `git archive` (el host no tiene git);
#   3. construye la imagen y la etiqueta con el SHA — inmutable;
#   4. respalda la base ANTES de tocar el esquema;
#   5. muestra el SQL del cambio de esquema y PIDE CONFIRMACIÓN;
#   6. aplica las migraciones;
#   7. mueve el tag de ESTA instancia y reinicia su unit;
#   8. espera a `healthy` y revierte solo si no llega.
#
# El tag móvil es por instancia (`prol-web:ibiza`, `prol-web:prol`) y no un
# `latest` compartido: con un `latest` común, desplegar a una tocaría también a
# la otra en su siguiente reinicio. Revertir es mover ese tag a un SHA anterior.
set -euo pipefail

HOST="${PROL_DEPLOY_HOST:-propodvps2}"
INSTANCE="${1:-}"
SHA="${2:-$(git rev-parse --short HEAD)}"

die() { echo "error: $*" >&2; exit 1; }

[ -n "$INSTANCE" ] || die "uso: scripts/deploy.sh <instancia> [sha]"
[[ "$INSTANCE" =~ ^[a-z][a-z0-9-]*$ ]] || die "nombre de instancia inválido: $INSTANCE"

# Se despliega lo commiteado: `git archive` exporta del árbol de objetos, así
# que un cambio sin commitear NO viajaría y la imagen no sería el SHA que dice.
if [ -n "$(git status --porcelain)" ]; then
  die "el árbol tiene cambios sin commitear; commitea o descarta antes de desplegar"
fi

IMAGE="localhost/prol-web"
UNIT_WEB="${INSTANCE}-web"
UNIT_DB="${INSTANCE}-db"
# Convención de deploy/quadlets/. La instalación anterior a la separación usaba
# `prol_prol-internal`; se puede forzar con PROL_DEPLOY_NETWORK mientras dure.
NETWORK="${PROL_DEPLOY_NETWORK:-${INSTANCE}-internal}"
REMOTE_DIR="/opt/prol-deploy-${SHA}"

echo "==> instancia=${INSTANCE} sha=${SHA} host=${HOST}"

echo "==> 1/7 enviando el árbol a ${HOST}:${REMOTE_DIR}"
git archive --format=tar.gz "$SHA" \
  | ssh "$HOST" "mkdir -p ${REMOTE_DIR} && tar -xz -C ${REMOTE_DIR}"

echo "==> 2/7 construyendo ${IMAGE}:${SHA}"
ssh "$HOST" "podman build -t ${IMAGE}:${SHA} ${REMOTE_DIR}"

echo "==> 3/7 respaldando la base de ${INSTANCE}"
BACKUP="/opt/prol/backup_$(date -u +%Y%m%d_%H%M)_${INSTANCE}_pre_${SHA}.sql"
ssh "$HOST" "set -e
  DBU=\$(podman exec ${UNIT_DB} printenv POSTGRES_USER)
  DBN=\$(podman exec ${UNIT_DB} printenv POSTGRES_DB)
  podman exec ${UNIT_DB} pg_dump -U \"\$DBU\" -d \"\$DBN\" > ${BACKUP}
  test -s ${BACKUP} || { echo 'respaldo vacío'; exit 1; }
  ls -lh ${BACKUP}"

echo "==> 4/7 cambios de esquema pendientes"
# Las migraciones se leen del árbol recién enviado, que es exactamente el SHA
# que se va a desplegar — no del checkout viejo de /opt/prol. El contenedor de
# node es desechable: la imagen de runtime corre como usuario sin privilegios y
# no lleva el CLI de prisma. Es el patrón que ya usaba DEPLOY.md.
PRISMA_RUN="podman run --rm --network ${NETWORK} \
  --env-file /etc/containers/env/${UNIT_WEB}.env \
  -v ${REMOTE_DIR}/packages/db:/work:Z -w /work docker.io/node:20-alpine \
  sh -c 'apk add --no-cache openssl libc6-compat >/dev/null && npx -y prisma@5.22.0"
ssh "$HOST" "${PRISMA_RUN} migrate status'" || true

read -r -p "¿Aplicar migraciones y desplegar a '${INSTANCE}'? (escribe: si) " ANSWER
[ "$ANSWER" = "si" ] || die "cancelado por el operador"

echo "==> 5/7 aplicando migraciones"
ssh "$HOST" "${PRISMA_RUN} migrate deploy'"

# El tag se mueve DESPUÉS de migrar: si el contenedor reiniciara antes,
# arrancaría contra tablas que todavía no existen.
echo "==> 6/7 moviendo ${IMAGE}:${INSTANCE} y reiniciando ${UNIT_WEB}"
PREVIOUS=$(ssh "$HOST" "podman image inspect ${IMAGE}:${INSTANCE} --format '{{index .RepoTags 0}}' 2>/dev/null || true")
ssh "$HOST" "podman tag ${IMAGE}:${SHA} ${IMAGE}:${INSTANCE} && systemctl restart ${UNIT_WEB}.service"

echo "==> 7/7 esperando healthy"
for i in $(seq 1 30); do
  STATUS=$(ssh "$HOST" "podman inspect ${UNIT_WEB} --format '{{.State.Health.Status}}' 2>/dev/null || echo desconocido")
  echo "    [${i}/30] ${STATUS}"
  if [ "$STATUS" = "healthy" ]; then
    echo "==> ${INSTANCE} desplegada en ${SHA}"
    echo "    respaldo: ${BACKUP}"
    echo "    revertir: scripts/deploy.sh ${INSTANCE} <sha-anterior>"
    exit 0
  fi
  sleep 5
done

echo "!!! ${UNIT_WEB} no llegó a healthy en 150s" >&2
ssh "$HOST" "podman logs --tail 40 ${UNIT_WEB}" >&2 || true
if [ -n "$PREVIOUS" ]; then
  echo "!!! el tag anterior era ${PREVIOUS}; revertir con:" >&2
  echo "    scripts/deploy.sh ${INSTANCE} <sha-anterior>" >&2
fi
echo "!!! si el fallo es de esquema, restaura además ${BACKUP}" >&2
exit 1
