# Roadmap: PROL

## Milestones

- ✅ **v1.0 Formación y cumplimiento** — LMS, evaluaciones, DC-3, encuestas, talleres y el módulo de gestión documental con evidencias (commit `2ea59dc`)
- 🚧 **v1.1 Documentos nativos y R2** — Fases 1-6 (en curso; la 7 se absorbió en la 3)

## Overview

El módulo de gestión documental funciona, pero entrega y recibe documentos como **archivos**: el consultor sube una plantilla, el cliente la descarga, la llena en Word y la vuelve a subir. El control documental queda fuera de la plataforma.

Este milestone lo mete dentro. Los procedimientos y los registros pasan a redactarse, personalizarse, versionarse y exportarse en la plataforma; los archivos que van a seguir existiendo pase lo que pase —fotos, audio, video, certificados de terceros— se mudan a Cloudflare R2, que además cierra una brecha de respaldo que hoy es real.

El orden no es negociable en su tramo inicial: la fase 1 elimina dos amenazas de pérdida de datos **antes** de que nada más toque esa zona, y el respaldo tiene que estar arreglado antes de la migración, porque hoy una migración fallida no tendría punto de restauración.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Higiene y operación** - Cierra la deuda del módulo anterior y el agujero de respaldo (completed 2026-09-01)
- [x] **Phase 2: R2 para el tier confidencial** - Evidencias y plantillas salen del volumen local (completed 2026-09-02)
- [ ] **Phase 3: Procedimientos nativos** - El documento de texto vive en la plataforma
- [ ] **Phase 4: Puente HTML→PDF** - El artefacto que se lleva el auditor
- [ ] **Phase 5: Registros nativos** - El formato que el cliente llena en pantalla
- [ ] **Phase 6: Subida directa a R2** - Se levanta el tope de 25 MB
- ~~**Phase 7: Importación .docx**~~ - Absorbida por la fase 3 el 2026-09-02

## Phase Details

### Phase 1: Higiene y operación
**Goal**: Eliminar las dos amenazas de pérdida de datos y la deuda que el módulo anterior dejó abierta, antes de que ninguna fase nueva toque esa zona.
**Depends on**: Nothing (first phase)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. El respaldo diario produce un tarball con el contenido del volumen de evidencias, además del de uploads.
  2. `docker-compose.prod.yml` declara el volumen privado que el quadlet de producción ya monta.
  3. Dos subidas simultáneas al mismo documento y empresa producen versiones consecutivas, no un error de unicidad.
  4. Las evidencias de matriz de riesgos ya existentes se siguen viendo después de introducir el snapshot discriminado y versionado.
**Plans**: 4 plans (olas: 1 → 01-01, 01-02, 01-03 en paralelo; 2 → 01-04)

Plans:
- [ ] 01-01-PLAN.md — Respaldo del volumen privado y compose de producción coherente (OPS-01, OPS-02)
- [ ] 01-02-PLAN.md — Lock de versión en `uploadCompanyDocument` y limpieza del helper data-URL (OPS-03)
- [ ] 01-03-PLAN.md — Evidencia legacy de matriz de riesgos, creada por la interfaz antes del cambio (OPS-04)
- [ ] 01-04-PLAN.md — Snapshot de evidencia tipado y versionado, con rama legacy (OPS-04)

### Phase 2: R2 para el tier confidencial
**Goal**: Las evidencias y plantillas confidenciales se guardan y leen desde Cloudflare R2, sin que cambie el esquema, el cliente ni la autorización.
**Depends on**: Phase 1
**Requirements**: R2-01, R2-02, R2-03, R2-04
**Success Criteria** (what must be TRUE):
  1. Una evidencia nueva aparece como objeto en el bucket y se descarga por `/files/*`.
  2. Una evidencia anterior a la migración se descarga igual, sin haber tocado la base de datos.
  3. Otra empresa recibe 403 y una petición sin sesión recibe 401.
  4. Quitando la variable del bucket y reiniciando, la aplicación vuelve a leer del disco local.
**Plans**: 4 plans (olas estrictamente seriales: 1 → 02-01, 2 → 02-02, 3 → 02-03, 4 → 02-04). Los cuatro tocan los mismos módulos centrales y el mismo working tree; en la fase 1 dos ejecutores concurrentes se pisaron el índice de git, así que no hay paralelismo aquí a propósito.

Plans:
- [x] 02-01-PLAN.md — Cliente R2 (`lib/r2.ts`), fail-fast de arranque y variables de entorno (R2-01, R2-04)
- [x] 02-02-PLAN.md — Backend conmutable en `document-storage.ts` y prefijo del bucket compartido (R2-01, R2-03)
- [x] 02-03-PLAN.md — Migración disco → R2, criterio de equivalencia y rollback (R2-02, R2-04)
- [x] 02-04-PLAN.md — Despliegue a producción, con checkpoint de aprobación (R2-01, R2-04)

### Phase 3: Procedimientos nativos
**Goal**: Un procedimiento se redacta o se importa en la plataforma, se emite a cada empresa con su marca, y se versiona con historial — sin que exista un `.docx` de por medio a partir de la carga inicial.
**Depends on**: Phase 1
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07, OPS-05
**Success Criteria** (what must be TRUE):
  1. Un procedimiento redactado en la plataforma se emite a dos empresas y cada una lo ve con su logo, su razón social y su código.
  2. Editar la plantilla después no altera lo emitido, y ambas empresas ven que existe una versión más reciente.
  3. Guardar dos veces un borrador deja una sola versión; publicar crea la siguiente y degrada la anterior.
  4. El historial muestra versión, fecha, autor, descripción del cambio y estatus.
  5. La página de sección sigue mostrando el documento vigente, no el borrador de versión más alta.
  6. Un `.docx` real de la consultora con tablas se importa, las tablas sobreviven a la conversión, y el contenido pasa por el sanitizador antes de llegar a la base.
  7. El código de la fase queda desplegado en producción con el módulo apagado, arrastrando el arreglo de autenticación pendiente.
**Plans**: 8 plans (olas estrictamente seriales: 1 → 03-01, 2 → 03-02, 3 → 03-03, 4 → 03-04, 5 → 03-05, 6 → 03-06, 7 → 03-07, 8 → 03-08). Todos tocan los mismos módulos centrales sobre el mismo working tree; en la fase 1 dos ejecutores concurrentes se pisaron el índice de git, así que no hay paralelismo aquí a propósito. Los planes 06, 07 y 08 llevan checkpoint humano (`autonomous: false`): la fase se demuestra en pantalla y cierra con un despliegue.

Plans:
- [x] 03-01-PLAN.md — Esquema del documento nativo, guarda de `fileKey` nulo y fixtures reproducibles (DOC-01, DOC-03, DOC-06)
- [x] 03-02-PLAN.md — OPS-05: "vigente" es un estatus, no la versión más alta (OPS-05)
- [x] 03-03-PLAN.md — Conversión `.docx` → HTML saneado (DOC-02)
- [x] 03-04-PLAN.md — Identidad del documento y acciones de plantilla (DOC-01, DOC-04, DOC-07)
- [x] 03-05-PLAN.md — Emisión, borrador y publicación (DOC-03, DOC-05, DOC-06)
- [ ] 03-06-PLAN.md — UI del consultor: editor, importador y emisión por empresa (DOC-01, DOC-02, DOC-06)
- [ ] 03-07-PLAN.md — Vista del cliente: identidad, historial y aviso de versión (DOC-04, DOC-05, DOC-07)
- [ ] 03-08-PLAN.md — Despliegue a producción con el módulo apagado (DOC-01, DOC-02, OPS-05)

> **Enmienda del 2026-09-02.** Dos decisiones del usuario al planificar la fase:
> (a) la importación `.docx` (DOC-02) se adelanta desde la fase 7, que queda absorbida
> — `mammoth` ya está instalado y `convertToHtml` preserva tablas, y sin ella el
> consultor tendría que escribir HTML a mano para los ~60 documentos del catálogo
> hasta que llegara aquella fase; (b) la fase cierra con un despliegue a producción
> con checkpoint, como hizo la 2, que además lleva al VPS el arreglo del 401
> (`5e2352d`) que hoy sigue sin desplegar.

### Phase 4: Puente HTML→PDF
**Goal**: Cualquier documento nativo se exporta como PDF apto para auditoría, con encabezado ISO, pie numerado y tablas con bordes.
**Depends on**: Phase 3
**Requirements**: PDF-01, PDF-02, PDF-04
**Success Criteria** (what must be TRUE):
  1. Un procedimiento de varias páginas exporta con encabezado, pie numerado y tablas con bordes.
  2. Ninguna fila de tabla se parte entre páginas.
  3. Cambiar el logo de la empresa cambia el PDF sin regenerar ni volver a emitir nada.
  4. La vista previa dentro del editor coincide con el archivo descargado.
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Registros nativos
**Goal**: El consultor define un formato con bloques y el cliente lo llena en pantalla; el resultado entra como evidencia al flujo de aprobación que ya existe.
**Depends on**: Phase 4
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, PDF-03
**Success Criteria** (what must be TRUE):
  1. El consultor define un formato con tabla y cuadrantes y lo previsualiza tal como lo verá el cliente.
  2. El cliente lo llena, guarda borrador dos veces sin crear versiones, y lo envía como evidencia.
  3. El revisor ve el snapshot congelado con la misma maqueta que llenó el cliente, y lo aprueba.
  4. Un formato semestral programa su siguiente ciclo al aprobarse.
  5. Una sección con registro nativo y fotografías genera dos actividades independientes.
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Subida directa a R2
**Goal**: Las evidencias pesadas suben directas al bucket por URL firmada, levantando el tope de 25 MB sin abrir un agujero de escritura.
**Depends on**: Phase 2
**Requirements**: R2-05, R2-06
**Success Criteria** (what must be TRUE):
  1. Un archivo de 100 MB sube desde el navegador con progreso visible.
  2. Una URL firmada usada con un archivo mayor al tope, o con un MIME distinto al declarado, se rechaza al confirmar.
  3. El resto de subidas siguen por el camino proxied sin cambios.
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### ~~Phase 7: Importación .docx~~ — ABSORBIDA POR LA FASE 3 (2026-09-02)

**Goal original**: La consultora carga su catálogo de procedimientos ya maquetados sin retipear nada.
**Requirements**: DOC-02 → ahora en la fase 3.

Se disolvió a petición del usuario al planificar la fase 3. El motivo no fue de
coste sino de secuencia: dejarla al final significaba que, entre la fase 3 y ésta,
la única vía para cargar el catálogo era escribir HTML a mano. Sus dos criterios
de éxito viven ahora como el criterio 6 de la fase 3, sin rebajarse.

## Progress

**Execution Order:**
Las fases se ejecutan en orden numérico: 1 → 2 → 3 → 4 → 5 → 6.
La fase 6 sólo depende de la 2, así que puede adelantarse o aplazarse sin bloquear nada.
La 7 ya no existe: su contenido está dentro de la 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Higiene y operación | 4/4 | Complete    | 2026-09-01 |
| 2. R2 para el tier confidencial | 4/4 | Complete    | 2026-09-02 |
| 3. Procedimientos nativos | 4/8 | In Progress|  |
| 4. Puente HTML→PDF | 0/TBD | Not started | - |
| 5. Registros nativos | 0/TBD | Not started | - |
| 6. Subida directa a R2 | 0/TBD | Not started | - |
| ~~7. Importación .docx~~ | — | Absorbida por la 3 | 2026-09-02 |
