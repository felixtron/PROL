# Requirements: PROL — v1.1 Documentos nativos y R2

**Defined:** 2026-09-01
**Core Value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.

## v1.1 Requirements

Requisitos de este milestone. Cada uno se mapea a una fase del roadmap.

### Documentos nativos

- [x] **DOC-01**: El consultor redacta un procedimiento dentro de la plataforma, sin producir ni intercambiar un `.docx`.
- [x] **DOC-02**: Importar un `.docx` conserva sus tablas al convertirlo y sanearlo.
- [x] **DOC-03**: Emitir para una empresa congela el cuerpo: editar la plantilla después no altera lo ya emitido.
- [ ] **DOC-04**: La misma plantilla se ve con el logo, la razón social y el código documental de cada empresa.
- [ ] **DOC-05**: El historial muestra versión, fecha, autor, descripción del cambio y estatus.
- [x] **DOC-06**: Editar un documento vigente abre un borrador; sólo publicar crea una versión nueva.
- [ ] **DOC-07**: El cliente ve cuándo su versión quedó atrás respecto a la plantilla del consultor.

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
- [ ] **R2-05**: El cliente sube evidencias de más de 25 MB por URL firmada, con progreso visible.
- [ ] **R2-06**: Una subida firmada que exceda el tope o mienta en su MIME se rechaza al confirmarla.

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
| R2-03 | Phase 2 | Complete — las tres mitades observadas. 403 desde otra empresa y 200 para la empresa dueña/revisor sobre una evidencia en R2, idénticos a antes del cambio de backend (02-02). El "401 sin sesión" **no** se observaba: un bug pre-existente y ajeno a esta fase (`d991c31`) dejó muertas las ramas de 401 de 8 rutas, que comparaban contra una cadena que ya nadie lanzaba. Arreglado en `5e2352d` con `UnauthenticatedError`, fuera del alcance de los cuatro planes y por decisión explícita del usuario tras la verificación. Re-verificado con las tres sesiones sobre las 8 rutas: sin sesión 401, otra empresa 403, dueña 200. |
| R2-04 | Phase 2 | Complete (02-03: quitar `R2_BUCKET` y reiniciar devuelve la app al disco sin desplegar código — par 404/200 con el disco apartado/presente demuestra el origen de los bytes — y la ida y vuelta R2 → disco → R2 se completó cambiando sólo esa variable. **02-04**: el mismo rollback quedó disponible y documentado en producción — imagen anterior `64f7476` sigue tagueada, comando de una variable listo para copiar y pegar — pero no se ejecutó contra producción porque no hizo falta; sigue verificado sólo en local, no en el host real) |
| DOC-01 | Phase 3 | Complete — cerrado en 03-06b invocando `updateManualDocumentBody` de verdad por HTTP (POST con header `Next-Action`, cookie de sesión real de `admin@prol.prosuite.pro`), no por script ni por navegador. `P-RFC-4.1-01.template_version` subió de 1 a 5 en la sesión: la subida 2→3 fue una edición deliberada de un párrafo real, confirmada en `content_html`. Ver `03-06-SUMMARY.md` §"Cierre de la brecha (03-06b)" para la traza completa. |
| DOC-03 | Phase 3 | Complete — cerrado en 03-06b: `issueCompanyDocument` invocado de verdad por HTTP emitió `P-RFC-4.1-01` (entonces en `template_version=4`) a Acme Corp y Constructora Delta; ambas quedaron en `v1 VIGENTE` con `sourceTemplateVersion=4` y **el mismo md5** de `content_html` (`fe1dd6d2...`). Se editó la plantilla otra vez por HTTP (`template_version` 4→5) y se releyeron las dos filas: **mismo md5 que antes**, ninguna cambió. Ver `03-06-SUMMARY.md`. |
| DOC-04 | Phase 3 | Pending (03-04 puso `DocumentIdentity` resuelta —logo en vivo, razón social DC-3, código y nombre con overrides— pero nadie la renderiza todavía en pantalla; eso es 03-07) |
| DOC-05 | Phase 3 | Pending — contrato de servidor listo y verificado; falta la interfaz (03-05: `getCompanyDocumentForClient`/`getCompanyDocumentForEdit` generan el historial —versión, fecha, autor, `notes` como descripción del cambio, estatus— en tiempo de render desde las filas de `CompanyDocument`, sin que nadie lo redacte a mano. Verificado contra la base real: cuatro filas de historial para Acme tras el ciclo completo, con las cinco columnas rellenas y al menos una descripción de cambio real. 03-06 construyó la tabla que lo muestra en `companies/[assignmentId]/page.tsx`; la vista del cliente sigue en 03-07. **03-06b** además dejó datos reales de emisión para que 03-07 tenga algo que mostrar, pero no construyó ni tocó la vista del cliente.) |
| DOC-06 | Phase 3 | Complete — cerrado en 03-06b: sobre la fila `VIGENTE` de Acme (`v1`), `startCompanyDocumentDraft` por HTTP creó `v2 BORRADOR`; una segunda llamada idéntica devolvió el mismo `draftId` (idempotente, no creó `v3`). `saveCompanyDocumentDraft` se invocó dos veces con contenido distinto cada vez: siguió existiendo exactamente una fila `BORRADOR` (`v2`) y el contenido final llevaba las dos ediciones. `publishCompanyDocument` promovió `v2` a `VIGENTE` y degradó `v1` a `OBSOLETO`; Constructora Delta permaneció en `v1 VIGENTE` sin tocar. Invariante "una sola VIGENTE por (documento, empresa)" reverificado tras cada paso: cero infracciones. Ver `03-06-SUMMARY.md`. |
| DOC-07 | Phase 3 | Pending (03-04 puso `isTemplateOutdated`/`isOutdated` compartida entre `DocumentIdentity` y `getManualDocumentForEdit`; la insignia visible al consultor y al cliente llega en 03-06/03-07) |
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
| R2-05 | Phase 6 | Pending |
| R2-06 | Phase 6 | Pending |
| DOC-02 | Phase 3 | Complete — cerrado en 03-06b: `POST /api/upload/document-body` real, con un `.docx` genuino (OOXML de prueba, no un mock del handler), devolvió una tabla con una celda combinada (`colspan="2"`). Ese HTML se guardó de verdad vía `updateManualDocumentBody` por HTTP (`template_version` 3→4) y `content_html` en `manual_documents` contiene la tabla completa, `colspan="2"` incluido, confirmado con una consulta directa a la fila. Ver `03-06-SUMMARY.md`. |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-09-01*
*Last updated: 2026-09-02 — El checkpoint humano de 03-06 se aprobó sin ejercitarse (confirmado por el usuario) y dejó la base en 0 filas. En 03-06b se cerró esa brecha invocando las cinco server actions reales (`updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`) por HTTP directo — header `Next-Action` + cookie de sesión real, no un script que imite su forma — contra el servidor de desarrollo real. Los ocho pasos del recorrido pasaron; DOC-01/02/03/06 quedan Complete con la evidencia de base capturada en cada paso (ver `03-06-SUMMARY.md`). DOC-04/05/07 siguen pendientes de la vista del cliente en 03-07, que ahora sí tiene datos reales que renderizar (Acme v2 VIGENTE/v1 OBSOLETO, Constructora Delta v1 VIGENTE).*
