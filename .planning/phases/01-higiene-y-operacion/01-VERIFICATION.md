---
phase: 01-higiene-y-operacion
verified: 2026-09-01T22:53:10Z
status: passed
score: 8/8 must-haves verificados (4 planes, OPS-01..OPS-04)
---

# Fase 1: Higiene y operación — Reporte de verificación

**Objetivo de la fase:** Eliminar las dos amenazas de pérdida de datos y la deuda que el módulo anterior dejó abierta, antes de que ninguna fase nueva toque esa zona.
**Verificado:** 2026-09-01T22:53:10Z
**Estado:** passed
**Re-verificación:** No — verificación inicial

## Logro del objetivo

### Verdades observables

| # | Verdad | Estado | Evidencia |
|---|--------|--------|-----------|
| 1 | `scripts/backup.sh` produce un tercer tarball del volumen privado, con la misma retención/poda y réplica off-site que los otros dos artefactos | ✓ VERIFICADO | El script actual (post-`0e84566`) tiene el bloque `# 3. Private volume tarball`, usa `PRIVATE_VOLUME`, se poda por `prune_keep "$BACKUP_DIR/private" ... "$KEEP_PRIVATE"` y se replica con `rclone copy "$private_file" "$RCLONE_REMOTE/private/"`. |
| 2 | `docker-compose.prod.yml` declara el volumen privado que el quadlet de producción ya monta a mano, y resuelve al nombre físico correcto | ✓ VERIFICADO | `docker compose -f docker-compose.prod.yml -p prol config` resuelve `prol_private` → `name: prol_prol_private`; el servicio `web` monta `prol_private:/app/private-uploads` y define `PRIVATE_UPLOAD_DIR: /app/private-uploads`. |
| 3 | Dos subidas simultáneas de la misma versión de `CompanyDocument` no violan la unicidad; el lock está sobre `manual_documents`, no `company_documents` | ✓ VERIFICADO | `apps/web/lib/actions/manual.ts:885` — `SELECT 1 FROM manual_documents WHERE id = ${input.documentId} FOR UPDATE` dentro de `db.$transaction`. Confirmado contra el schema: `ManualDocument` → `@@map("manual_documents")` (línea 2519), `CompanyDocument` → `@@map("company_documents")` (línea 2684). La tabla bloqueada es la correcta, no la que tiene el `@@unique` que compite. |
| 4 | `formSnapshot` se lee con un tipo discriminado y versionado, con rama legacy que reconoce las filas anteriores | ✓ VERIFICADO | `packages/shared/src/evidence-snapshot.ts` existe, usa `z.union` (no `discriminatedUnion`), y `parseEvidenceSnapshot` degrada a `null`. `evidence-detail.tsx` lo consume sin ningún cast. |
| 5 | Un `snapshotVersion` distinto de 1 NO cae en la rama legacy por descarte: se rechaza | ✓ VERIFICADO (probado empíricamente) | Ejecuté el schema real contra `{snapshotVersion: 2, kind: "RISK_MATRIX", ...}` con Zod 3.24 real del repo: `safeParse(...).success = false`. `riskSnapshotLegacySchema` usa `snapshotVersion: z.undefined()`, que rechaza cualquier valor no-`undefined`, incluido `2`. Éste era el riesgo señalado como de mayor severidad y se sostiene. |
| 6 | No queda ningún cast `as` sobre `formSnapshot` en el codebase | ✓ VERIFICADO | `rg 'formSnapshot as' apps/web packages` → 0 resultados. |
| 7 | La evidencia legacy (fila `1`, sin discriminador) y la nueva (fila `2`, con discriminador) conviven y ambas siguen siendo servibles por el mismo componente | ✓ VERIFICADO | Consulta directa a la base local: `cmtj938ve...|1|RISK_MATRIX|PENDING|f` y `cmtj9cgrn...|2|RISK_MATRIX|PENDING|t`. Coincide exactamente con lo documentado en 01-04-SUMMARY.md. |
| 8 | La ruta PDF de resultados de evaluación usa el único helper de data-URL del repo, sin duplicar código antes de la fase 4 | ✓ VERIFICADO | La ruta importa `loadUploadAsDataUrl` de `@/lib/certificate-assets` y no queda ninguna definición local `loadAsDataUrl` ni imports huérfanos (`node:fs/promises`, `node:path`, `upload-paths`). |

**Puntuación:** 8/8 verdades verificadas.

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalle |
|-----------|----------|--------|---------|
| `scripts/backup.sh` | Tercer bloque de tarball privado, misma retención/poda/off-site | ✓ VERIFICADO | Reescrito más allá del plan (commit `0e84566`, fuera de esta fase pero coherente con ella): pasó de `docker` fijo a `CONTAINER_CLI` auto-detectado (podman/docker), y de poda por antigüedad (`RETAIN_UPLOADS_WEEKS`/`-mtime`) a poda por cantidad (`KEEP_DB`/`KEEP_UPLOADS`/`KEEP_PRIVATE`). El tercer artefacto (`private_<fecha>.tar.gz`) sigue presente con las mismas garantías relativas: se poda igual que uploads-equivalente, se replica off-site igual que los otros dos. |
| `docker-compose.prod.yml` | Declaración + montaje + env del volumen privado | ✓ VERIFICADO | `prol_private` declarado a nivel superior, montado en `web` en `/app/private-uploads`, `PRIVATE_UPLOAD_DIR` en `environment`. `docker compose config` resuelve sin error. |
| `scripts/README.md` | Tabla de artefactos + receta de restauración del volumen privado | ✓ VERIFICADO | Tabla con las 3 filas (db/uploads/private), receta de restauración del volumen privado idéntica en forma a la de uploads. Documentación coherente con el `backup.sh` real (retención por cantidad, `CONTAINER_CLI`, cadencia semanal de uploads) — no quedó desactualizada tras el fix de producción. |
| `DEPLOY.md` §7a-bis / §7b | Coherencia compose ↔ quadlet, estado del respaldo y del volumen | ✓ VERIFICADO | §7a-bis documenta explícitamente que el respaldo estuvo caído desde 2026-05-19 y fue restaurado el 2026-09-01; §7b documenta que `prol_private` (compose) y `prol_prol_private` (quadlet/podman) son el mismo volumen y dice explícitamente "el compose y el quadlet se mantienen sincronizados". Coherente con lo que hace `docker-compose.prod.yml` hoy. |
| `apps/web/lib/actions/manual.ts` | Lock de fila correcto, sin exports nuevos | ✓ VERIFICADO | Único `FOR UPDATE`, sobre `manual_documents`; 29 exports, todos preexistentes (verificado por listado completo de `export async function`). |
| `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` | Sin helper duplicado | ✓ VERIFICADO | Ver verdad 8. |
| `packages/shared/src/evidence-snapshot.ts` | Unión de Zod v1 + legacy, `parseEvidenceSnapshot` | ✓ VERIFICADO | Exporta `evidenceSnapshotSchema`, `parseEvidenceSnapshot`, `EVIDENCE_SNAPSHOT_VERSION`. `z.union`, no `discriminatedUnion`. Probado con los 4 casos del plan (legacy, v1, v2-inválido, null) contra el código real vía `tsx`: los 4 se comportan como se especifica. |
| `packages/shared/src/index.ts` | Reexporta el schema nuevo | ✓ VERIFICADO | `export * from "./evidence-snapshot";` presente. |
| `apps/web/components/evidence-detail.tsx` | Lectura validada, sin cast | ✓ VERIFICADO | `parseEvidenceSnapshot(evidence.formSnapshot)`; sin `interface RiskSnapshotItem` local; gate `snapshot?.items?.length` antes de `snapshot.items.map(...)`, sin riesgo de crash si `snapshot` es `null`. |

### Verificación de conexiones clave (wiring)

| De | A | Vía | Estado | Detalle |
|----|---|-----|--------|---------|
| `docker-compose.prod.yml` (clave `prol_private`) | volumen físico `prol_prol_private` | prefijo de proyecto de Compose | ✓ WIRED | `docker compose ... config` confirma `name: prol_prol_private`. |
| `docker-compose.prod.yml` (environment de `web`) | `resolvePrivateUploadDir()` | `PRIVATE_UPLOAD_DIR=/app/private-uploads` | ✓ WIRED | Variable presente y apuntando al mismo path que el `volumes:` monta. |
| `scripts/backup.sh` (`PRIVATE_VOLUME`) | volumen físico `prol_prol_private` | `"$CONTAINER_CLI" run --rm -v "$PRIVATE_VOLUME":/data:ro` | ✓ WIRED | Bloque 3 presente con el default correcto. |
| `apps/web/lib/actions/manual.ts` (`uploadCompanyDocument`) | tabla `manual_documents` | `tx.$queryRaw...FOR UPDATE` dentro de `db.$transaction` | ✓ WIRED | Confirmado en código y contra `@@map` del schema. |
| `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` | `apps/web/lib/certificate-assets.ts` | `import { loadUploadAsDataUrl }` | ✓ WIRED | Import y uso confirmados en línea 16 y 1187. |
| `apps/web/components/evidence-detail.tsx` | `packages/shared/src/evidence-snapshot.ts` | `import { parseEvidenceSnapshot } from "@prol/shared"` | ✓ WIRED | Import y uso confirmados; barrel reexporta correctamente. |
| `apps/web/lib/actions/risk.ts` (`submitRiskMatrix`) | rama v1 del schema | `snapshotVersion`/`kind` en el objeto guardado | ✓ WIRED | `import { EVIDENCE_SNAPSHOT_VERSION } from "@prol/shared"` y `snapshotVersion: EVIDENCE_SNAPSHOT_VERSION` en el `update`. Confirmado contra la base: la fila `version=2` trae el discriminador (`t`). |

### Cobertura de requisitos

| Requisito | Plan origen | Descripción | Estado | Evidencia |
|-----------|-------------|-------------|--------|-----------|
| OPS-01 | 01-01 | El respaldo diario incluye el volumen de evidencias | ✓ SATISFECHO | Tercer tarball `private_<fecha>.tar.gz` presente en `backup.sh`, con retención y off-site. Además, aplicado en producción de verdad (commit `0e84566`, DEPLOY.md §7a-bis): el cron llevaba parado desde 2026-05-19 y fue reactivado. |
| OPS-02 | 01-01 | `docker-compose.prod.yml` declara el volumen privado que producción ya monta | ✓ SATISFECHO | `prol_private` declarado, montado, con `PRIVATE_UPLOAD_DIR`. Coherente con el `podman volume create prol_prol_private` de DEPLOY.md. |
| OPS-03 | 01-02 | Incrementar la versión de un documento de empresa toma lock y no puede colisionar | ✓ SATISFECHO | `FOR UPDATE` sobre `manual_documents` dentro de `db.$transaction`. Evidencia empírica documentada en 01-02-SUMMARY.md (fase de control con `P2002`, fase con lock con versiones consecutivas 1/2). |
| OPS-04 | 01-03 (precondición) + 01-04 (implementación) | `formSnapshot` se lee con tipo discriminado y versionado, con rama legacy | ✓ SATISFECHO | Esquema real probado con los 4 casos, incluido el crítico `snapshotVersion: 2` → rechazado. Base local con `1|f` (legacy) y `2|t` (v1) conviviendo, ambas evidencias con `status=PENDING`, ambas leíbles por el mismo componente. |

No hay requisitos huérfanos: la tabla de trazabilidad de `.planning/REQUIREMENTS.md` sólo mapea OPS-01..04 a la Fase 1, y los cuatro aparecen declarados en el frontmatter de algún plan.

### Anti-patrones encontrados

| Archivo | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| — | — | — | — | Ninguno. Barrido de `TODO/FIXME/XXX/HACK/PLACEHOLDER` sobre los 9 archivos tocados por la fase: 0 coincidencias. |

### Puertas transversales del milestone

| Puerta | Esperado | Resultado |
|--------|----------|-----------|
| `pnpm exec turbo run check-types` | limpio | ✓ `8 successful, 8 total` |
| `pnpm exec turbo run lint` | `✖ 81 problems (0 errors, 81 warnings)` | ✓ Exactamente `✖ 81 problems (0 errors, 81 warnings)` |
| `pnpm exec turbo run build` | verde | ✓ `7 successful, 7 total` |

### Evaluación de las desviaciones documentadas (checkpoints humanos)

**01-03 (sustituyó la entrega por interfaz por reutilizar el bloque literal de `risk.ts`):**
Verificado independientemente que la sustitución es defendible: la fila legacy real en la base (`cmtj938ve...`, `version=1`, `form_snapshot` sin `snapshotVersion` ni `kind`) tiene exactamente la forma que describe el plan como "lo que escribe hoy `risk.ts`" — confirmado contra el archivo fuente actual (`config`, `items[].type/description/probability/impact/score/level/actions/responsible`, `title`, `periodLabel`, `submittedAt`). No hay hueco real: el objetivo del plan (fabricar un caso legacy *auténtico*, no inventado) se cumplió, aunque el canal de escritura fue Prisma directo en vez de la server action. El propio SUMMARY es honesto sobre el límite ("si `submitEvidence()` hiciera alguna transformación adicional... no la veríamos"), y se confirmó por lectura de código que no la hace.

**01-04 (sustituyó la comprobación visual en navegador por sesión real vía API de Better Auth + lectura del HTML servido):**
Verificado independientemente contra la base de datos: las dos filas (`1|f` legacy, `2|t` v1) existen y ambas tienen `form_snapshot is not null`. El diff de `evidence-detail.tsx` es efectivamente pequeño (el cast se sustituye por el parser sin tocar el JSX de la tabla, confirmado por lectura línea a línea del archivo actual). La sustitución cubre lo que realmente importa para OPS-04 —que el dato se parsea y renderiza correctamente en las dos ramas— y dejó explícitamente fuera de alcance sólo la apariencia CSS, que el cambio no podía haber afectado (no se tocó ningún className ni estructura de la tabla). No hay hueco real.

Ninguna de las dos desviaciones deja un hueco funcional: ambas fueron verificadas de forma independiente contra la base de datos y el código real, no sólo aceptadas por lo que dice el SUMMARY.

### Nota sobre trabajo aplicado en producción más allá de los planes

`scripts/backup.sh`, `scripts/README.md` y `DEPLOY.md` recibieron cambios adicionales (commits `0e84566` y `85bd202`) fuera del alcance textual de 01-01-PLAN.md, pero que resuelven exactamente el bloqueo que ese plan había dejado diferido explícitamente (la migración `docker`→`podman`, condicionada a un "diagnóstico por SSH"). Los tres archivos son coherentes entre sí hoy:
- `backup.sh` auto-detecta `podman`/`docker` vía `CONTAINER_CLI`.
- `scripts/README.md` documenta la cadencia semanal de uploads, la poda por cantidad y el runtime auto-detectado — coincide línea por línea con lo que hace el script.
- `DEPLOY.md` §7a-bis documenta honestamente que el respaldo estuvo caído desde 2026-05-19 (nunca se recreó el cron al migrar de host) y que fue restaurado el 2026-09-01, y §7b documenta que el volumen privado nunca se había montado en producción hasta esa misma fecha porque el módulo estaba apagado (`documentsEnabled=false`).

Esto no es parte del contrato de must-haves de los planes, pero es información relevante: el riesgo de mayor severidad de la fase (evidencias sin ninguna copia) no solo quedó resuelto a nivel de repositorio sino confirmado como aplicado y corriendo en producción.

### Verificación humana requerida

Ninguna. Todos los must-haves de la fase se pudieron verificar de forma programática: contra el código fuente, contra el schema de Prisma, contra la base de datos local, y ejecutando el schema Zod real con los casos críticos.

### Resumen de huecos

Ninguno. Los cuatro requisitos (OPS-01 a OPS-04) están satisfechos con evidencia verificable de forma independiente, no sólo por lo que afirman los SUMMARY. Los dos puntos de mayor riesgo señalados explícitamente —el `FOR UPDATE` sobre la tabla correcta en `manual.ts`, y el rechazo real de `snapshotVersion: 2` en `evidence-snapshot.ts`— se confirmaron con evidencia directa (lectura de schema + `@@map`, y ejecución del schema Zod real, respectivamente). Las dos desviaciones de checkpoint humano documentadas en 01-03 y 01-04 se evaluaron y no dejan hueco funcional. Las puertas transversales (`check-types`, `lint`, `build`) están en línea base exacta.

---

*Verificado: 2026-09-01T22:53:10Z*
*Verificador: Claude (gsd-verifier)*
