# Phase 1: Higiene y operación - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning
**Source:** PRD Express Path (`~/.claude/plans/ayudame-a-planificar-como-delegated-diffie.md`, plan aprobado del milestone v1.1)

<domain>
## Phase Boundary

Cerrar la deuda que dejó abierta el módulo de gestión documental (commit `2ea59dc`) y tapar el agujero de respaldo, **antes** de que ninguna fase nueva escriba en esa zona.

Cuatro trabajos, ninguno con interfaz de usuario:

1. **OPS-01** — `scripts/backup.sh` respalda el volumen de evidencias confidenciales, además del de uploads.
2. **OPS-02** — `docker-compose.prod.yml` declara el volumen privado que el quadlet de producción ya monta a mano.
3. **OPS-03** — `uploadCompanyDocument` toma bloqueo de fila antes de incrementar la versión.
4. **OPS-04** — `Evidence.formSnapshot` se lee con un tipo discriminado y versionado, con rama para las filas que ya existen.

Más una limpieza sin REQ-ID que entra aquí por proximidad: **deduplicar la función que carga un archivo subido como data-URL**, hoy repetida en `apps/web/lib/certificate-assets.ts` y en línea dentro de `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx`. Se hace ahora porque la fase 4 (PDF de documentos) sería la tercera copia.

**Fuera de esta fase:** cualquier cosa que toque R2, el esquema de Prisma más allá de lo que exija OPS-04, o pantallas nuevas.
</domain>

<decisions>
## Implementation Decisions

Todo lo de esta sección viene del plan aprobado y está **cerrado**. No re-litigar.

### OPS-03 — el bloqueo de fila

- El patrón de la casa es ``await tx.$queryRaw`SELECT 1 FROM <tabla> WHERE id = ${id} FOR UPDATE` `` dentro de `db.$transaction`. El ejemplo vivo está en `apps/web/lib/actions/evidence.ts` (~línea 148). `apps/web/lib/actions/manual.ts` **no tiene ninguno**: el incremento de versión está en las líneas 880-900, y compite contra `@@unique([documentId, companyId, version])`.
- **La trampa, y es la decisión clave de la fase:** hay que bloquear la fila de **`manual_documents`**, no la de `company_documents`. El "padre" natural sería el par (documento, empresa), pero ese par **puede tener cero filas** la primera vez, y un `FOR UPDATE` sobre un resultado vacío no bloquea nada. `manual_documents` siempre existe y es el punto natural de serialización para "siguiente versión de este documento para cualquier empresa".
- Contrapartida aceptada: sobre-serializa levemente entre dos empresas distintas que suban a la vez para el mismo documento. Es estrictamente mejor que la carrera actual.

### OPS-04 — el snapshot tipado

- Archivo nuevo `packages/shared/src/evidence-snapshot.ts`: unión discriminada de Zod con un campo `snapshotVersion` **y** el `kind` de la evidencia.
- **Sin migración de datos.** Las filas actuales no tienen discriminador, así que la unión lleva una **rama legacy** que las reconoce por su forma y las sigue renderizando. Añadir una segunda forma sin discriminador es justo lo que convertiría el cast actual en un render silenciosamente incorrecto.
- Al leer se usa `safeParse` con degradación limpia, no `parse`. El precedente es `packages/shared/src/lesson-blocks.ts`.
- El punto de consumo a corregir es el cast ad-hoc de `apps/web/components/evidence-detail.tsx` (~línea 72).

### OPS-01 y OPS-02 — operación

- `scripts/backup.sh` hoy fija `UPLOADS_VOLUME="${UPLOADS_VOLUME:-prol_prol_uploads}"` (línea 27) y tarea un solo volumen (línea 56). Se añade `PRIVATE_VOLUME` con la misma forma y un segundo tarball con **la misma política de retención**.
- `docker-compose.prod.yml` (bloques de servicio ~64-66 y de volúmenes ~98-100) gana `prol_private:/app/private-uploads` y su declaración. Esto es documentación ejecutable: aunque el módulo acabe en R2, si el compose discrepa de producción, el siguiente que reconstruya desde ahí pierde el fallback.
- `DEPLOY.md` §7b debe quedar coherente con lo anterior, y dejar escrito que el compose y el quadlet se mantienen sincronizados.

### Deduplicación del data-URL

- Se conserva `apps/web/lib/certificate-assets.ts` como origen único y se borra el helper en línea de la ruta PDF de evaluaciones, junto con sus imports de `readFile`, `join` y `resolveUploadDir` si quedan huérfanos.
- La convención del helper es **degradar devolviendo null, no lanzar**. No cambiarla.

### Claude's Discretion

- Cómo se reparte el trabajo en planes y olas.
- La forma exacta de los esquemas Zod y los nombres de los tipos exportados.
- Si `backup.sh` se refactoriza a un bucle sobre una lista de volúmenes o se duplica el bloque. Cualquiera vale mientras la retención sea idéntica para los dos.
- Cómo se demuestra el criterio 3 (concurrencia) sin suite de pruebas: un script desechable que dispare dos escrituras simultáneas es aceptable y no debe commitearse.
</decisions>

<specifics>
## Specific Ideas

- **Verificación del criterio 4**: hay que comprobarlo con datos reales. El seed local (`pnpm --filter @prol/db db:seed`) no crea evidencias de matriz de riesgos, así que hay que generar una a mano por la interfaz antes de tocar `formSnapshot`, y confirmar que se sigue viendo después.
- **Puertas transversales del milestone**, obligatorias antes de dar el plan por terminado: `pnpm check-types` limpio, `turbo run lint` en **81 advertencias y 0 errores** (la línea base exacta, medida hoy), y `pnpm build` en verde.
- **Restricción de esquema**: Prisma no tiene directorio de migraciones. Si OPS-04 necesitara tocar el esquema, sólo se admite lo aditivo, aplicado con `db push`. Lo previsto es que **no haga falta ningún cambio de esquema**: `formSnapshot` ya es Json.
- La base de datos local corre en `localhost:5435` (contenedor `prol-db`), sembrada. El 5432 y el 5433 los ocupan otros proyectos.
- El módulo entero está en el commit `2ea59dc`; `.planning/codebase/CONCERNS.md` documenta estos mismos hallazgos con líneas exactas.
</specifics>

<deferred>
## Deferred Ideas

- **Diagnóstico por SSH de si `backup.sh` corre siquiera en el host.** El script invoca `docker` y `DEPLOY.md` documenta que el host sólo tiene podman: puede que no se esté generando ningún respaldo. **Arreglar el script no sirve de nada si el cron nunca lo ejecuta**, así que el diagnóstico es imprescindible — pero es una acción sobre producción, va con plan de riesgo previo, y no la ejecuta un plan de esta fase. Queda como bloqueo declarado en `STATE.md`.
- Adaptar `backup.sh` y `scripts/README.md` de `docker` a `podman`. Depende del resultado del diagnóstico anterior.
- Versionado de objetos y reglas de ciclo de vida como sustituto del respaldo: es de la fase 2, cuando los archivos ya estén en R2.
</deferred>

---

*Phase: 01-higiene-y-operacion*
*Context gathered: 2026-09-01 via PRD Express Path*
