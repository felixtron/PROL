# Phase 2: R2 para el tier confidencial - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning
**Source:** PRD Express Path (`~/.claude/plans/ayudame-a-planificar-como-delegated-diffie.md`, sección R2) + hallazgos de infraestructura del 2026-09-01

<domain>
## Phase Boundary

Las evidencias y plantillas confidenciales se guardan y leen desde Cloudflare R2, **sin que cambie el esquema de Prisma, ningún componente de cliente, ni la autorización**.

El núcleo es sorprendentemente barato y esa es la razón de que esta fase exista ahora: `fileKey` ya guarda una **clave opaca** `<subdir>/<uuid>.<ext>`, que es una clave de objeto R2 válida tal cual. Se reescriben los cuerpos de tres funciones de `apps/web/lib/document-storage.ts` con **firmas byte-idénticas**, y todo lo demás —`/files/*`, `/api/upload/*`, el esquema, los formularios— se queda igual.

**Fuera de alcance:**
- El **tier público** (`public/uploads/**`) no se mueve, a propósito. La base guarda ahí rutas de URL, no claves opacas, y están incrustadas en una docena de columnas **y dentro del markdown de `Lesson.content`**: migrarlo es reescribir una columna Json con expresiones regulares, radio de daño alto y fallo parcial silencioso.
- La **subida directa por URL firmada** es la fase 6, no ésta.
- Cualquier cambio de esquema Prisma.
</domain>

<decisions>
## Implementation Decisions

Cerradas. No re-litigar.

### Hallazgo que redefine el riesgo de la fase

**El volumen privado de producción está VACÍO** (0 archivos, verificado el 2026-09-01). El módulo se desplegó apagado y nunca se escribió una evidencia. Consecuencias:

- **La migración con `rclone` es un no-op en producción.** El plan original la trataba como el corte arriesgado, con respaldo previo y ventana de rollback de 30 días. No hay nada que copiar.
- La fase pasa de *"migrar datos vivos"* a *"cambiar el backend antes de que existan datos"*. Es el mejor momento posible para hacerlo.
- **Pero el procedimiento de migración se escribe y se prueba igual, en local**, porque el día que haya datos hará falta. Ver criterio 2 abajo.

### Dependencia: `aws4fetch`, no `@aws-sdk/client-s3`

~6 KB, cero dependencias transitivas, compatible con Edge, firma SigV4 y presigna: exactamente las operaciones necesarias. El SDK de AWS son ~2 MB en ~40 paquetes para lo mismo, y sería la dependencia más grande del repo. `.npmrc` documenta timeouts por acceso inestable del VPS al registry, así que meter 40 paquetes es un riesgo de despliegue real.

Forma del módulo `apps/web/lib/r2.ts`: calcada de `apps/web/lib/cloudflare-stream.ts` — const de base a nivel de módulo más `getCredentials()` que lanza en español. Exporta `r2Put`, `r2Get`, `r2Head`.

### Validación: feature flag, NO fail-fast

`const STORAGE_BACKEND = process.env.R2_BUCKET ? "r2" : "disk"` a nivel de módulo en `document-storage.ts`. Tres razones, y la primera es un contrato explícito del repo:

1. **`apps/web/lib/env.ts` dice literalmente** que las llaves de servicios opcionales (Cloudflare Stream, Stripe, Resend) no van en el esquema crítico y "se validan en su propio módulo si se usan". Meter R2 ahí rompe el contrato declarado del archivo. Se añade una función exportada `assertR2Env()` aparte.
2. Rompería el desarrollo local y CI, donde nadie tiene llaves R2.
3. **Rollback instantáneo**: quitar una variable de entorno y reiniciar. Sin desplegar código.

Añadir en `assertCriticalServerEnv` un **warning de producción** (no throw) si `!R2_BUCKET && !PRIVATE_UPLOAD_DIR`, espejando el `warnedAboutPrivateDir` de `upload-paths.ts`.

#### Enmienda del 2026-09-01: configuración R2 parcial

La investigación encontró un caso que el warning de arriba no cubre: **`R2_BUCKET` presente pero con alguna de las otras tres credenciales ausente**. El warning no se dispara (el bucket sí existe) y el fallo aparecería sólo al primer archivo real.

Se evaluaron tres respuestas y **el usuario eligió la tercera**:

1. *Sólo warning* (lo que decía originalmente esta sección): entre el despliegue y la primera subida nadie se entera de que la configuración está a medias.
2. *Fallar al arrancar*: detecta el problema cuanto antes, pero **una errata en una variable del módulo documental tumbaría toda la plataforma** —cursos, evaluaciones, certificados—, que es exactamente lo que el título "NO fail-fast" quería evitar.
3. **Fallar al escribir, no al arrancar** ← elegida.

**Comportamiento acordado:** la aplicación **arranca con normalidad** y registra un aviso claro en el log. Pero cuando `R2_BUCKET` está puesta y falta alguna credencial, `storePrivateFile` **no degrada a disco en silencio**: rechaza la escritura con un error explícito y lo registra.

El razonamiento es que hay dos fallos malos y esto evita los dos: no tumba la plataforma entera por una variable de un módulo, y no esparce evidencias por almacenamiento efímero — que es el fallo que la fase 1 acaba de cerrar. La lectura (`readPrivateFile`) puede seguir intentando disco, porque leer de donde no hay devuelve `null` y eso ya está contemplado.

`STORAGE_BACKEND` sigue siendo `"r2"` sólo con las cuatro variables. **El rollback de R2-04 no cambia**: quitar `R2_BUCKET` y reiniciar devuelve el backend a disco, sin configuración parcial de por medio.

### Qué NO se toca

- `privateFileResponse`: **cero ediciones**.
- `apps/web/app/files/{evidence,company-document,manual-document}/[id]/route.ts`: **cero ediciones**. Siguen autorizando contra la base exactamente igual.
- `apps/web/app/api/upload/{evidence,document-template}/route.ts`: **cero ediciones**.
- `packages/db/prisma/schema.prisma`: **cero ediciones**.

Las validaciones de `storePrivateFile` (MIME, tamaño, vacío) se mantienen y ocurren **antes** de la llamada de red. Las comprobaciones de `readPrivateFile` (`parts.length !== 2`, allowlist de subdir, `..`) se mantienen: ahora previenen inyección de claves en la ruta R2, que es el mismo valor por otro motivo.

### Credenciales: ya existen en local, faltan en producción

El usuario provisionó R2 el 2026-09-01 y puso las variables en el `.env` local (que está gitignored): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Verificado con una petición firmada: el bucket responde 200 y se puede listar.

**Pendiente**: aplicarlas al env del contenedor en el VPS (`/etc/containers/env/prol-web-1.env`) **por SSH, nunca commiteadas**. Es una regla permanente del proyecto y va como paso explícito del plan de despliegue, no como tarea suelta.

### Bucket COMPARTIDO con prefijo `prol/` — decisión del usuario, con riesgo asumido

El bucket es **`ibizadata`, y no es de PROL**: contiene datos de producción del CRM de IBIZA bajo los prefijos `empresas/` y `leads/` (PDFs de julio y agosto, verificado listando el bucket). Se planteó crear uno dedicado; el usuario eligió **compartirlo bajo el prefijo `prol/`**.

**Riesgo asumido y documentado**: el token puede escribir sobre todo el bucket, así que un fallo de PROL, una regla de ciclo de vida mal puesta o un borrado equivocado alcanzarían archivos del CRM. Mitigaciones que los planes **deben** incluir:

- **Ninguna operación de borrado en esta fase.** `document-storage.ts` sólo necesita PUT y GET. No se implementa `r2Delete`, ni siquiera "por si acaso".
- **Ninguna regla de ciclo de vida ni de versionado** sobre el bucket: afectaría también al CRM. Si se quiere versionado para PROL, es motivo para volver a plantear el bucket dedicado.
- Toda clave que PROL escriba **debe** empezar por `prol/`. Una prueba automatizada debe fallar si alguna no lo hace.

### El prefijo NO entra en `fileKey` — es la decisión crítica de la fase

`fileKey` sigue guardando en la base la clave opaca **`<subdir>/<uuid>.<ext>`**, exactamente como hoy. El prefijo `prol/` se añade al escribir y se quita al leer, **dentro de la frontera de almacenamiento** (`lib/r2.ts` o la rama R2 de `document-storage.ts`), y no sale de ahí.

Si el prefijo se filtrara a `fileKey` se romperían tres cosas a la vez:

1. Las filas que ya existen en la base dejarían de resolver.
2. **El rollback a disco (R2-04) se rompería**, porque las rutas de disco no llevan `prol/`.
3. La base dejaría de ser agnóstica al backend, que es justo la propiedad que hace barata toda esta fase.

Corolario para el criterio 2: la equivalencia que hay que demostrar es que **una misma `fileKey` sin modificar resuelve en los dos backends**.

### Criterio 2 de la fase: se prueba en local con datos fabricados

El criterio dice *"una evidencia anterior a la migración se descarga igual, sin haber tocado la base"*. En producción no hay datos, así que **se demuestra en local**: subir un par de evidencias con el backend en disco, correr la migración, y comprobar que se siguen descargando. Eso conserva el valor real del criterio —demuestra que las claves opacas resuelven igual en ambos backends— sin depender de que producción tenga histórico.

### Claude's Discretion

- Reparto en planes y olas.
- Firma exacta y nombres internos de `lib/r2.ts`.
- Cómo se fabrica el histórico local del criterio 2.
- Si `loadPrivateFileAsDataUrl` entra en esta fase o se difiere a la 4 (sólo la necesita el PDF). Pasa por `readPrivateFile`, así que es agnóstica al backend por construcción.
</decisions>

<specifics>
## Specific Ideas

- **`rclone` NO está instalado en el host de producción.** Si algún plan lo necesita, instalarlo es un paso explícito. En local tampoco está.
- **Nota de latencia, honesta:** server-proxied mete R2 → app → navegador, y `readPrivateFile` devuelve un `Buffer` completo que `privateFileResponse` envuelve en `new Uint8Array(buffer)` — **el archivo entero pasa por el heap de Node**. Ya es así con disco, así que no es regresión, pero conviene decirlo. La optimización (redirect 302 a URL firmada tras autorizar) es de una fase posterior.
- **Consecuencia a asumir explícitamente:** la aplicación queda con **dos backends de almacenamiento** para siempre. El interruptor vive en un solo sitio y se documenta en la cabecera de `document-storage.ts`.
- **Post-R2 el respaldo del tier confidencial** pasa a ser "activar versionado de objetos + regla de ciclo de vida": un ajuste de panel a documentar, no un script. El tarball `private_*.tar.gz` de `backup.sh` puede quedarse como cinturón y tirantes.
- **Puertas transversales del milestone**: `check-types` limpio, `turbo run lint` en **exit 1 con `✖ 81 problems (0 errors, 81 warnings)`** —esa es la línea base sana, no la "arregles"—, y `build` verde.
- Base local en `localhost:5435` (contenedor `prol-db`), sembrada, con dos evidencias de matriz de riesgos de la fase 1 (`1|f` y `2|t`) que no hay que romper.
- **Los ejecutores en paralelo se pisan el índice de git** (pasó en la fase 1, con `branching_strategy: "none"`). Si esta fase tiene varios planes en una ola, hay que serializarlos o darle worktree a cada uno.
</specifics>

<deferred>
## Deferred Ideas

- **Subida directa por URL firmada** y todo lo que arrastra (acción `createEvidenceUploadUrl`, verificación por HEAD, CSP, CORS del bucket, barra de progreso, tope de 200 MB): es la **fase 6**.
- **Redirect 302 a URL firmada** en `/files/evidence/[id]` para sacar la app del camino de datos: optimización posterior, con su contrapartida (la URL es compartible durante su vigencia y el `Content-Disposition` hay que meterlo por response-header override).
- **Migrar el tier público a R2 / CDN con dominio propio**: proyecto aparte, con su propio trabajo de CSP y `images.remotePatterns`.
- **Recolector de objetos huérfanos**: no aplica todavía, porque sin subida directa no hay huérfanos. Vuelve en la fase 6.
</deferred>

---

*Phase: 02-r2-para-el-tier-confidencial*
*Context gathered: 2026-09-01 via PRD Express Path*
