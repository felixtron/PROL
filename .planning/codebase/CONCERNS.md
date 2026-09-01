# Codebase Concerns

**Analysis Date:** 2026-09-01

## Tech Debt

### Volumen privado de evidencias no respaldado en producción

**Issue:** El script de backup solo cubre el volumen `prol_prol_uploads` (línea 27 en `scripts/backup.sh`), pero las evidencias confidenciales viven en un directorio privado separado configurado por `PRIVATE_UPLOAD_DIR` (ver `apps/web/lib/upload-paths.ts` líneas 61-76).

**Files:** 
- `scripts/backup.sh` (línea 27)
- `docker-compose.prod.yml` (líneas 98-100)
- `apps/web/lib/upload-paths.ts` (líneas 61-76)

**Impact:** 
- Las evidencias de cumplimiento (expediente del cliente) no están siendo respaldadas en las rotinas diarias
- Si el volumen privado falla, no hay recuperación posible
- Incumplimiento de SLA para datos críticos B2B

**Fix approach:** 
1. Declarar un volumen `prol_private_uploads` en `docker-compose.prod.yml`
2. Extender `scripts/backup.sh` para respaldar ese volumen además del actual
3. Verificar que en producción `PRIVATE_UPLOAD_DIR` apunta a ese volumen persistente
4. Añadir validación en el boot que avisa si `PRIVATE_UPLOAD_DIR` no está configurado

---

### Script de backup usa `docker` pero producción corre `podman`

**Issue:** El script invoca `docker exec` (línea 44) y `docker run` (línea 55) en `scripts/backup.sh`, pero según `DEPLOY.md`, el host de producción corre `podman` y **no tiene instalado el binario `docker`**.

**Files:** 
- `scripts/backup.sh` (líneas 44, 55)
- Contexto: `DEPLOY.md` documenta que el host corre `podman`, no `docker`

**Impact:** 
- El cron diario de backup (línea 20) falla en producción
- No hay respaldo de base de datos
- Sin recuperación ante corrupción o pérdida

**Fix approach:** 
Reemplazar `docker` por `podman` en todas las invocaciones, o crear un wrapper que detecte cuál está disponible

---

## Known Bugs

### Race condition en `uploadCompanyDocument` — violación de restricción única

**Issue:** La función `uploadCompanyDocument` en `apps/web/lib/actions/manual.ts` (líneas 880-900) busca el último documento sin tomar un bloqueo `FOR UPDATE`, permitiendo race conditions donde dos peticiones simultáneas obtienen la misma versión anterior e intentan crear dos filas con la misma `(documentId, companyId, version)`, violando la restricción `@@unique([documentId, companyId, version])` definida en el schema (línea 2681 en `packages/db/prisma/schema.prisma`).

**Files:** 
- `apps/web/lib/actions/manual.ts` (líneas 880-900)
- `packages/db/prisma/schema.prisma` (línea 2681)

**Comparison:** El patrón correcto existe en `apps/web/lib/actions/evidence.ts` (línea 148), donde sí usa `FOR UPDATE` dentro de una transacción para serializar accesos concurrentes.

**Trigger:** 
1. Dos administradores suben un documento personalizado para la misma empresa simultáneamente
2. Ambos leen `version: N`
3. Ambos intentan insertar `version: N+1`
4. La segunda inserción falla con constraint violation

**Workaround:** Actualmente no hay: el usuario recibe un error de base de datos opaco

**Fix approach:**
Envolver la operación en una transacción con bloqueo `FOR UPDATE` como en `submitEvidence`:
```typescript
const latest = await db.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT 1 FROM company_documents WHERE documentId = ${documentId} AND companyId = ${companyId} FOR UPDATE`;
  return tx.companyDocument.findFirst({...});
});
```

---

## Security Considerations

### `formSnapshot` sin discriminador de versión en evidencias

**Issue:** El campo `formSnapshot` en el modelo `Evidence` (`packages/db/prisma/schema.prisma` línea 2768) es `Json?` sin validación ni discriminador de versión. En `apps/web/components/evidence-detail.tsx` (línea 72-74), se castea a una interfaz ad-hoc sin verificar formato:

```typescript
const snapshot = evidence.formSnapshot as
  | { items?: RiskSnapshotItem[]; config?: unknown; periodLabel?: string | null }
  | null;
```

**Files:** 
- `packages/db/prisma/schema.prisma` (línea 2768)
- `apps/web/components/evidence-detail.tsx` (líneas 72-75)

**Risk:** 
- Si el formato de `formSnapshot` cambia (p.ej., se agrega o renombra un campo), el render falla silenciosamente o muestra datos incorrectos
- No hay manera de detectar o migrar snapshots con formato antiguo
- Los jueces/revisores ven datos corruptos sin saber que la estructura cambió

**Current mitigation:** El código defensivo en el render (acceso con `?.`) previene crashes, pero no valida

**Recommendations:** 
1. Añadir un campo `formSnapshotVersion: Int` que indique qué esquema se usó al grabar
2. Crear un discriminador (p.ej., `{ version: 1, items?: ... }`)
3. En el componente, validar y migrar según la versión antes de renderizar
4. Considerar usar Zod o similar para runtime validation

---

### Rate limiter en memoria en arquitectura multi-contenedor

**Issue:** El limitador de peticiones en `apps/web/middleware.ts` (línea 24) usa `checkRateLimit('api:${ip}', 60, 60 * 1000)` que vive en memoria (ver `apps/web/lib/rate-limit.ts` líneas 14, 57-66). El comentario explícito en línea 5-6 advierte: "This is for single-server deployments only. For multi-server setups, use Redis or a distributed rate limiter."

**Files:** 
- `apps/web/middleware.ts` (línea 24)
- `apps/web/lib/rate-limit.ts` (líneas 5-6, 14, 57-66)

**Risk:** 
- Con múltiples contenedores detrás de un load balancer, cada contenedor tiene su propio contador
- El límite de 60 req/min por IP es efectivamente 60 × N (donde N = número de contenedores)
- Un atacante que conoce la topología puede saturar cada contenedor con 60 reqs y bypasear el límite global

**Current deployment:** `docker-compose.prod.yml` no especifica replicas, pero deployments reales con Dokploy/Traefik suelen escalar a múltiples contenedores

**Recommendations:** 
1. Usar Redis para almacenar estado del rate limit (shared entre contenedores)
2. O cambiar el check a nivel de Traefik middleware (límite en el proxy)
3. Documentar explícitamente que single-server deployment no escala

---

## Performance Bottlenecks

### Duplicación de función `loadUploadAsDataUrl`

**Issue:** El código para cargar un archivo de uploads como data URL está duplicado:
- `apps/web/lib/certificate-assets.ts` (líneas 11-37): `loadUploadAsDataUrl()`
- `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` (líneas 25-52): `loadAsDataUrl()`

Ambas funciones son idénticas excepto por un chequeo extra en el route handler (`if (url.startsWith("data:")) return url;`). Esto crea dos fuentes de verdad para la misma lógica sensible (validación de rutas, manejo de MIME types).

**Files:** 
- `apps/web/lib/certificate-assets.ts` (línea 11)
- `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` (línea 25)

**Impact:** 
- Si se descubre un bug en la validación de rutas (p.ej., directory traversal), hay que parchear dos sitios
- El mantenimiento del MIME type lookup se hace por duplicado
- Posibilidad de desincronización entre las dos implementaciones

**Fix approach:** 
Extraer a un helper compartido en `apps/web/lib/upload-assets.ts` (renombrar `certificate-assets.ts` o crear uno nuevo) que ambas importaciones usen

---

## Fragile Areas

### `Manual.version` es decorativo

**Issue:** El campo `version` en el modelo `Manual` (`packages/db/prisma/schema.prisma` línea 2393) tiene comentario explícito: "Informativo por ahora: el versionado con snapshots por publicación es una fase posterior." Se incrementa en la base (default es 1) pero nunca se usa en la aplicación.

**Files:** 
- `packages/db/prisma/schema.prisma` (línea 2393)

**Why fragile:** 
- Es un campo sin propósito actual que ocupa espacio y puede causar confusión
- Futuras referencias a "publicar versión N" pueden asumir que `Manual.version` lo implementa cuando en realidad no
- Si alguien intenta usarlo para audit trail, fallará silenciosamente

**Safe modification:** 
El campo está inert y seguro de dejar como está (es decorativo pero inofensivo). Sin embargo, documentar explícitamente en la base de datos o código que "esto no se usa aún" evitaría sorpresas futuras.

---

## Test Coverage Gaps

### Falta validación de `PRIVATE_UPLOAD_DIR` en tests/CI

**Issue:** El boot de la aplicación en modo producción debería fallar o alertar si `PRIVATE_UPLOAD_DIR` no está configurado. Actualmente (`apps/web/lib/upload-paths.ts` líneas 65-74), solo hace un `console.warn()` sin bloquear el inicio.

**Files:** 
- `apps/web/lib/upload-paths.ts` (líneas 65-74)

**Risk:** 
- Una configuración incompleta se pasa a producción y las evidencias se pierden silenciosamente
- El warning solo aparece en logs de inicio (fácil de pasar por alto)

**Safe test plan:** 
- Test que verifica que en modo producción sin `PRIVATE_UPLOAD_DIR`, la aplicación logged una advertencia
- Considerar elevar a error fatal en lugar de warning

---

## Missing Critical Features

### Backup del volumen privado incompleto

**Issue:** Ya documentado arriba (Volumen privado de evidencias no respaldado), pero desde la perspectiva de "feature faltante": no hay un procedimiento operacional documentado para restaurar datos en caso de fallo.

**Problem:** El expediente de cumplimiento es el único registro permanente de lo que el cliente entregó. Pérdida = pérdida de prueba auditable de cumplimiento normativo.

**Blocks:** 
- Certificación de compliance ante auditorías externas
- Capacidad de defender legalmente decisiones sobre validación de cumplimiento

---

## Environment & Deployment Drift

### `docker-compose.prod.yml` declara volumen erróneo

**Issue:** El volumen en línea 100 se llama `prol_uploads` pero el script de backup (línea 27) busca `prol_prol_uploads`. Hay inconsistencia en la nomenclatura.

**Files:** 
- `docker-compose.prod.yml` (línea 100)
- `scripts/backup.sh` (línea 27)

**Impact:** 
- Si los nombres divergen en un redeploy, el backup puede estar respaldando un volumen vacío y no uno que contiene datos reales
- Ambigüedad: ¿cuál es la "fuente de verdad"?

**Fix approach:** 
Unificar la nomenclatura (probablemente a `prol_uploads` como está en compose, y actualizar el script) o documentar explícitamente por qué es diferente

---

*Concerns audit: 2026-09-01*
