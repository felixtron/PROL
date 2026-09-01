# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 1 — Higiene y operación

## Current Position

Phase: 1 of 7 (Higiene y operación)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-01 — Milestone v1.1 abierto: `.planning/` sembrado desde el plan aprobado, codebase mapeado

Progress: [░░░░░░░░░░] 0%

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

## Accumulated Context

### Decisions

Las decisiones se registran en la tabla Key Decisions de PROJECT.md.
Decisiones recientes que afectan al trabajo actual:

- Cuerpo del documento en HTML saneado; parte llenable en JSON tipado con Zod. Híbrido deliberado: los dos arquetipos del piloto están en extremos opuestos del espectro.
- Los registros llenos van a una tabla nueva `CompanyRecord`, no a `CompanyDocument`, que está claveada por versión y no tiene dimensión de periodo.
- R2 sólo para el tier confidencial, tras feature flag, con rollback quitando una variable de entorno.

### Pending Todos

- **Falta una segunda empresa en el seed.** El seed crea sólo Acme Corp, y el criterio 1 de la fase 3 exige emitir el mismo documento a dos empresas distintas para comprobar la personalización. Crear la segunda antes de verificar esa fase.
- **`apps/web/app/surveys/[publicSlug]/`** se sacó del repo (código muerto: importaba `getSurveyByPublicSlug` y `submitSurveyResponse`, que no existen; lo sustituyeron `surveys/answer/` y `surveys/open/`). Copia en el scratchpad de la sesión por si hiciera falta consultarla.

### Blockers/Concerns

- **El respaldo de producción puede no estar corriendo.** `scripts/backup.sh` invoca `docker`, y DEPLOY.md documenta que el host sólo tiene podman. Hace falta un diagnóstico por SSH antes de dar por buena la fase 1; el arreglo del script no sirve de nada si el cron nunca lo ejecuta.
- **El volumen de evidencias no tiene respaldo hoy.** Es el riesgo de mayor severidad del milestone y no es una funcionalidad.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.

## Session Continuity

Last session: 2026-09-01
Stopped at: `.planning/` sembrado (PROJECT, REQUIREMENTS, ROADMAP, STATE, config) y mapa del codebase generado. Listo para `/gsd:plan-phase 1`.
Resume file: None
