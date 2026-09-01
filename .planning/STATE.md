---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Documentos nativos y R2
status: planning
stopped_at: Completados 01-01-PLAN.md y 01-02-PLAN.md
last_updated: "2026-09-01T21:22:00.000Z"
last_activity: "2026-09-01 — Plan 01-01 completado: respaldo del volumen privado en backup.sh + docker-compose.prod.yml coherente con el quadlet de producción"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 4
  completed_plans: 2
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 1 — Higiene y operación

## Current Position

Phase: 1 of 7 (Higiene y operación)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-09-01 — Planes 01-01 y 01-02 completados: respaldo del volumen privado + compose coherente; lock de fila en uploadCompanyDocument y helper de data-URL unificado

Progress: [█████░░░░░] 50%

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

### Pending Todos

- **Falta una segunda empresa en el seed.** El seed crea sólo Acme Corp, y el criterio 1 de la fase 3 exige emitir el mismo documento a dos empresas distintas para comprobar la personalización. Crear la segunda antes de verificar esa fase.
- **`apps/web/app/surveys/[publicSlug]/`** se sacó del repo (código muerto: importaba `getSurveyByPublicSlug` y `submitSurveyResponse`, que no existen; lo sustituyeron `surveys/answer/` y `surveys/open/`). Copia en el scratchpad de la sesión por si hiciera falta consultarla.

### Blockers/Concerns

- ~~El respaldo de producción puede no estar corriendo.~~ **RESUELTO el 2026-09-01, y era peor de lo supuesto**: el respaldo automático llevaba **sin correr desde el 2026-05-19**. Al migrar a `panel-prosuite-2` no se recreó la entrada del cron, y el script tampoco habría funcionado (invocaba `docker`; el host sólo tiene podman, confirmado). Arreglado en `0e84566`: script agnóstico al runtime, tarball de uploads semanal (a diario llenaba el disco: 56 × 1.5 GB), poda por cantidad. Instalado en el VPS con cron a las 03:00 UTC y verificado de punta a punta.
- ~~El volumen de evidencias no tiene respaldo hoy.~~ **Resuelto a nivel de repositorio en 01-01**: `scripts/backup.sh` genera `private_<fecha>.tar.gz` y `docker-compose.prod.yml` declara/monta `prol_private`. Queda pendiente el blocker de arriba (confirmar que el cron corre en producción) y desplegar el cambio (el VPS tiene `docker-compose.prod.yml` modificado sin commitear — ver DEPLOY.md líneas 30-39 — así que el próximo `git pull` puede requerir reconciliación manual).
- **Nota de despliegue añadida en 01-01**: el VPS corre una versión de `docker-compose.prod.yml` divergente del repo (red `traefik` + variables de Turnstile, no commiteadas). Antes de desplegar los cambios de 01-01, reconciliar ese diff a mano.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.
- **Antes de encender `documentsEnabled` en cualquier tenant**: falta añadir el cron de `/api/cron/compliance` en el host (el de encuestas ya está; el de cumplimiento no se instaló porque con el módulo apagado sería un no-op). Sin él no salen los recordatorios de actividades recurrentes.

## Estado de producción (2026-09-01)

- Desplegado `64f7476` en `panel-prosuite-2`. Rollback: `podman tag localhost/prol-web:5323a42 localhost/prol-web:latest && systemctl restart prol-web-1.service`.
- El módulo de gestión documental está **en producción y apagado**: `documents_enabled = false` en Academia Digital MX, IBIZA Consultores y Mecanica G3.
- Esquema aplicado con `db push`: 105 sentencias, ninguna destructiva. Respaldo previo en `/opt/prol/backup_20260901_2211_pre_modulo_documental.sql`.
- Volumen `prol_prol_private` creado y montado en `/app/private-uploads`, con `PRIVATE_UPLOAD_DIR` en el env. Verificada la escritura desde el contenedor.

## Session Continuity

Last session: 2026-09-01T21:22:00.000Z
Stopped at: Completados 01-01-PLAN.md y 01-02-PLAN.md
Resume file: None
