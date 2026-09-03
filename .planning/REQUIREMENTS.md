# Requirements: PROL — v1.1 Documentos nativos y R2

**Defined:** 2026-09-01
**Core Value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.

## v1.1 Requirements

Requisitos de este milestone. Cada uno se mapea a una fase del roadmap.

### Documentos nativos

- [x] **DOC-01**: El consultor redacta un procedimiento dentro de la plataforma, sin producir ni intercambiar un `.docx`.
- [x] **DOC-02**: Importar un `.docx` conserva sus tablas al convertirlo y sanearlo.
- [x] **DOC-03**: Emitir para una empresa congela el cuerpo: editar la plantilla después no altera lo ya emitido.
- [x] **DOC-04**: La misma plantilla se ve con el logo, la razón social y el código documental de cada empresa.
- [x] **DOC-05**: El historial muestra versión, fecha, autor, descripción del cambio y estatus.
- [x] **DOC-06**: Editar un documento vigente abre un borrador; sólo publicar crea una versión nueva.
- [x] **DOC-07**: El cliente ve cuándo su versión quedó atrás respecto a la plantilla del consultor.

### Navegación y gestión documental en Drive

- [x] **NAV-01**: Las funciones del módulo viven bajo un menú desplegable único, cuyo rótulo define cada tenant.
- [x] **NAV-02**: El agrupamiento aparece en los paneles de administrador, consultor y cliente.
- [x] **NAV-03**: La interfaz distingue Manuales Maestros (plantillas) de Proyectos (implementaciones por empresa).
- [x] **DRV-01**: Cada proyecto guarda el enlace a su carpeta de Google Drive, editable por el administrador.
- [ ] **DRV-02**: Abrir Evidencias desde un proyecto lleva al enlace de Drive configurado.
- [x] **DRV-03**: Sólo se aceptan URLs de Google Drive, y un proyecto sin enlace lo dice en vez de fallar.
- [ ] **DRV-04**: Un requisito se da por cumplido sin subir archivo a PROL, conservando actividad, periodicidad, aprobación y bitácora.

### Registros nativos

- [ ] **REG-01**: El consultor define la estructura de un formato con bloques, sin escribir código.
- [ ] **REG-02**: El cliente llena el registro en pantalla y guarda borrador sin generar versiones.
- [ ] **REG-03**: Enviarlo congela los valores como evidencia y entra al flujo de aprobación existente.
- [ ] **REG-04**: El revisor ve el snapshot con la misma maqueta que llenó el cliente.
- [ ] **REG-05**: Un registro semestral o anual programa su siguiente ciclo al aprobarse.
- [ ] **REG-06**: Una sección puede exigir a la vez un registro nativo y archivos adjuntos, como requisitos separados.

### Exportación

- [ ] **PDF-01**: Todo documento nativo se descarga en PDF con encabezado ISO y pie numerado.
- [ ] **PDF-02**: Las tablas salen con bordes y ninguna fila se parte entre páginas.
- [ ] **PDF-03**: El PDF de una evidencia se renderiza desde el snapshot y nunca desde el dato vivo.
- [ ] **PDF-04**: Cambiar el logo de una empresa actualiza sus PDFs sin regenerar nada.

### Almacenamiento

- [x] **R2-01**: Evidencias y plantillas confidenciales viven en R2, sin cambiar el esquema ni el cliente.
- [x] **R2-02**: Los archivos anteriores a la migración siguen descargándose sin tocar la base.
- [x] **R2-03**: `/files/*` sigue autorizando contra la base: 403 desde otra empresa, 401 sin sesión.
- [x] **R2-04**: Quitar una variable de entorno devuelve la app al disco local, sin desplegar código.
- ~~**R2-05**~~: ~~El cliente sube evidencias de más de 25 MB por URL firmada, con progreso visible.~~ — **fuera de alcance desde el 2026-09-02**: las evidencias pesadas viven en Drive.
- ~~**R2-06**~~: ~~Una subida firmada que exceda el tope o mienta en su MIME se rechaza al confirmarla.~~ — **fuera de alcance**, mismo motivo.

### Operación y deuda

- [x] **OPS-01**: El respaldo diario incluye el volumen de evidencias.
- [x] **OPS-02**: `docker-compose.prod.yml` declara el volumen privado que producción ya monta.
- [x] **OPS-03**: Incrementar la versión de un documento de empresa toma lock y no puede colisionar.
- [x] **OPS-04**: `formSnapshot` se lee con un tipo discriminado y versionado, con rama legacy.
- [x] **OPS-05**: Toda consulta de "documento vigente" filtra por estatus, no por versión máxima.

## Out of Scope

- **Adjuntos dentro de un registro** (un bloque cuyo valor es un `fileKey`) — diferido y nombrado para que nadie lo improvise. El caso se cubre declarando dos requisitos en la misma sección (REG-06).
- **Bloques `signature`, `computed` y `matrix`** — el primero y el segundo se difieren; el tercero ya existe como `RiskAssessment`.
- **`rowspan` en el PDF** — exige un motor de maquetación real. La celda se renderiza en su propia fila y se registra un aviso.
- **Imágenes remotas (`https://`) en el PDF** — no se descargan: SSRF y latencia. Se dibuja un marcador de posición.
- **Versionado del contenido de las secciones del manual** — sólo se congela el de los documentos. Brecha remanente declarada.
- **Exportación masiva de documentos** — el limitador de 60 peticiones/minuto por IP de `/api/*` la haría fallar sin mensaje útil.
- **Migrar el tier público de archivos a R2** — sus URLs están incrustadas en el markdown de `Lesson.content`.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 1 | Complete |
| OPS-02 | Phase 1 | Complete |
| OPS-03 | Phase 1 | Complete |
| OPS-04 | Phase 1 | Complete |
| R2-01 | Phase 2 | Complete (02-02: `document-storage.ts` escribe y lee de R2 con `STORAGE_BACKEND`; dos evidencias reales verificadas en `ibizadata` bajo `prol/evidence/`, sin cambios de esquema ni de cliente. **Confirmado también en producción en 02-04**: imagen `55c020d` desplegada con las cuatro variables R2 activas — pero con `documents_enabled = false` en los tres tenants, nadie puede ejercitar el camino de escritura por la interfaz en producción; sólo se verificó que el backend está activo y sano, no que una evidencia real se haya escrito en el bucket desde producción) |
| R2-02 | Phase 2 | Complete (02-03: dos evidencias fabricadas con backend disco se descargan con el mismo `sha256` tras migrar, incluso con el directorio de disco apartado — los bytes sólo pudieron venir del bucket — y la fila de la base (`file_key`) no cambió ni un carácter) |
| R2-03 | Phase 2 | Complete — las tres mitades observadas. 403 desde otra empresa y 200 para la empresa dueña/revisor sobre una evidencia en R2, idénticos a antes del cambio de backend (02-02). El "401 sin sesión" **no** se observaba: un bug pre-existente y ajeno a esta fase (`d991c31`) dejó muertas las ramas de 401 de 8 rutas, que comparaban contra una cadena que ya nadie lanzaba. Arreglado en `5e2352d` con `UnauthenticatedError`, fuera del alcance de los cuatro planes y por decisión explícita del usuario tras la verificación. Re-verificado con las tres sesiones sobre las 8 rutas: sin sesión 401, otra empresa 403, dueña 200. **Confirmado también en producción en 03-08 (2026-09-02)**: tras desplegar la imagen `04135ca` (que arrastra `5e2352d`, pendiente desde la fase 2), `GET https://prol.prosuite.pro/files/evidence/<inexistente>` sin sesión responde `401` — antes de ese despliegue producción seguía respondiendo `403`, igual que documentaba esta fila. El "401 sin sesión" queda cerrado en producción, no sólo en local. |
| R2-04 | Phase 2 | Complete (02-03: quitar `R2_BUCKET` y reiniciar devuelve la app al disco sin desplegar código — par 404/200 con el disco apartado/presente demuestra el origen de los bytes — y la ida y vuelta R2 → disco → R2 se completó cambiando sólo esa variable. **02-04**: el mismo rollback quedó disponible y documentado en producción — imagen anterior `64f7476` sigue tagueada, comando de una variable listo para copiar y pegar — pero no se ejecutó contra producción porque no hizo falta; sigue verificado sólo en local, no en el host real) |
| DOC-01 | Phase 3 | Complete — cerrado en 03-06b invocando `updateManualDocumentBody` de verdad por HTTP (POST con header `Next-Action`, cookie de sesión real de `admin@prol.prosuite.pro`), no por script ni por navegador. `P-RFC-4.1-01.template_version` subió de 1 a 5 en la sesión: la subida 2→3 fue una edición deliberada de un párrafo real, confirmada en `content_html`. Ver `03-06-SUMMARY.md` §"Cierre de la brecha (03-06b)" para la traza completa. |
| DOC-03 | Phase 3 | Complete — cerrado en 03-06b: `issueCompanyDocument` invocado de verdad por HTTP emitió `P-RFC-4.1-01` (entonces en `template_version=4`) a Acme Corp y Constructora Delta; ambas quedaron en `v1 VIGENTE` con `sourceTemplateVersion=4` y **el mismo md5** de `content_html` (`fe1dd6d2...`). Se editó la plantilla otra vez por HTTP (`template_version` 4→5) y se releyeron las dos filas: **mismo md5 que antes**, ninguna cambió. Ver `03-06-SUMMARY.md`. |
| DOC-04 | Phase 3 | Complete — **evidencia mixta, declarada por partes**. (a) *Aprobado por el usuario en pantalla* (checkpoint de 03-07, "LOS VI BIEN AVANZA"): entró como `carlos.mendoza@gmail.com` y como `lucia.delgado@constructoradelta.test`, y vio el mismo `P-RFC-4.1-01` en `/dashboard/documents/[id]` con el logo, la razón social (`Acme Corporation, S.A. de C.V.` / `Constructora Delta, S.A. de C.V.`) y el código documental propios de cada empresa. (b) *Servidor-verificado por HTTP, no presenciado por el usuario*: el mecanismo de lectura en vivo del logo —la ventaja sobre `.docx`— se cerró aparte en la continuación de 03-07, autenticando por `POST /api/auth/sign-in/email` como el usuario de Acme y haciendo tres `GET` sucesivos a `/dashboard/documents/cmtkf762g0008rj61t0gwreno`: logo original (`md5` del `<img src>` servido `ae1dff5b...`) → `UPDATE companies SET logo=…` a un SVG visiblemente distinto (rojo, texto "ZZ") sin tocar `company_documents` → el mismo `GET` sirvió el logo nuevo (`md5` `5dbb5ecc...`) → revertido el `UPDATE` a su valor original → el mismo `GET` volvió a servir el original (`md5` `ae1dff5b...` de nuevo). `md5(company_documents.content_html)` de esa fila permaneció en `2148bb78b88c5f17e178401ac625893d` en los tres `GET`, sin moverse: el documento se re-renderizó, no se regeneró. Ver `03-07-SUMMARY.md` §"Demostración del logo en vivo (server-verified)". |
| DOC-05 | Phase 3 | Complete — *aprobado por el usuario en pantalla* (checkpoint de 03-07): vio la tabla "Control de cambios" del visor de Acme con sus dos filas (v2 vigente / v1 obsoleta), cada una con fecha, autor y descripción del cambio. El contrato de servidor que la alimenta (`getCompanyDocumentForClient`, historial generado en tiempo de render desde `CompanyDocument`, sin redacción manual) ya estaba verificado contra la base real desde 03-05/03-06b; 03-07 sólo le puso la interfaz encima —`DocumentChangeLog`— y el usuario la vio. No se re-verificó por HTTP en el cierre de 03-07 porque la aprobación humana ya cubre exactamente lo que pide el requisito. |
| DOC-06 | Phase 3 | Complete — cerrado en 03-06b: sobre la fila `VIGENTE` de Acme (`v1`), `startCompanyDocumentDraft` por HTTP creó `v2 BORRADOR`; una segunda llamada idéntica devolvió el mismo `draftId` (idempotente, no creó `v3`). `saveCompanyDocumentDraft` se invocó dos veces con contenido distinto cada vez: siguió existiendo exactamente una fila `BORRADOR` (`v2`) y el contenido final llevaba las dos ediciones. `publishCompanyDocument` promovió `v2` a `VIGENTE` y degradó `v1` a `OBSOLETO`; Constructora Delta permaneció en `v1 VIGENTE` sin tocar. Invariante "una sola VIGENTE por (documento, empresa)" reverificado tras cada paso: cero infracciones. Ver `03-06-SUMMARY.md`. |
| DOC-07 | Phase 3 | Complete — *aprobado por el usuario en pantalla* (checkpoint de 03-07): antes del recorrido, la continuación subió `P-RFC-4.1-01.template_version` a 6 sin re-emitir a nadie (`sourceTemplateVersion` de las dos filas de empresa se quedó en 4), y el usuario vio en ambas empresas el aviso ámbar "hay una versión más reciente de la plantilla" redactado sin dar a entender que su documento caducó. Reconfirmado por HTTP en el cierre de 03-07 (los mismos `GET` autenticados de la demostración del logo): el aviso sigue presente para Acme y para Constructora Delta. |
| OPS-05 | Phase 3 | Complete |
| PDF-01 | Phase 4 | Pending |
| PDF-02 | Phase 4 | Pending |
| PDF-04 | Phase 4 | Pending |
| REG-01 | Phase 5 | Pending |
| REG-02 | Phase 5 | Pending |
| REG-03 | Phase 5 | Pending |
| REG-04 | Phase 5 | Pending |
| REG-05 | Phase 5 | Pending |
| REG-06 | Phase 5 | Pending |
| PDF-03 | Phase 5 | Pending |
| NAV-01 | Phase 3.1 | Complete — cerrado en 03.1-02. *Aprobado por el usuario en pantalla* (checkpoint tarea 3): leyó «Ibiza Experts 360» en el sidebar del administrador y confirmó que pulsar el rótulo pliega/despliega el grupo. *Servidor-verificado por HTTP* (mismo `GET /tenant-admin/projects`, sin recompilar entre capturas): con la columna en `NULL` sirvió «Gestión documental»; tras `UPDATE tenants SET documents_menu_label='Ibiza Experts 360'` sirvió ese texto — la columna quedó restaurada a `Ibiza Experts 360` al terminar. Ver `03.1-02-SUMMARY.md`. |
| NAV-02 | Phase 3.1 | Complete — **evidencia mixta, declarada por partes**, cerrado en 03.1-02. (a) *Aprobado por el usuario en pantalla* (checkpoint tarea 3, respuesta "aprobado" a las tres preguntas del `resume-signal`): panel de administrador (rótulo leído, toggle plegar/desplegar confirmado) y panel de cliente (entrada agrupada bajo «Proyectos»). El panel de consultor **no fue visto por el usuario** — no se le pidió y no lo reportó espontáneamente. (b) *Servidor-verificado por HTTP en la continuación*, para cerrar esa brecha sin apoyarse sólo en inferencia de código: login real de `maria.garcia@academiadigitalmx.com` (PROFESSOR de academia-digital) contra `POST /api/auth/sign-in/email`, `GET /professor/evidence` con la cookie de sesión → el HTML sirvió el grupo «Ibiza Experts 360» con `aria-expanded="true"` y exactamente sus tres hijos (Proyectos, Evidencias, Agenda), **sin** Manuales Maestros. Los mismos tres `GET` (administrador, consultor, cliente) confirmaron el grupo agrupado con el rótulo del tenant en los tres paneles. Ver `03.1-02-SUMMARY.md`. |
| NAV-03 | Phase 3.1 | Complete — **evidencia mixta, declarada por partes**, cerrado en 03.1-02. (a) *Aprobado por el usuario en pantalla*: confirmó que la entrada del panel del cliente dice «Proyectos», no «Manuales» (tercera respuesta del `resume-signal`). (b) *Servidor-verificado por HTTP en la continuación*, no presenciado por el usuario: «Manuales Maestros» en el menú del administrador — `GET /tenant-admin/projects` autenticado sirvió literalmente ese texto como hijo del grupo (y no lo sirvió el panel de consultor, que no tiene esa entrada). La línea explicativa bajo el h1 de `/tenant-admin/manuals` ("Plantillas de la norma... la implementación vive en Proyectos") quedó verificada por `grep` sobre el archivo fuente en la tarea 2, no releída por HTTP en esta continuación. Ver `03.1-02-SUMMARY.md`. |
| DRV-01 | Phase 3.1 | Complete — cerrado en 03.1-03. *Servidor-verificado por HTTP real* contra la base de desarrollo (nueve pasos, `Next-Action` + cookie de sesión real, id de acción leído del manifest por ruta): el ADMIN del tenant (`admin@prol.prosuite.pro`) escribió `https://drive.google.com/drive/folders/1AbCdEf` y `drive_url` quedó con esa URL (`{"success":true,…}`); vaciarlo con `""` lo dejó en `NULL`, nunca cadena vacía. Los cuatro actores no autorizados fueron rechazados sin mover la columna: PROFESSOR y STUDENT del mismo tenant (excepción HTTP 500 de `requireManualAdmin`, no un `success:false` limpio — documentado tal cual, no redactado), una petición sin cookie (307 a sign-in) y el ADMIN de un tenant desechable creado y borrado para la prueba (`"No autorizado: tenant no coincide"`). Ver `03.1-03-SUMMARY.md` §"Los nueve pasos". |
| DRV-02 | Phase 3.1 | Pending |
| DRV-03 | Phase 3.1 | Complete — cerrado en 03.1-03, **dos mitades, ambas server-verificadas por HTTP real**. (a) Escritura: `https://evil.com/carpeta`, `http://drive.google.com/drive/folders/1AbCdEf` (sin TLS) y `https://drive.google.com.evil.com/x` (host similar) los tres rechazados con el texto de `DRIVE_URL_ERROR`, `drive_url` sin moverse. (b) Lectura: con `drive_url='https://evil.com/carpeta'` escrito directo en la base (saltándose la escritura validada), `GET /tenant-admin/projects/<id>` autenticado como ADMIN sirvió `grep -c 'href="https://evil.com/carpeta"'` = 0, `grep -c "no es de Google Drive"` = 1, y `grep -c 'evil.com'` sobre el HTML completo = 0 (el valor hostil no llega ni en crudo a la vista); el mismo `GET` como PROFESSOR (`/professor/projects/<id>`) dio los mismos tres resultados — la revalidación es de la consulta compartida, no de la pantalla. `drive_url` de las tres activaciones devuelto a `NULL` tras la captura. Ver `03.1-03-SUMMARY.md` §"Los dos fragmentos del HTML servido". |
| DRV-04 | Phase 3.1 | Pending |
| ~~R2-05~~ | ~~Phase 6~~ | Cancelado 2026-09-02 — las evidencias pesadas van a Drive, no a una URL firmada |
| ~~R2-06~~ | ~~Phase 6~~ | Cancelado 2026-09-02 — mismo motivo |
| DOC-02 | Phase 3 | Complete — cerrado en 03-06b: `POST /api/upload/document-body` real, con un `.docx` genuino (OOXML de prueba, no un mock del handler), devolvió una tabla con una celda combinada (`colspan="2"`). Ese HTML se guardó de verdad vía `updateManualDocumentBody` por HTTP (`template_version` 3→4) y `content_html` en `manual_documents` contiene la tabla completa, `colspan="2"` incluido, confirmado con una consulta directa a la fila. Ver `03-06-SUMMARY.md`. |

**Coverage:**
- v1.1 requirements: 33 en total (28 originales + 7 de la fase 3.1 − 2 cancelados)
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-09-01*
*Last updated: 2026-09-02 — El checkpoint humano de 03-06 se aprobó sin ejercitarse (confirmado por el usuario) y dejó la base en 0 filas. En 03-06b se cerró esa brecha invocando las cinco server actions reales (`updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`) por HTTP directo — header `Next-Action` + cookie de sesión real, no un script que imite su forma — contra el servidor de desarrollo real. Los ocho pasos del recorrido pasaron; DOC-01/02/03/06 quedan Complete con la evidencia de base capturada en cada paso (ver `03-06-SUMMARY.md`). En 03-07 el checkpoint de la vista del cliente sí se ejerció ("LOS VI BIEN AVANZA": el usuario entró como las dos empresas y comparó identidad, historial y aviso de versión atrasada en pantalla), y la única parte que el checkpoint ofrecía sin que el usuario la pidiera —el cambio de logo en vivo— se cerró aparte por HTTP, con hashes reales antes/durante/después y el logo restaurado. DOC-04/05/07 quedan Complete, cada uno con su tipo de evidencia declarado por separado en la tabla (aprobación humana vs. servidor-verificado). En 03-08 la fase 3 se desplegó a producción (imagen `04135ca`): el esquema del documento nativo quedó aplicado (2 enums, 14 columnas, backfill no-op comprobado) y el arreglo del 401 (`5e2352d`) quedó confirmado en vivo, cerrando R2-03 también en producción. La confirmación visual humana de ese despliegue quedó pendiente y así se declaró, sin darse por aprobada — ver `03-08-SUMMARY.md`. Con esto, la fase 3 (Procedimientos nativos) queda con sus 8 planes ejecutados.*
