---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Documentos nativos y R2
status: "Fase 3.1 en curso: plan 05 (submitEvidence sin exigencia de archivo para FILE, /api/upload/evidence retirado, DRV-04 Complete) ejecutado. Queda el plan 06 (despliegue). Fase 4 (Puente HTML→PDF) sin planificar todavía (plans: TBD en ROADMAP.md)."
stopped_at: "Completado 03.1-05 — un requisito FILE se cumple sin archivo, circuito entero verificado, DRV-04 Complete, DRV-02 sigue Pending"
last_updated: "2026-09-03T03:56:14.379Z"
last_activity: "2026-09-03 — 03.1-05 completado: submitEvidence dejó de exigir (y de aceptar) archivo para kind FILE; el guard se quitó con el create ya null-safe desde antes. EvidenceBlock reescribió su rama FILE con el DriveFolderLink compartido (03.1-04) + botón 'Marcar como cumplido', sin fetch previo. /api/upload/evidence se retiró tras confirmar cero llamantes por grep. Circuito completo (ocho pasos, tres sesiones HTTP reales) verificado contra la base: entrega sin archivo con file_key NULL, rechazo de segunda PENDING, Pendiente→En revisión→Requiere corrección→Pendiente→Aprobada recorrido entero, actividad cerrada y ciclo 2 programado con due_at (periodicidad semestral), bitácora con las seis acciones y su autor, empresa ajena rechazada, agenda mostrando la actividad nueva en los dos paneles. Requisito y datos de prueba fabricados y borrados al cierre (deleteEvidenceRequirement rehusó por guarda de auditoría intencional; limpieza por SQL directo). DRV-04 pasa a Complete. DRV-02 sigue Pending: la evidencia de este plan es enteramente servidor-verificada, sin el clic humano hacia una carpeta real de Drive. Ver 03.1-05-SUMMARY.md."
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 22
  completed_plans: 21
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.
**Current focus:** Phase 3.1 — Ibiza Experts 360 y Drive (plan 5/6 ejecutado, DRV-04 Complete, DRV-02 pendiente)

## Current Position

Phase: 3.1 of 6 (Ibiza Experts 360 y Drive) — INSERTED, 5/6 planes ejecutados
Plan: 5 of 6 in current phase — completado (circuito de ocho pasos verificado por HTTP real, DRV-04 Complete)
Status: Fase 3.1 en curso: plan 05 (submitEvidence sin exigencia de archivo para FILE, /api/upload/evidence retirado, DRV-04 Complete) ejecutado. Queda el plan 06 (despliegue). Fase 4 (Puente HTML→PDF) sin planificar todavía (plans: TBD en ROADMAP.md).
Last activity: 2026-09-03 — 03.1-05 completado: submitEvidence dejó de exigir (y de aceptar) archivo para kind FILE; el guard se quitó con el create ya null-safe desde antes. EvidenceBlock reescribió su rama FILE con el DriveFolderLink compartido (03.1-04) + botón "Marcar como cumplido", sin fetch previo. /api/upload/evidence se retiró tras confirmar cero llamantes por grep. Circuito completo (ocho pasos, tres sesiones HTTP reales) verificado contra la base: entrega sin archivo con file_key NULL, rechazo de segunda PENDING, Pendiente→En revisión→Requiere corrección→Pendiente→Aprobada recorrido entero, actividad cerrada y ciclo 2 programado con due_at (periodicidad semestral), bitácora con las seis acciones y su autor, empresa ajena rechazada, agenda mostrando la actividad nueva en los dos paneles. Requisito y datos de prueba fabricados y borrados al cierre (deleteEvidenceRequirement rehusó por guarda de auditoría intencional; limpieza por SQL directo). DRV-04 pasa a Complete. DRV-02 sigue Pending: la evidencia de este plan es enteramente servidor-verificada, sin el clic humano hacia una carpeta real de Drive. Ver 03.1-05-SUMMARY.md.

Progress: [█████████░] 95% (21 de 22 planes)

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
| Phase 03 P08 | tareas 1-2 no cronometrables (aprobación humana + despliegue en sesión previa); continuación tareas 3-4 ~25min | 4 tasks | 1 files |
| Phase 03.1 P01 | ~55min | 3 tasks | 6 files |
| Phase 03.1 P02 | ~20min (continuación; tareas 1-2 en sesión previa) | 3 tasks | 0 files |
| Phase 03.1 P03 | ~50min | 3 tasks | 4 files |
| Phase 03.1 P04 | ~25min (continuación) | 3 tasks | 7 files |
| Phase 03.1 P05 | ~50min | 3 tasks | 6 files (1 borrado) |

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
- [Phase 03-08]: Usuario aprobo el despliegue con "Desplegar igual, fijando el SHA" (equivalente a la opcion desplegar-ahora del checkpoint), tras revisar alcance, riesgo, rollback y verificacion. Produccion corre desde el 2026-09-02 la imagen 04135ca, con el esquema del documento nativo aplicado (2 enums, 14 columnas) y el backfill del invariante confirmado como no-op genuino (company_documents en 0 filas antes y despues).
- [Phase 03-08]: El arreglo del 401 (5e2352d), pendiente desde la fase 2, se confirmo EN VIVO en produccion: GET /files/evidence/<inexistente> sin sesion responde 401 (antes de este despliegue respondia 403). R2-03 queda confirmado tambien en produccion, no solo en local.
- [Phase 03-08]: documents_enabled NO se toco en ningun tenant. Decision explicita del usuario: dejarlo tal como esta. Ver correccion del registro mas abajo.
- [Phase 03-08]: La confirmacion visual humana sobre produccion (tarea 3 del plan: login, panel, descarga) no se dio por aprobada sin haber ocurrido. Se declaro pendiente explicitamente, con el rollback de un comando disponible — precedente directo: en el plan 03-06 un checkpoint se registro como aprobado sin haberse ejercitado, y no se queria repetir el error.
- [Phase 03.1]: [Phase 03.1-01] Caso A de commit sobre schema.prisma: el árbol ya estaba limpio (prol-1d había commiteado DC-3 antes de este plan), git add directo sin construir blob.
- [Phase 03.1]: [Phase 03.1-01] El dev server persistente en :3000 tenía el Prisma Client cacheado en memoria (PrismaClientValidationError sobre documentsMenuLabel); se reinició el proceso para que recogiera el cliente regenerado por db push.
- [Phase 03.1-02]: Checkpoint ejercitado (no aprobado en blanco): el usuario confirmo las tres respuestas del resume-signal via Q&A estructurada. El panel de consultor, no visto por el usuario, se cerro con HTTP real (login + GET autenticado) en vez de inferirse del codigo compartido.
- [Phase 03.1-03]: Task 3 (verificación con cuatro sesiones reales + un tenant desechable) no produjo cambios de código: no hay commit de tarea para ella, sólo la evidencia documentada en 03.1-03-SUMMARY.md. El script desechable se escribió temporalmente dentro de packages/db/ (para resolución de módulos de tsx) y se borró antes de terminar; nunca apareció en un commit ni quedó en git status.
- [Phase 03.1-03]: El manifest de server actions correcto para invocar por HTTP sigue siendo el de la ruta específica (.next/dev/server/app/tenant-admin/projects/[assignmentId]/page/server-reference-manifest.json), no el global — mismo hallazgo que 03-06b.
- [Phase 03.1-04]: driveUrl se llevó al cliente por la guarda (requireAssignmentMemberAccess), opción 1 del plan — un solo sitio que también resuelve lo que 03.1-05 necesita para getSectionForCompany.
- [Phase 03.1-04]: El checkpoint de la tarea 3 se aprobó SIN ejercitarse, dos veces ("aprobado"/"continua"), sin enlace real de Drive ni respuesta al resume-signal, pese a que se le dijo al usuario que DRV-02 quedaría sin marcar. Se registró como aprobación informada de no ejercitar, no como verificación — DRV-02 permanece Pending. Precedente aplicado: plan 03-06.
- [Phase 03.1-04]: Se encontró un enlace real de Drive puesto en el proyecto equivocado ("Manual de prueba OPS-04", que el guion del checkpoint esperaba sin enlace) en vez del proyecto que el guion pedía usar (ISO 9001, que estaba en NULL). Restaurado a NULL en las tres filas al cerrar el plan, sin poder determinar si esto contribuyó a que el checkpoint no se ejerciera.
- [Phase 03.1-05]: submitEvidence deja de exigir y de aceptar archivo para kind FILE; /api/upload/evidence se retiró tras confirmar cero llamantes por grep. Las cuatro columnas de archivo se escriben null explícitamente, conservadas en el esquema para las filas históricas.
- [Phase 03.1-05]: deleteEvidenceRequirement rehusó borrar el requisito de prueba por una guarda de auditoría intencional (evidencias ya entregadas); la limpieza del fixture se hizo por SQL directo, no es un bug del plan ni del código existente.
- [Phase 03.1-05]: DRV-04 pasa a Complete con evidencia server-verificada de ocho pasos; DRV-02 permanece Pending porque este plan usó un enlace de Drive deliberadamente ficticio y no aporta el clic humano hacia una carpeta real que 03.1-04 dejó pendiente.

### Pending Todos

- ~~Falta una segunda empresa en el seed.~~ **RESUELTO en el plan 03-01**: `seedDocumentFixture()` crea Constructora Delta (con logo y razón social propios) además de Acme Corp, aplicada al seed y a la base local.
- **`apps/web/app/surveys/[publicSlug]/`** se sacó del repo (código muerto: importaba `getSurveyByPublicSlug` y `submitSurveyResponse`, que no existen; lo sustituyeron `surveys/answer/` y `surveys/open/`). Copia en el scratchpad de la sesión por si hiciera falta consultarla.
- **Confirmación visual humana sobre producción, pendiente (03-08).** Falta que el usuario entre a `https://prol.prosuite.pro`, vea el panel normal y descargue algo que ya funcionara antes (certificado o PDF de resultados). No bloqueante: todo lo automatizable ya se confirmó y el rollback de un comando (`podman tag localhost/prol-web:55c020d localhost/prol-web:latest && systemctl restart prol-web-1.service`) está listo si algo apareciera mal.
- ~~Sesión concurrente en el mismo working tree.~~ **RESUELTO al ejecutar 03.1-01**: al empezar el plan, `git diff --stat -- packages/db/prisma/schema.prisma` estaba vacío — la sesión `prol-1d` ya había commiteado su trabajo de DC-3 antes de que este plan tocara el árbol (confirmado también por los commits `f41f286`/`d67f453`/`2bebc00` de planificación de esta misma fase). Se dio el Caso A previsto por el plan: `git add` directo sobre `schema.prisma`, sin construir un blob. El árbol sigue limpio tras el commit. Cualquier operación futura sobre este árbol debe seguir revisando `git status` antes de tocar nada destructivo, por si otra sesión vuelve a entrar.
- **DRV-02 pendiente (03.1-04).** El checkpoint que debía confirmar que el clic hacia "Abrir la carpeta de Drive" aterriza en una carpeta real se aprobó dos veces sin ejercitarse: falta que un usuario con una cuenta de Drive real entre como administrador, pegue su enlace en el proyecto ISO 9001 de Acme, y confirme que el botón lo lleva ahí desde el panel del cliente y desde la ficha de revisión del consultor. No bloqueante para 03.1-05/06: toda la evidencia server-side (href idéntico a la columna, sin fuga entre empresas) ya está cerrada. Ver `03.1-04-SUMMARY.md` §"Tarea 3: aprobado sin ejercitar".

### Blockers/Concerns

- ~~El respaldo de producción puede no estar corriendo.~~ **RESUELTO el 2026-09-01, y era peor de lo supuesto**: el respaldo automático llevaba **sin correr desde el 2026-05-19**. Al migrar a `panel-prosuite-2` no se recreó la entrada del cron, y el script tampoco habría funcionado (invocaba `docker`; el host sólo tiene podman, confirmado). Arreglado en `0e84566`: script agnóstico al runtime, tarball de uploads semanal (a diario llenaba el disco: 56 × 1.5 GB), poda por cantidad. Instalado en el VPS con cron a las 03:00 UTC y verificado de punta a punta.
- ~~El volumen de evidencias no tiene respaldo.~~ **RESUELTO**: `backup.sh` genera `private_<fecha>.tar.gz` a diario, el volumen `prol_prol_private` existe y está montado en producción, y el respaldo corre por cron.
- ~~Falta el cron de `/api/cron/compliance`.~~ **RESUELTO el 2026-09-01**: `/usr/local/bin/prol-compliance-cron.sh` instalado (modo 700) y cron a las 16:15 Europe/Berlin = 08:15 America/Mexico_City. Verificado: 401 sin credencial, exit 0 con ella.
- **El VPS corre un `docker-compose.prod.yml` divergente del repo** (red `traefik` en vez de `dokploy-network`, más variables de Turnstile, todo sin commitear allí). **No afecta al despliegue por la ruta canónica** —`git archive` a `/opt/prol-deploy-$SHA` + quadlets, que no toca `/opt/prol`— pero rompería la sección "Re-deploy" de DEPLOY.md, que hace `git pull` en el host. No usar esa ruta sin reconciliar antes.
- **La fase 4 tiene una incógnita real**: si `<View fixed>` de react-pdf repite la cabecera de tabla entre páginas. Spike de una hora como primera tarea, con fallback ya definido.
- **Los ejecutores en paralelo se pisan el índice de git.** En la ola 1 de la fase 1, dos agentes sobre el mismo working tree (`branching_strategy: "none"`) se absorbieron mutuamente archivos entre el `add` y el `commit`. El contenido quedó íntegro, la atribución cruzada. **Antes de la fase 2 hay que serializarlos o darle worktree a cada uno**: las fases 2-7 tienen varios planes por ola.
- **Trampa operativa: `grep` no es seguro para canalizar credenciales por SSH en esta máquina.** Encontrado durante el despliegue de R2 a producción (plan 02-04): un hook local de shell (`rtk`) reescribe la invocación de `grep` incluso en mitad de una tubería, y en vez del `VAR=valor` esperado se agrega la salida formateada del propio `rtk` (líneas `path:línea:contenido`) con el valor real incrustado en una línea que no es `VAR=valor`. Se detectó de inmediato porque el conteo de verificación posterior dio 0 en vez de 4; ningún valor de credencial llegó a salida visible ni a git. **Usar `awk` o una variable de shell capturada para mover valores sensibles**; `grep` sigue siendo seguro para contar después (paso de verificación), no para copiar antes. Documentado en `DEPLOY.md` §7c.
- ~~Plan 03-07 necesita company_documents poblada (Acme v2 VIGENTE/v1 OBSOLETO, Delta v1 VIGENTE) para demostrar sus propios criterios, pero el checkpoint aprobado del plan 03-06 no dejó esa evidencia en la base: company_documents sigue en 0 filas y P-RFC-4.1-01 sigue en template_version=1. Alguien debe emitir realmente el documento a las dos empresas por la interfaz antes o al inicio de 03-07.~~ **RESUELTO 2026-09-02 (03-06b)**: el usuario confirmó llanamente que aprobó el checkpoint sin ejercitarlo. Se cerró la brecha invocando las cinco server actions reales (`updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`) por HTTP directo contra el servidor de desarrollo — header `Next-Action` + cookie de sesión real de `admin@prol.prosuite.pro`, no un script que imite su forma. Los ocho pasos del recorrido (editar, sin-cambios, editar de nuevo, importar un `.docx` real con tabla de celda combinada, emitir a Acme y Constructora Delta, editar la plantilla sin mover lo ya congelado, borrador único e idempotente con dos guardados, publicar con degradación) pasaron contra la base real, verificados paso a paso, con el invariante de una sola VIGENTE reconfirmado en tres puntos de control. Base actual: `P-RFC-4.1-01.template_version=5`, Acme en `v2 VIGENTE`/`v1 OBSOLETO`, Constructora Delta en `v1 VIGENTE` — datos reales, dejados en la base a propósito para que 03-07 los use. DOC-01/02/03/06 pasan a `Complete` en `REQUIREMENTS.md`. Ver `03-06-SUMMARY.md` §"Cierre de la brecha (03-06b)" para la traza completa con valores reales. Fixture de regresión de la fase 1 reconfirmado intacto (2 companies, 2 evidences con form_snapshot, `prol-db` sin reinicios).

## Estado de producción (actualizado 2026-09-02, plan 03-08)

- **Desplegado `04135ca` en `panel-prosuite-2`** (anteriores, ambas siguen tagueadas para rollback de dos niveles: `55c020d` y `64f7476`). Los alias `panel-prosuite-2` y `propodvps2` resuelven al **mismo host** (`195.26.255.71`, hostname real `propodvps2`). Rollback de imagen: `podman tag localhost/prol-web:55c020d localhost/prol-web:latest && systemctl restart prol-web-1.service` (no ejecutado, no hizo falta).
- **Esquema del documento nativo APLICADO en producción.** `db push` con el schema que trae la imagen `04135ca`, ejecutado **antes** de mover `latest`: 2 `CREATE TYPE` (`ManualDocumentKind`, `CompanyDocumentStatus`) y 14 columnas (3 en `manual_documents`, 10 nuevas + 4 relajadas a nullable en `company_documents`). Releído directo de la base real de producción, no asumido del preview. Dump previo en `/opt/prol/backup_20260902_1953_pre_fase3.sql` (3.4M). `company_documents` tenía 0 filas antes del push y sigue en 0 después: el backfill del invariante fue un **no-op genuino**, comprobado, no supuesto — cero pares con más de una fila `VIGENTE`.
- **El arreglo del 401 (`5e2352d`), pendiente desde la fase 2, está EN VIVO en producción**: `GET https://prol.prosuite.pro/files/evidence/<inexistente>` sin sesión responde `401` (antes de este despliegue respondía `403`). R2-03 queda confirmado también en producción, no sólo en local (ver `REQUIREMENTS.md`).
- **`documents_enabled` — REGISTRO CORREGIDO.** El párrafo anterior de esta sección decía "false en Academia Digital MX, IBIZA Consultores y Mecanica G3", heredado del cierre de la fase 2. Es **falso para IBIZA** y lo era ya antes de la fase 3: releído directo de la base de producción el 2026-09-02, es `academia-digital=false`, `mecanica-g3=false`, **`ibiza-online=true`**. Nadie de la fase 3 encendió esa bandera; el usuario decidió explícitamente dejarla así (IBIZA es su propia consultoría, sin manuales creados: `company_documents` en 0 filas en los tres tenants, así que hoy no hay ningún contenido expuesto). Consecuencia asumida: un administrador de IBIZA puede abrir "Manuales" en producción y, si construyera uno, ejercitar de verdad el editor de la fase 3 — para Academia Digital MX y Mecanica G3 el módulo sigue exactamente igual de apagado que antes. Ver `DEPLOY.md` §7d y `03-08-SUMMARY.md`.
- **Backend de almacenamiento confidencial: R2 sigue activo**, sin cambios en este despliegue. Las cuatro variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) siguen en `/etc/containers/env/prol-web-1.env` (600, root). Log de arranque tras el reinicio del 2026-09-02 sin "Configuración de R2 incompleta".
- Volumen `prol_prol_private` sigue montado en `/app/private-uploads`; su estado de ocupación no se re-verificó en este plan (no era su alcance).
- **Confirmación visual humana sobre producción: PENDIENTE.** Lo automatizable (servicio activo, `/api/health` y `/sign-in` en 200, esquema y enums correctos, invariante sano, 401 en vivo) está confirmado por este agente contra la base y los endpoints reales. Falta que el propio usuario entre al panel, lo vea normal y descargue un certificado o PDF de resultados. No se declara aprobado sin haber ocurrido — precedente: el plan 03-06 registró un checkpoint como aprobado sin ejercitarlo, y el error sólo se descubrió después.
- Respaldo: cron diario a las 03:00 UTC, sin cambios en este plan. Cadencia db+privado diaria, uploads semanal (domingos), poda por cantidad.

## Session Continuity

Last session: 2026-09-03T03:56:14.379Z
Stopped at: Completado 03.1-05 — un requisito FILE se cumple sin archivo, circuito entero verificado, DRV-04 Complete, DRV-02 sigue Pending
Resume file: None

**Nota de concurrencia**: al cerrar esta sesión, otra sesión interactiva (`prol-1d`) tiene trabajo de DC-3 sin commitear en este mismo working tree (~18 archivos, incluido `packages/db/prisma/schema.prisma`). No fue tocado por 03-08.
