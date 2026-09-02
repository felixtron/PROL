---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Documentos nativos y R2
status: executing
stopped_at: "Completado 03-07 — vista del cliente aprobada en pantalla; dev server sigue corriendo en :3000 para 03-08"
last_updated: "2026-09-02T19:40:54.494Z"
last_activity: "2026-09-02 — 03-07 completado: la vista del cliente (identidad, historial, aviso de versión atrasada) se aprobó en pantalla por el usuario, entrando como Acme Corp y como Constructora Delta (respondió literalmente 'LOS VI BIEN AVANZA'). El cambio de logo en vivo sin re-emitir —la única parte que el usuario no ejerció— se cerró aparte por HTTP con hashes reales antes/durante/después y el logo restaurado. Ver 03-07-SUMMARY.md. DOC-04/05/07 pasan a Complete en REQUIREMENTS.md. Sólo queda 03-08 (despliegue a producción) para cerrar la fase 3."
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 16
  completed_plans: 15
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 3 — Procedimientos nativos

## Current Position

Phase: 3 of 6 (Procedimientos nativos)
Plan: 8 of 8 in current phase
Status: Ready to execute
Last activity: 2026-09-02 — 03-07 completado: la vista del cliente (identidad, historial, aviso de versión atrasada) se aprobó en pantalla por el usuario, entrando como Acme Corp y como Constructora Delta (respondió literalmente 'LOS VI BIEN AVANZA'). El cambio de logo en vivo sin re-emitir —la única parte que el usuario no ejerció— se cerró aparte por HTTP con hashes reales antes/durante/después y el logo restaurado. Ver 03-07-SUMMARY.md. DOC-04/05/07 pasan a Complete en REQUIREMENTS.md. Sólo queda 03-08 (despliegue a producción) para cerrar la fase 3.

Progress: [███░░░░░░░] 33% (2 de 6 fases)

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
| Phase 03 P01 | ~45min | 3 tasks | 5 files |
| Phase 03 P02 | ~20min | 3 tasks | 3 files |
| Phase 03 P03 | ~15min | 2 tasks | 2 files |
| Phase 03 P04 | ~20min | 3 tasks | 5 files |
| Phase 03 P05 | ~25min | 3 tasks | 3 files |
| Phase 03 P06 | ~40min | 3 tasks | 6 files |
| Phase 03 P07 | ~35min | 3 tasks | 6 files |

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
- [Phase 03-01]: hashPassword extraído a seed-password.ts (mismos parámetros de scrypt); seed.ts y seed-documents.ts lo importan del mismo sitio para que el login por API no dependa de dos copias que puedan divergir.
- [Phase 03-01]: El upsert de ManualDocument en seedDocumentFixture nunca toca contentHtml ni templateVersion en su rama update, para que re-ejecutar el runner de fixture contra una base viva no pise una edición manual de un consultor real.
- [Phase 03-01]: Logos de la fixture como SVG data-URI en línea (Company.logo pintado directo como src de <img>, patrón de tenant-brand.tsx) — no archivos en public/ ni la conversión a data-URL de certificate-assets.ts, que es sólo para @react-pdf/renderer.
- [Phase 03-01]: El backfill de status = OBSOLETO para vigentes duplicados se ejecutó igual con la base en cero filas relevantes (no-op comprobado con doble ejecución), porque el plan 03-08 repite la misma sentencia SQL contra producción.
- [Phase 03-02]: getAssignmentPanel y getSectionForCompany filtran por status: VIGENTE en vez de max(version); el dedup por documentId se conserva como red de seguridad, no como mecanismo primario.
- [Phase 03-02]: uploadCompanyDocument degrada la VIGENTE anterior a OBSOLETO con un updateMany dentro de la misma transaccion con lock que calcula la version siguiente, antes del create; el invariante de una sola VIGENTE por (documento, empresa) ahora se sostiene tambien para documentos kind FILE.
- [Phase 03-02]: company-project-panel.tsx: nombre resuelto con nameOverride ?? name, segmento de fileName condicional a kind === FILE (sin separador huerfano en nativos), boton de subida oculto para kind !== FILE con etiqueta de tipo+version en su lugar; los documentos nativos se siguen listando.
- [Phase 03-03]: convertDocxToManualHtml usa Promise.resolve({ src: "" }) en convertImage, no {}: ImageAttributes.src es obligatorio en los tipos de mammoth (^1.12.0); el <img> resultante se limpia igual por regex antes de sanear.
- [Phase 03-03]: El .docx de prueba del criterio 6 se fabricó como OOXML genuino (script desechable, no commiteado): ningún .docx real disponible en la máquina pertenece a la consultora de PROL.
- [Phase 03-04]: isTemplateOutdated se extrajo como función exportada de document-identity.ts (no una expresión booleana repetida) para que el aviso de plantilla desactualizada al consultor (getManualDocumentForEdit) y al cliente (DocumentIdentity) no puedan divergir.
- [Phase 03-04]: CompanyDocument.current.updatedAt en getManualDocumentForEdit se resuelve como CompanyDocument.createdAt: el modelo no tiene columna updatedAt propia y añadirla es un cambio de esquema fuera de alcance de este plan; el bucle BORRADOR real (edición en sitio) es del plan 03-05.
- [Phase 03-04]: updateManualDocumentBody verificado con seis pasos contra la base real (script desechable que reutiliza el sanitizeManualHtml real por ruta relativa, no una copia): mismo cuerpo y cuerpo+<script> descartado dejan templateVersion quieta, dos cambios reales la suben a 2 y 3, el primer cuerpo de un FILE la deja en 1 y convierte el kind.
- [Phase 03-05]: startCompanyDocumentDraft exige row.status === VIGENTE antes de copiar (mas alla del texto literal del plan): evita abrir un borrador copiando de una fila OBSOLETO o de otro BORRADOR.
- [Phase 03-05]: ISSUED_AT_FORMAT se exporto desde document-identity.ts para que el historial de DOC-05 use el mismo formateador de fecha que DocumentIdentity, sin redefinir uno nuevo.
- [Phase 03-05]: getCompanyDocumentForClient y getCompanyDocumentForEdit comparten resolveCompanyDocumentAssignment y buildHistoryEntry; la unica diferencia real es el filtro de estatus del historial (sin BORRADOR para el cliente) y la puerta de autorizacion.
- [Phase 03-06]: Publicar vive dentro de document-body-editor.tsx (reutiliza target.version/confirm del editor), no en un archivo aparte bajo companies/[assignmentId]/; puesto a la vista del usuario en el checkpoint y no objetado.
- [Phase 03-06]: DOC-01/02/03/06 NO se marcan Complete pese a instrucción de cierre: company_documents sigue en 0 filas y template_version en 1 tras el checkpoint aprobado — la evidencia de base que se pidió capturar no existe, así que se documenta el hallazgo en vez de redactar el resultado esperado.
- [Phase 03-06b]: El usuario confirmó que aprobó el checkpoint de 03-06 sin ejercitarlo. La brecha se cerró ejercitando las cinco server actions reales por HTTP directo (Next-Action + cookie de sesión real), no repitiendo el checkpoint humano ni fabricando filas con un script que imite la forma de las transacciones. Los ocho pasos del recorrido pasaron contra la base real; DOC-01/02/03/06 pasan a Complete. Ver `03-06-SUMMARY.md`.
- [Phase 03-06b]: El manifest global `.next/server/server-reference-manifest.json` no es fiable para invocar server actions contra un `next dev` con Turbopack en ejecución — sus IDs no coincidían con el proceso vivo (404 "Server action not found"). El manifest correcto es el específico de cada ruta, bajo `.next/dev/server/app/.../page/server-reference-manifest.json`.
- [Phase 03-07]: El checkpoint de la tarea 3 sí se ejerció (LOS VI BIEN AVANZA): el usuario entró como Acme y como Constructora Delta y comparó identidad, tabla de control de cambios y aviso de plantilla desactualizada en pantalla. Sólo el cambio de logo en vivo, que el usuario no pidió, quedó sin presenciar.
- [Phase 03-07]: DOC-04 cierra con evidencia mixta y declarada por partes en REQUIREMENTS.md: render por-empresa (logo/razon social/codigo) aprobado por el usuario en pantalla; el mecanismo de logo-en-vivo-sin-re-emitir se cerro aparte, server-verified por HTTP (login real + tres GET sucesivos a /dashboard/documents/[id]), con md5 del content_html identico en los tres (2148bb78b88c5f17e178401ac625893d) y el logo de Acme restaurado a su valor original al terminar.
- [Phase 03-07]: El scroll horizontal de la tabla del procedimiento en viewport estrecho no se reclama como verificado: se confirmo que el mecanismo CSS existe (manual-content.css), pero nadie lo vio scrollear de verdad.

### Pending Todos

- ~~Falta una segunda empresa en el seed.~~ **RESUELTO en el plan 03-01**: `seedDocumentFixture()` crea Constructora Delta (con logo y razón social propios) además de Acme Corp, aplicada al seed y a la base local.
- **`apps/web/app/surveys/[publicSlug]/`** se sacó del repo (código muerto: importaba `getSurveyByPublicSlug` y `submitSurveyResponse`, que no existen; lo sustituyeron `surveys/answer/` y `surveys/open/`). Copia en el scratchpad de la sesión por si hiciera falta consultarla.

### Blockers/Concerns

- ~~El respaldo de producción puede no estar corriendo.~~ **RESUELTO el 2026-09-01, y era peor de lo supuesto**: el respaldo automático llevaba **sin correr desde el 2026-05-19**. Al migrar a `panel-prosuite-2` no se recreó la entrada del cron, y el script tampoco habría funcionado (invocaba `docker`; el host sólo tiene podman, confirmado). Arreglado en `0e84566`: script agnóstico al runtime, tarball de uploads semanal (a diario llenaba el disco: 56 × 1.5 GB), poda por cantidad. Instalado en el VPS con cron a las 03:00 UTC y verificado de punta a punta.
- ~~El volumen de evidencias no tiene respaldo.~~ **RESUELTO**: `backup.sh` genera `private_<fecha>.tar.gz` a diario, el volumen `prol_prol_private` existe y está montado en producción, y el respaldo corre por cron.
- ~~Falta el cron de `/api/cron/compliance`.~~ **RESUELTO el 2026-09-01**: `/usr/local/bin/prol-compliance-cron.sh` instalado (modo 700) y cron a las 16:15 Europe/Berlin = 08:15 America/Mexico_City. Verificado: 401 sin credencial, exit 0 con ella.
- **El VPS corre un `docker-compose.prod.yml` divergente del repo** (red `traefik` en vez de `dokploy-network`, más variables de Turnstile, todo sin commitear allí). **No afecta al despliegue por la ruta canónica** —`git archive` a `/opt/prol-deploy-$SHA` + quadlets, que no toca `/opt/prol`— pero rompería la sección "Re-deploy" de DEPLOY.md, que hace `git pull` en el host. No usar esa ruta sin reconciliar antes.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.
- **Los ejecutores en paralelo se pisan el índice de git.** En la ola 1 de la fase 1, dos agentes sobre el mismo working tree (`branching_strategy: "none"`) se absorbieron mutuamente archivos entre el `add` y el `commit`. El contenido quedó íntegro, la atribución cruzada. **Antes de la fase 2 hay que serializarlos o darle worktree a cada uno**: las fases 2-7 tienen varios planes por ola.
- **Trampa operativa: `grep` no es seguro para canalizar credenciales por SSH en esta máquina.** Encontrado durante el despliegue de R2 a producción (plan 02-04): un hook local de shell (`rtk`) reescribe la invocación de `grep` incluso en mitad de una tubería, y en vez del `VAR=valor` esperado se agrega la salida formateada del propio `rtk` (líneas `path:línea:contenido`) con el valor real incrustado en una línea que no es `VAR=valor`. Se detectó de inmediato porque el conteo de verificación posterior dio 0 en vez de 4; ningún valor de credencial llegó a salida visible ni a git. **Usar `awk` o una variable de shell capturada para mover valores sensibles**; `grep` sigue siendo seguro para contar después (paso de verificación), no para copiar antes. Documentado en `DEPLOY.md` §7c.
- ~~Plan 03-07 necesita company_documents poblada (Acme v2 VIGENTE/v1 OBSOLETO, Delta v1 VIGENTE) para demostrar sus propios criterios, pero el checkpoint aprobado del plan 03-06 no dejó esa evidencia en la base: company_documents sigue en 0 filas y P-RFC-4.1-01 sigue en template_version=1. Alguien debe emitir realmente el documento a las dos empresas por la interfaz antes o al inicio de 03-07.~~ **RESUELTO 2026-09-02 (03-06b)**: el usuario confirmó llanamente que aprobó el checkpoint sin ejercitarlo. Se cerró la brecha invocando las cinco server actions reales (`updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`) por HTTP directo contra el servidor de desarrollo — header `Next-Action` + cookie de sesión real de `admin@prol.prosuite.pro`, no un script que imite su forma. Los ocho pasos del recorrido (editar, sin-cambios, editar de nuevo, importar un `.docx` real con tabla de celda combinada, emitir a Acme y Constructora Delta, editar la plantilla sin mover lo ya congelado, borrador único e idempotente con dos guardados, publicar con degradación) pasaron contra la base real, verificados paso a paso, con el invariante de una sola VIGENTE reconfirmado en tres puntos de control. Base actual: `P-RFC-4.1-01.template_version=5`, Acme en `v2 VIGENTE`/`v1 OBSOLETO`, Constructora Delta en `v1 VIGENTE` — datos reales, dejados en la base a propósito para que 03-07 los use. DOC-01/02/03/06 pasan a `Complete` en `REQUIREMENTS.md`. Ver `03-06-SUMMARY.md` §"Cierre de la brecha (03-06b)" para la traza completa con valores reales. Fixture de regresión de la fase 1 reconfirmado intacto (2 companies, 2 evidences con form_snapshot, `prol-db` sin reinicios).

## Estado de producción (2026-09-01)

- Desplegado `55c020d` en `panel-prosuite-2` (anterior: `64f7476`). Los alias `panel-prosuite-2` y `propodvps2` resuelven al **mismo host** (`195.26.255.71`, hostname real `propodvps2`). Rollback de imagen: `podman tag localhost/prol-web:64f7476 localhost/prol-web:latest && systemctl restart prol-web-1.service` (no ejecutado, no hizo falta; imágenes `64f7476`, `5323a42`, `7c287e8` siguen tagueadas).
- **Backend de almacenamiento confidencial: R2 activo.** Las cuatro variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) están en `/etc/containers/env/prol-web-1.env` (600, root), aplicadas por SSH — nunca sus valores. Verificado: 4 variables dentro del contenedor, 0 apariciones de "Configuración de R2 incompleta" en `journalctl`, `/api/health` y `/sign-in` en 200. Rollback de una variable (quitar `R2_BUCKET` y reiniciar) verificado de punta a punta en local (plan 02-03), no ejecutado en producción.
- El módulo de gestión documental está **en producción y apagado**: `documents_enabled = false` en Academia Digital MX, IBIZA Consultores y Mecanica G3. Con el módulo apagado, el camino de escritura a R2 no se ha ejercitado por la interfaz en producción — sólo en local (planes 02-02/02-03) contra el bucket real.
- Volumen `prol_prol_private` montado en `/app/private-uploads`, y confirmado **vacío (0 archivos)** justo antes de este despliegue: la receta de migración disco → R2 de `DEPLOY.md` §7c sigue sin ejecutarse contra el host porque es un no-op genuino, no uno asumido.
- **Desfase repo ↔ producción RESUELTO**: `55c020d` ya incluye el tipado de `formSnapshot` (`b697b3b`, `ab975e2`) que `64f7476` no traía.
- Esquema: `prisma migrate diff` en preview contra la base real de producción devolvió una migración vacía (0 sentencias) — la fase 2 no toca Prisma, confirmado, no asumido. No se corrió ningún `db push`.
- Respaldo: cron diario a las 03:00 UTC. Cadencia db+privado diaria, uploads semanal (domingos), poda por cantidad. Estado estable ≈ 12 GB sobre 116 GB libres.

## Session Continuity

Last session: 2026-09-02T19:37:10.392Z
Stopped at: Completado 03-07 — vista del cliente aprobada en pantalla; dev server sigue corriendo en :3000 para 03-08
Resume file: None
