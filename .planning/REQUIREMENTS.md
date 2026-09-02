# Requirements: PROL — v1.1 Documentos nativos y R2

**Defined:** 2026-09-01
**Core Value:** Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.

## v1.1 Requirements

Requisitos de este milestone. Cada uno se mapea a una fase del roadmap.

### Documentos nativos

- [ ] **DOC-01**: El consultor redacta un procedimiento dentro de la plataforma, sin producir ni intercambiar un `.docx`.
- [ ] **DOC-02**: Importar un `.docx` conserva sus tablas al convertirlo y sanearlo.
- [ ] **DOC-03**: Emitir para una empresa congela el cuerpo: editar la plantilla después no altera lo ya emitido.
- [ ] **DOC-04**: La misma plantilla se ve con el logo, la razón social y el código documental de cada empresa.
- [ ] **DOC-05**: El historial muestra versión, fecha, autor, descripción del cambio y estatus.
- [ ] **DOC-06**: Editar un documento vigente abre un borrador; sólo publicar crea una versión nueva.
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
- [ ] **R2-02**: Los archivos anteriores a la migración siguen descargándose sin tocar la base.
- [x] **R2-03**: `/files/*` sigue autorizando contra la base: 403 desde otra empresa, 401 sin sesión.
- [ ] **R2-04**: Quitar una variable de entorno devuelve la app al disco local, sin desplegar código.
- [ ] **R2-05**: El cliente sube evidencias de más de 25 MB por URL firmada, con progreso visible.
- [ ] **R2-06**: Una subida firmada que exceda el tope o mienta en su MIME se rechaza al confirmarla.

### Operación y deuda

- [x] **OPS-01**: El respaldo diario incluye el volumen de evidencias.
- [x] **OPS-02**: `docker-compose.prod.yml` declara el volumen privado que producción ya monta.
- [x] **OPS-03**: Incrementar la versión de un documento de empresa toma lock y no puede colisionar.
- [x] **OPS-04**: `formSnapshot` se lee con un tipo discriminado y versionado, con rama legacy.
- [ ] **OPS-05**: Toda consulta de "documento vigente" filtra por estatus, no por versión máxima.

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
| R2-01 | Phase 2 | Complete (02-02: `document-storage.ts` escribe y lee de R2 con `STORAGE_BACKEND`; dos evidencias reales verificadas en `ibizadata` bajo `prol/evidence/`, sin cambios de esquema ni de cliente) |
| R2-02 | Phase 2 | Pending |
| R2-03 | Phase 2 | Complete — con salvedad (ver 02-02-SUMMARY.md): 403 desde otra empresa y 200 para la empresa dueña/revisor confirmados sobre una evidencia en R2, exactamente igual que antes del cambio de backend. El "401 sin sesión" de la redacción original NO se observa: un bug pre-existente y ajeno a esta fase (commit `d991c31`) hace que `requireUser()` lance un mensaje que ya no coincide con el `catch` de 8 rutas, así que "sin sesión" devuelve 403. Registrado en `deferred-items.md`; no se corrige aquí porque toca archivos fuera del alcance permitido y del radio de esta tarea. |
| R2-04 | Phase 2 | In Progress (02-01: avisos de arranque listos; 02-02 demostró el interruptor y el rollback a disco quitando `R2_BUCKET`; falta que 02-03 lo demuestre como parte del criterio 2 completo) |
| DOC-01 | Phase 3 | Pending |
| DOC-03 | Phase 3 | Pending |
| DOC-04 | Phase 3 | Pending |
| DOC-05 | Phase 3 | Pending |
| DOC-06 | Phase 3 | Pending |
| DOC-07 | Phase 3 | Pending |
| OPS-05 | Phase 3 | Pending |
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
| DOC-02 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-09-01*
*Last updated: 2026-09-01 al abrir el milestone v1.1*
