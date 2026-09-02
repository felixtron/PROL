---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Documentos nativos y R2
status: executing
stopped_at: Completado 02-04-PLAN.md (4 de 4 planes de la fase 2) — Fase 2 completa
last_updated: "2026-09-02T03:35:00.000Z"
last_activity: "2026-09-02 — Plan 02-04 completado: usuario aprobó el despliegue, imagen 55c020d desplegada a producción por la ruta canónica de quadlets con las cuatro variables R2 aplicadas por SSH, verificación humana de que el panel y las descargas públicas siguen sanos, y DEPLOY.md §7c actualizada al estado real (APLICADO, migración en el host sigue como no-op por volumen vacío, módulo documental apagado). Fase 2 completa: R2-01 y R2-04 confirmados también en producción, no sólo en local."
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 3 — Procedimientos nativos

## Current Position

Phase: 3 of 7 (Procedimientos nativos)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-02 — Fase 2 completa y desplegada a producción. Plan 02-04: el usuario aprobó el despliegue con alcance/riesgo/rollback/verificación por delante, imagen 55c020d desplegada por SSH (ruta canónica de quadlets) con las cuatro variables R2 aplicadas al env del contenedor, confirmación humana de que el panel y las descargas de PDF siguen normales, y DEPLOY.md §7c reescrita con el estado real (APLICADO, migración en el host sigue sin ejecutarse por volumen vacío, módulo documental apagado por diseño).

Progress: [███░░░░░░░] 29% (2 de 7 fases)

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 22min | 3 tasks | 2 files |
| Phase 01 P01 | 20min | 3 tasks | 4 files |
| Phase 02 P01 | 25min | 3 tasks | 9 files |
| Phase 02 P02 | 45min | 3 tasks | 1 files |
| Phase 02 P03 | 35min | 3 tasks | 3 files |
| Phase 02 P04 | ~15min (tarea 4 de documentación; tareas 1-3 incluyen una pausa de aprobación humana no cronometrable) | 4 tasks | 1 files |

## Accumulated Context

### Decisions

Las decisiones se registran en la tabla Key Decisions de PROJECT.md.
Decisiones recientes que afectan al trabajo actual:

- Cuerpo del documento en HTML saneado; parte llenable en JSON tipado con Zod. Híbrido deliberado: los dos arquetipos del piloto están en extremos opuestos del espectro.
- Los registros llenos van a una tabla nueva `CompanyRecord`, no a `CompanyDocument`, que está claveada por versión y no tiene dimensión de periodo.
- R2 sólo para el tier confidencial, tras feature flag, con rollback quitando una variable de entorno.
- [Phase 01]: El FOR UPDATE del versionado de CompanyDocument se coloca sobre manual_documents (siempre tiene fila), no sobre company_documents (puede tener cero filas en la primera personalización).
- [Phase 01]: Eliminada la copia local de loadAsDataUrl en la ruta PDF de resultados de evaluación; se usa el helper único loadUploadAsDataUrl de certificate-assets.ts.
- [Phase 01]: El volumen privado (evidencias y plantillas confidenciales) se replica off-site por rclone igual que uploads y db; la migración docker → podman de backup.sh sigue diferida hasta el diagnóstico por SSH.
- [Phase 01]: `docker-compose.prod.yml` declara `prol_private` (resuelve a `prol_prol_private`) para quedar coherente con el quadlet que producción ya monta a mano; compose y quadlet se mantienen sincronizados por convención documentada en DEPLOY.md §7b.
- [Phase 02-01]: `lib/r2.ts` calcado del molde de `cloudflare-stream.ts` (aws4fetch, sin conocimiento de `prol/` ni de política de PROL); configuración R2 parcial se avisa al arrancar (console.warn) y se rechazará al escribir en el plan 02-02, nunca tumba el arranque.
- [Phase 02-01]: `turbo.json` `globalEnv` ampliado con las cuatro `R2_*` — sin esto, `turbo/no-undeclared-env-vars` rompe la línea base de lint del milestone (81 warnings).
- [Phase 02-02]: sharedBucketKey() aplica el prefijo prol/ solo dentro de document-storage.ts; fileKey en la base sigue siendo <subdir>/<uuid>.<ext>, sin prefijo.
- [Phase 02-02]: storePrivateFile rechaza con 503 (sin nombrar variables en la respuesta) cuando R2_BUCKET esta presente y falta otra credencial; el detalle va solo al log.
- [Phase 02-02]: Hallazgo fuera de alcance: requireUser() ya no lanza 'Unauthorized' desde d991c31; 8 rutas (incluidas /files/*) devuelven 403 en vez de 401 sin sesion. Pre-existente, ajeno a esta fase, registrado en deferred-items.md, no corregido.
- [Phase 02-03]: Migracion disco -> R2 escrita como script .mjs standalone (no importa document-storage.ts), duplicando a proposito el prefijo prol/ y la config de AwsClient; idempotente via HEAD previo, sin ninguna operacion de borrado.
- [Phase 02-03]: Demostrado en local (produccion no tiene datos): una fileKey subida con backend disco se descarga igual tras migrar, con el disco apartado -- los bytes solo pueden venir del bucket -- y la base no cambia ni una fila.
- [Phase 02-03]: Demostrado el rollback completo R2 -> disco -> R2 solo cambiando R2_BUCKET y reiniciando el proceso, sin desplegar codigo; par 404/200 confirma el origen de los bytes en cada estado.
- [Phase 02-03]: eslint.config.js de apps/web gana un override para scripts/**/*.mjs (global process) para que el script de migracion no rompa la linea base de lint (81 warnings) via no-undef.
- [Phase 02-04]: Usuario aprobo explicitamente "desplegar ahora" (no diferir) tras revisar alcance, riesgo, rollback y verificacion. Produccion corre desde el 2026-09-01 con backend R2 (imagen 55c020d); R2-01 y R2-04 quedan confirmados tambien en produccion, no solo en local.
- [Phase 02-04]: documents_enabled permanece false en los tres tenants -- decision de producto fuera de esta fase. El camino de escritura a R2 sigue sin ejercitarse por la interfaz en produccion hasta que se encienda.
- [Phase 02-04]: La receta de migracion contra el host de produccion sigue sin ejecutarse: el volumen prol_prol_private estaba vacio (0 archivos) al desplegar, confirmado antes de tocar el env -- es un no-op real, no uno asumido.
- [Phase 02-04]: Alias SSH panel-prosuite-2 y propodvps2 confirmados como el mismo host (195.26.255.71, hostname real propodvps2). Documentado en DEPLOY.md para no reaveriguarlo.

### Pending Todos

- **Falta una segunda empresa en el seed.** El seed crea sólo Acme Corp, y el criterio 1 de la fase 3 exige emitir el mismo documento a dos empresas distintas para comprobar la personalización. Crear la segunda antes de verificar esa fase.
- **`apps/web/app/surveys/[publicSlug]/`** se sacó del repo (código muerto: importaba `getSurveyByPublicSlug` y `submitSurveyResponse`, que no existen; lo sustituyeron `surveys/answer/` y `surveys/open/`). Copia en el scratchpad de la sesión por si hiciera falta consultarla.

### Blockers/Concerns

- ~~El respaldo de producción puede no estar corriendo.~~ **RESUELTO el 2026-09-01, y era peor de lo supuesto**: el respaldo automático llevaba **sin correr desde el 2026-05-19**. Al migrar a `panel-prosuite-2` no se recreó la entrada del cron, y el script tampoco habría funcionado (invocaba `docker`; el host sólo tiene podman, confirmado). Arreglado en `0e84566`: script agnóstico al runtime, tarball de uploads semanal (a diario llenaba el disco: 56 × 1.5 GB), poda por cantidad. Instalado en el VPS con cron a las 03:00 UTC y verificado de punta a punta.
- ~~El volumen de evidencias no tiene respaldo.~~ **RESUELTO**: `backup.sh` genera `private_<fecha>.tar.gz` a diario, el volumen `prol_prol_private` existe y está montado en producción, y el respaldo corre por cron.
- ~~Falta el cron de `/api/cron/compliance`.~~ **RESUELTO el 2026-09-01**: `/usr/local/bin/prol-compliance-cron.sh` instalado (modo 700) y cron a las 16:15 Europe/Berlin = 08:15 America/Mexico_City. Verificado: 401 sin credencial, exit 0 con ella.
- **El VPS corre un `docker-compose.prod.yml` divergente del repo** (red `traefik` en vez de `dokploy-network`, más variables de Turnstile, todo sin commitear allí). **No afecta al despliegue por la ruta canónica** —`git archive` a `/opt/prol-deploy-$SHA` + quadlets, que no toca `/opt/prol`— pero rompería la sección "Re-deploy" de DEPLOY.md, que hace `git pull` en el host. No usar esa ruta sin reconciliar antes.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.
- **Los ejecutores en paralelo se pisan el índice de git.** En la ola 1 de la fase 1, dos agentes sobre el mismo working tree (`branching_strategy: "none"`) se absorbieron mutuamente archivos entre el `add` y el `commit`. El contenido quedó íntegro, la atribución cruzada. **Antes de la fase 2 hay que serializarlos o darle worktree a cada uno**: las fases 2-7 tienen varios planes por ola.
- **Trampa operativa: `grep` no es seguro para canalizar credenciales por SSH en esta máquina.** Encontrado durante el despliegue de R2 a producción (plan 02-04): un hook local de shell (`rtk`) reescribe la invocación de `grep` incluso en mitad de una tubería, y en vez del `VAR=valor` esperado se agrega la salida formateada del propio `rtk` (líneas `path:línea:contenido`) con el valor real incrustado en una línea que no es `VAR=valor`. Se detectó de inmediato porque el conteo de verificación posterior dio 0 en vez de 4; ningún valor de credencial llegó a salida visible ni a git. **Usar `awk` o una variable de shell capturada para mover valores sensibles**; `grep` sigue siendo seguro para contar después (paso de verificación), no para copiar antes. Documentado en `DEPLOY.md` §7c.

## Estado de producción (2026-09-01)

- Desplegado `55c020d` en `panel-prosuite-2` (anterior: `64f7476`). Los alias `panel-prosuite-2` y `propodvps2` resuelven al **mismo host** (`195.26.255.71`, hostname real `propodvps2`). Rollback de imagen: `podman tag localhost/prol-web:64f7476 localhost/prol-web:latest && systemctl restart prol-web-1.service` (no ejecutado, no hizo falta; imágenes `64f7476`, `5323a42`, `7c287e8` siguen tagueadas).
- **Backend de almacenamiento confidencial: R2 activo.** Las cuatro variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) están en `/etc/containers/env/prol-web-1.env` (600, root), aplicadas por SSH — nunca sus valores. Verificado: 4 variables dentro del contenedor, 0 apariciones de "Configuración de R2 incompleta" en `journalctl`, `/api/health` y `/sign-in` en 200. Rollback de una variable (quitar `R2_BUCKET` y reiniciar) verificado de punta a punta en local (plan 02-03), no ejecutado en producción.
- El módulo de gestión documental está **en producción y apagado**: `documents_enabled = false` en Academia Digital MX, IBIZA Consultores y Mecanica G3. Con el módulo apagado, el camino de escritura a R2 no se ha ejercitado por la interfaz en producción — sólo en local (planes 02-02/02-03) contra el bucket real.
- Volumen `prol_prol_private` montado en `/app/private-uploads`, y confirmado **vacío (0 archivos)** justo antes de este despliegue: la receta de migración disco → R2 de `DEPLOY.md` §7c sigue sin ejecutarse contra el host porque es un no-op genuino, no uno asumido.
- **Desfase repo ↔ producción RESUELTO**: `55c020d` ya incluye el tipado de `formSnapshot` (`b697b3b`, `ab975e2`) que `64f7476` no traía.
- Esquema: `prisma migrate diff` en preview contra la base real de producción devolvió una migración vacía (0 sentencias) — la fase 2 no toca Prisma, confirmado, no asumido. No se corrió ningún `db push`.
- Respaldo: cron diario a las 03:00 UTC. Cadencia db+privado diaria, uploads semanal (domingos), poda por cantidad. Estado estable ≈ 12 GB sobre 116 GB libres.

## Session Continuity

Last session: 2026-09-02T03:35:00.000Z
Stopped at: Completado 02-04-PLAN.md (4 de 4 planes de la fase 2) — Fase 2 completa
Resume file: None
