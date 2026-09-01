---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Documentos nativos y R2
status: executing
stopped_at: Completados 01-01-PLAN.md y 01-02-PLAN.md
last_updated: "2026-09-01T22:54:56.087Z"
last_activity: "2026-09-01 — Planes 01-01 y 01-02 completados: respaldo del volumen privado + compose coherente; lock de fila en uploadCompanyDocument y helper de data-URL unificado"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 2 — R2 para el tier confidencial

## Current Position

Phase: 2 of 7 (R2 para el tier confidencial)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-01 — Fase 1 completa y verificada (8/8 must-haves). Módulo desplegado a producción apagado; respaldo automático restaurado tras 3 meses y medio parado.

Progress: [█░░░░░░░░░] 14% (1 de 7 fases)

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
- ~~El volumen de evidencias no tiene respaldo.~~ **RESUELTO**: `backup.sh` genera `private_<fecha>.tar.gz` a diario, el volumen `prol_prol_private` existe y está montado en producción, y el respaldo corre por cron.
- ~~Falta el cron de `/api/cron/compliance`.~~ **RESUELTO el 2026-09-01**: `/usr/local/bin/prol-compliance-cron.sh` instalado (modo 700) y cron a las 16:15 Europe/Berlin = 08:15 America/Mexico_City. Verificado: 401 sin credencial, exit 0 con ella.
- **El VPS corre un `docker-compose.prod.yml` divergente del repo** (red `traefik` en vez de `dokploy-network`, más variables de Turnstile, todo sin commitear allí). **No afecta al despliegue por la ruta canónica** —`git archive` a `/opt/prol-deploy-$SHA` + quadlets, que no toca `/opt/prol`— pero rompería la sección "Re-deploy" de DEPLOY.md, que hace `git pull` en el host. No usar esa ruta sin reconciliar antes.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.
- **Los ejecutores en paralelo se pisan el índice de git.** En la ola 1 de la fase 1, dos agentes sobre el mismo working tree (`branching_strategy: "none"`) se absorbieron mutuamente archivos entre el `add` y el `commit`. El contenido quedó íntegro, la atribución cruzada. **Antes de la fase 2 hay que serializarlos o darle worktree a cada uno**: las fases 2-7 tienen varios planes por ola.

## Estado de producción (2026-09-01)

- Desplegado `64f7476` en `panel-prosuite-2`. Rollback: `podman tag localhost/prol-web:5323a42 localhost/prol-web:latest && systemctl restart prol-web-1.service`.
- El módulo de gestión documental está **en producción y apagado**: `documents_enabled = false` en Academia Digital MX, IBIZA Consultores y Mecanica G3.
- Esquema aplicado con `db push`: 105 sentencias, ninguna destructiva. Respaldo previo en `/opt/prol/backup_20260901_2211_pre_modulo_documental.sql`.
- Volumen `prol_prol_private` creado y montado en `/app/private-uploads`, con `PRIVATE_UPLOAD_DIR` en el env. Verificada la escritura desde el contenedor.
- **Desfase repo ↔ producción**: `64f7476` incluye el módulo y el lock de versión (`160bc5a`), pero **NO el tipado de `formSnapshot`** (`b697b3b`, `ab975e2`), que se commiteó después. Sin impacto mientras el módulo esté apagado; entra en el próximo despliegue.
- Respaldo: cron diario a las 03:00 UTC. Cadencia db+privado diaria, uploads semanal (domingos), poda por cantidad. Estado estable ≈ 12 GB sobre 116 GB libres.

## Session Continuity

Last session: 2026-09-01T21:22:00.000Z
Stopped at: Completados 01-01-PLAN.md y 01-02-PLAN.md
Resume file: None
