# Phase 2: R2 para el tier confidencial - Research

**Researched:** 2026-09-01
**Domain:** Almacenamiento de objetos S3-compatible (Cloudflare R2) detrás de un feature flag, sin tocar esquema/cliente/autorización
**Confidence:** HIGH (todo verificado abriendo el código real; sólo dos puntos de la API de `aws4fetch` quedan en MEDIUM, señalados abajo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hallazgo que redefine el riesgo de la fase:** el volumen privado de producción está VACÍO (0 archivos). La migración con `rclone` es un no-op en producción; la fase pasa de "migrar datos vivos" a "cambiar el backend antes de que existan datos". El procedimiento de migración se escribe y se prueba igual, en local.

**Dependencia: `aws4fetch`, no `@aws-sdk/client-s3`.** ~6 KB, cero dependencias transitivas, compatible con Edge, firma SigV4 y presigna. El SDK de AWS son ~2 MB en ~40 paquetes; `.npmrc` documenta timeouts por acceso inestable del VPS al registry. Forma del módulo `apps/web/lib/r2.ts`: calcada de `apps/web/lib/cloudflare-stream.ts` — const de base a nivel de módulo más `getCredentials()` que lanza en español. Exporta `r2Put`, `r2Get`, `r2Head`.

**Validación: feature flag, NO fail-fast.** `const STORAGE_BACKEND = process.env.R2_BUCKET ? "r2" : "disk"` a nivel de módulo en `document-storage.ts`. Razones: (1) `apps/web/lib/env.ts` dice literalmente que las llaves de servicios opcionales no van en el esquema crítico y "se validan en su propio módulo si se usan" — meter R2 ahí rompería ese contrato; se añade una función exportada `assertR2Env()` aparte; (2) rompería dev/CI sin llaves R2; (3) rollback instantáneo quitando una variable de entorno. Añadir en `assertCriticalServerEnv` un **warning de producción** (no throw) si `!R2_BUCKET && !PRIVATE_UPLOAD_DIR`, espejando `warnedAboutPrivateDir` de `upload-paths.ts`.

**Qué NO se toca:** `privateFileResponse` (cero ediciones); `apps/web/app/files/{evidence,company-document,manual-document}/[id]/route.ts` (cero ediciones); `apps/web/app/api/upload/{evidence,document-template}/route.ts` (cero ediciones); `packages/db/prisma/schema.prisma` (cero ediciones). Las validaciones de `storePrivateFile` (MIME, tamaño, vacío) se mantienen y ocurren antes de la llamada de red. Las comprobaciones de `readPrivateFile` (`parts.length !== 2`, allowlist de subdir, `..`) se mantienen: ahora previenen inyección de claves en la ruta R2.

**Credenciales:** ya existen en local (`.env` gitignored): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Verificado con una petición firmada: el bucket responde 200. Pendiente aplicarlas al env del contenedor en el VPS por SSH, nunca commiteadas — paso explícito del plan de despliegue.

**Bucket COMPARTIDO con prefijo `prol/`:** el bucket es `ibizadata`, no es de PROL — contiene datos de producción del CRM de IBIZA bajo `empresas/` y `leads/`. El usuario eligió compartirlo bajo el prefijo `prol/`. Riesgo asumido: el token puede escribir sobre todo el bucket. Mitigaciones obligatorias: ninguna operación de borrado en esta fase (sólo PUT y GET; no `r2Delete`); ninguna regla de ciclo de vida ni versionado sobre el bucket; toda clave que PROL escriba debe empezar por `prol/`, con una prueba automatizada que falle si alguna no lo hace.

**El prefijo NO entra en `fileKey`** — decisión crítica de la fase. `fileKey` sigue guardando `<subdir>/<uuid>.<ext>` exactamente como hoy. El prefijo `prol/` se añade al escribir y se quita al leer, dentro de la frontera de almacenamiento (`lib/r2.ts` o la rama R2 de `document-storage.ts`), y no sale de ahí. Si se filtrara: (1) las filas existentes dejarían de resolver, (2) el rollback a disco (R2-04) se rompería, (3) la base dejaría de ser agnóstica al backend. Corolario: la equivalencia a demostrar es que una misma `fileKey` sin modificar resuelve en los dos backends.

**Criterio 2 se prueba en local con datos fabricados:** subir evidencias con backend disco, correr la migración, comprobar que se siguen descargando — sin depender de histórico real en producción.

### Claude's Discretion

- Reparto en planes y olas.
- Firma exacta y nombres internos de `lib/r2.ts`.
- Cómo se fabrica el histórico local del criterio 2.
- Si `loadPrivateFileAsDataUrl` entra en esta fase o se difiere a la 4 (sólo la necesita el PDF). Pasa por `readPrivateFile`, así que es agnóstica al backend por construcción.

### Deferred Ideas (OUT OF SCOPE)

- Subida directa por URL firmada y todo lo que arrastra (`createEvidenceUploadUrl`, verificación por HEAD, CSP, CORS del bucket, barra de progreso, tope de 200 MB): fase 6.
- Redirect 302 a URL firmada en `/files/evidence/[id]`: optimización posterior.
- Migrar el tier público a R2/CDN con dominio propio: proyecto aparte.
- Recolector de objetos huérfanos: vuelve en la fase 6.
- **Restricciones adicionales de esta investigación:** no proponer cambios de esquema Prisma (sólo `db push` aditivo); no proponer subida directa por URL firmada; no proponer ninguna operación de borrado en R2 (bucket compartido en producción).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descripción | Soporte de la investigación |
|----|-------------|------------------------------|
| R2-01 | Evidencias y plantillas confidenciales viven en R2, sin cambiar el esquema ni el cliente | Transcripción completa de `document-storage.ts` con líneas exactas de lo que cambia (cuerpos de `storePrivateFile`/`readPrivateFile`) y lo que no (validaciones, `privateFileResponse`, los 5 call sites, el esquema). Forma de `lib/r2.ts` calcada de `cloudflare-stream.ts`, verificada línea por línea. `aws4fetch` verificado vía Context7: construcción de `AwsClient`, PUT/GET firmados, tamaño y dependencias confirmados contra npm. |
| R2-02 | Los archivos anteriores a la migración siguen descargándose sin tocar la base | Frontera del prefijo `prol/` localizada con precisión: vive dentro de la rama R2 de `document-storage.ts` (o en `r2.ts` si se prefiere acoplarlo ahí), nunca en `fileKey`. Confirmado por grep exhaustivo que ningún otro archivo del repo reconstruye rutas a partir de `fileKey`/`baseFileKey` — sólo se pasa opaco. |
| R2-03 | `/files/*` sigue autorizando contra la base: 403 desde otra empresa, 401 sin sesión | Las tres rutas `/files/*/[id]/route.ts` transcritas: autorizan 100% contra Prisma antes de llamar a `readPrivateFile`/`privateFileResponse`, sin conocimiento del backend. Confirmado que no requieren edición. |
| R2-04 | Quitar una variable de entorno devuelve la app al disco local, sin desplegar código | `STORAGE_BACKEND` como constante de módulo evaluada una sola vez por proceso a partir de `R2_BUCKET`; `resolvePrivateUploadDir`/`PRIVATE_SUBDIR` intactos como rama de fallback. Riesgo documentado: `R2_BUCKET` presente con credenciales incompletas no falla al boot, sólo al primer request real (pitfall #1). |

</phase_requirements>

## Summary

El núcleo de esta fase es barato porque `fileKey` ya es una clave opaca `<subdir>/<uuid>.<ext>` — una clave de objeto S3/R2 válida sin transformación. Verificado abriendo `apps/web/lib/document-storage.ts` completo: las tres funciones exportadas (`storePrivateFile`, `readPrivateFile`, `privateFileResponse`) tienen fronteras muy limpias. `storePrivateFile` valida MIME/tamaño/vacío (líneas 46-62, no cambian) y luego escribe a disco (líneas 64-70, sí cambian); `readPrivateFile` valida la forma de la clave (líneas 91-99, no cambian) y luego lee del disco (líneas 101-107, sí cambian); `privateFileResponse` no toca ni disco ni red (cero ediciones, confirmado). Los 5 call sites del repo (3 rutas `/files/*`, 2 rutas `/api/upload/*`) pasan `fileKey`/el `File` de forma opaca — ninguno reconstruye rutas, así que la frontera de cambio queda perfectamente contenida en un archivo.

`apps/web/lib/cloudflare-stream.ts` es el molde exacto para el nuevo `lib/r2.ts`: una constante de base a nivel de módulo, una función `getCredentials()` que lanza `Error` en español si falta cualquier variable, y funciones exportadas que llaman a `getCredentials()` primero y lanzan si `!res.ok`. `aws4fetch` (verificado vía Context7, versión 1.0.20 en npm, sin `dependencies`) provee exactamente `AwsClient` con `.fetch()` firmando SigV4 automáticamente; no lanza por códigos de estado HTTP (sólo por errores de red o de construcción), lo cual es la pieza clave para distinguir "objeto no encontrado" (404, sin throw) de un error real (403/500, también sin throw pero que el código debe loguear explícitamente para no confundirlo con "no existe").

La decisión de que el prefijo `prol/` nunca toque `fileKey` es autocontenida: el grep exhaustivo de `fileKey`/`baseFileKey` en todo `apps/web` confirma que el único lugar que necesita conocer el prefijo es la rama R2 de `document-storage.ts` (o `r2.ts`, si se prefiere que el módulo de transporte lo sepa) — nada más en el repo construye una ruta a partir de esa cadena.

**Primary recommendation:** implementar `lib/r2.ts` como cliente R2 genérico y sin conocimiento de `prol/` (igual que `cloudflare-stream.ts` no sabe nada de PROL, sólo de Cloudflare), y colocar el prepend/strip del prefijo compartido dentro de la rama `STORAGE_BACKEND === "r2"` de `document-storage.ts`, justo antes de llamar a `r2Put`/`r2Get` — así ni `/files/*` ni `/api/upload/*` ni `lib/r2.ts` mismo se enteran de que el bucket es compartido.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `aws4fetch` | `1.0.20` (última en npm, confirmado 2026-09-01) | Firma SigV4 y `fetch` contra R2 (S3-compatible) | Cero dependencias (confirmado con `npm view aws4fetch dependencies` → vacío), ~6.4 KB minificado / 2.5 KB gzip (Context7), corre en Node y en Edge, reintenta con backoff exponencial por defecto |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `aws4fetch` | `@aws-sdk/client-s3` | ~2 MB en ~40 paquetes transitivos para las mismas 2-3 operaciones (PUT/GET); sería la dependencia más pesada del repo; `.npmrc` ya documenta `ERR_SOCKET_TIMEOUT` del VPS contra el registry con paquetes grandes (Trigger.dev/OpenTelemetry) — riesgo de despliegue real, no teórico. Descartado por decisión ya cerrada en CONTEXT. |

**Installation:**
```bash
cd apps/web && pnpm add aws4fetch
```
No hay `catalog:` de pnpm en este monorepo (`pnpm-workspace.yaml` sólo declara `packages:`); las demás dependencias de `apps/web/package.json` (p.ej. `stripe@^20.4.1`, `resend@^6.9.4`) se pinean con semver directo — seguir el mismo patrón (`"aws4fetch": "^1.0.20"`).

## Architecture Patterns

### `apps/web/lib/document-storage.ts` — transcripción completa (líneas verificadas)

Cabecera (líneas 1-23): módulo "sólo servidor" que importa `node:fs/promises`, `node:path`, `node:crypto`, `resolvePrivateUploadDir` de `@/lib/upload-paths`, y el contrato puro de `@/lib/document-files` (`MAX_FILE_SIZE`, `safeFilename`, `PrivateSubdir`, `StoredFile`).

**`storePrivateFile`** (líneas 41-81):
```typescript
export async function storePrivateFile(
  file: File,
  subdir: PrivateSubdir,
  allowed: Record<string, string>,
): Promise<StoreResult | StoreError> {
  const ext = allowed[file.type];                          // línea 46
  if (!ext) { return { ok:false, status:400, error: /* MIME no permitido */ }; }  // 47-56
  if (file.size > MAX_FILE_SIZE) { return { ok:false, status:400, error:"El archivo supera los 25MB" }; }  // 57-59
  if (file.size < 10) { return { ok:false, status:400, error:"Archivo vacío" }; }  // 60-62

  const storedName = `${crypto.randomUUID()}.${ext}`;      // línea 64 — NO CAMBIA
  const targetDir = resolvePrivateUploadDir(subdir);        // línea 65 — sólo rama disco
  await mkdir(targetDir, { recursive: true });               // línea 66 — sólo rama disco
  await writeFile(join(targetDir, storedName), Buffer.from(await file.arrayBuffer())); // 67-70 — sólo rama disco

  return {
    ok: true,
    file: {
      fileKey: `${subdir}/${storedName}`,                   // línea 75 — NO CAMBIA (formato de fileKey idéntico)
      fileName: safeFilename(file.name),
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}
```
**Qué cambia:** líneas 65-70 (la escritura física). **Qué NO cambia:** la firma completa, las validaciones (46-62), la forma exacta del `fileKey` devuelto (línea 75) y el resto del objeto `StoredFile`.

**`readPrivateFile`** (líneas 90-108):
```typescript
export async function readPrivateFile(fileKey: string): Promise<Buffer | null> {
  const parts = fileKey.split("/").filter(Boolean);          // línea 91 — NO CAMBIA
  if (parts.length !== 2) return null;                        // línea 92 — NO CAMBIA
  const [subdir, name] = parts as [string, string];
  if (subdir !== "evidence" && subdir !== "templates") return null;  // línea 94 — NO CAMBIA
  if (name.includes("..") || name.includes("\\")) return null; // línea 95 — NO CAMBIA

  const dir = resolvePrivateUploadDir(subdir);                 // línea 97 — sólo rama disco
  const fullPath = normalize(join(dir, name));                 // línea 98 — sólo rama disco
  if (!fullPath.startsWith(normalize(dir))) return null;       // línea 99 — sólo rama disco (containment check)

  try {
    const info = await stat(fullPath);                          // línea 102 — sólo rama disco
    if (!info.isFile()) return null;                             // línea 103 — sólo rama disco
    return await readFile(fullPath);                             // línea 104 — sólo rama disco
  } catch {
    return null;                                                  // línea 106 — colapsa TODO error a null
  }
}
```
**Qué cambia:** líneas 97-107 (todo el acceso físico). **Qué NO cambia:** la firma, y las cuatro comprobaciones de forma de clave (91-95), que el propio CONTEXT reconoce que ahora sirven para prevenir inyección de claves R2 en vez de path traversal en disco — mismo valor, otro motivo.

**`privateFileResponse`** (líneas 117-130): **cero ediciones**, confirmado — no importa `node:fs`, no depende de ningún backend, sólo envuelve un `Buffer` ya cargado en un `Response` con `Content-Type`, `Content-Disposition`, `Cache-Control: private, no-store, max-age=0` y `X-Content-Type-Options: nosniff`.

### Todos los call sites (verificados por grep en todo `apps/web`, excluyendo `.next/standalone`)

| Archivo | Línea | Llamada |
|---------|-------|---------|
| `app/files/evidence/[id]/route.ts` | 52, 55 | `readPrivateFile(evidence.fileKey)` → `privateFileResponse(buffer, {...})` |
| `app/files/company-document/[id]/route.ts` | 41, 44 | `readPrivateFile(doc.fileKey)` → `privateFileResponse(buffer, {...})` |
| `app/files/manual-document/[id]/route.ts` | 54, 57 | `readPrivateFile(doc.baseFileKey)` → `privateFileResponse(buffer, {...})` |
| `app/api/upload/evidence/route.ts` | 24 | `storePrivateFile(file, "evidence", EVIDENCE_EXT_BY_MIME)` |
| `app/api/upload/document-template/route.ts` | 23 | `storePrivateFile(file, "templates", TEMPLATE_EXT_BY_MIME)` |

Ningún call site reconstruye una ruta a partir de `fileKey`/`baseFileKey`: sólo lo reciben del resultado de `storePrivateFile` y lo pasan íntegro a `readPrivateFile`. El único otro lugar donde `fileKey`/`baseFileKey` aparece en el código es en las escrituras a Prisma (`lib/actions/evidence.ts:163`, `lib/actions/manual.ts:502,551,900`), que también lo guardan verbatim (`input.file.fileKey`), y en el `schema.prisma`:
- `Evidence.fileKey` (modelo en línea 2740, campo en línea 2761): `String?`, nullable — la ruta ya comprueba `!evidence?.fileKey`.
- `CompanyDocument.fileKey` (modelo en línea 2656, campo en línea 2669): `String`, obligatorio.
- `ManualDocument.baseFileKey` (modelo en línea 2492, campo en línea 2503): `String?`, nullable.

Las tres rutas `/files/*/[id]/route.ts` (transcritas íntegramente en los archivos leídos) autorizan 100% contra Prisma **antes** de tocar `readPrivateFile`: sesión vía `requireUser()` (401 si falla, capturado en el `catch` de cada ruta comparando `message === "Unauthorized"`), luego `assertDocumentsEnabled(tenantId, role)`, luego el chequeo de pertenencia (personal del tenant vs miembro de la empresa dueña) que devuelve 403 si falla. Ninguna sabe si el archivo viene de disco o de R2 — confirmado, no requieren edición.

### `apps/web/lib/cloudflare-stream.ts` — molde exacto para `lib/r2.ts`

```typescript
const CF_API_BASE = "https://api.cloudflare.com/client/v4";   // línea 1: const de base a nivel de módulo

function getCredentials() {                                     // líneas 3-10
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Credenciales de Cloudflare Stream no configuradas"); // lanza en español
  }
  return { accountId, apiToken };
}

export async function createDirectUploadUrl(meta?: Record<string, string>) {
  const { accountId, apiToken } = getCredentials();              // se llama al INICIO de cada función exportada
  // ... fetch ...
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare Stream error: ${text}`);          // lanza si !res.ok
  }
  // ...
}
```
**Patrón a calcar:** (1) constante de base a nivel de módulo, (2) `getCredentials()` sin caché — se recalcula en cada llamada leyendo `process.env` directamente, sin memoizar el resultado ni la instancia del cliente, (3) cada función exportada llama a `getCredentials()` primero, luego hace la llamada de red, luego lanza si `!res.ok`.

**Sobre "cómo se testea la ausencia de credenciales":** no existe ningún archivo de test para `cloudflare-stream.ts` en el repo (confirmado: no hay `*.test.*` ni `*.spec.*` en todo el árbol, y no hay script `test` en `package.json` — el proyecto no tiene infraestructura de testing automatizado en absoluto). La "prueba" hoy es puramente manual/en producción: si faltan las variables, la primera llamada real lanza y el `catch` de la ruta que la invoque decide el código HTTP. Esto es relevante para la exigencia de CONTEXT de "una prueba automatizada debe fallar si alguna [clave] no lleva `prol/`" — ver Pitfall y Open Question más abajo: **no hay test runner en el repo hoy**, así que esa prueba automatizada requiere decidir explícitamente cómo se ejecuta (bring-your-own-runner vs guard en runtime).

**Propuesta de forma para `lib/r2.ts`** (discreción de Claude según CONTEXT, pero anclada al molde verificado):
```typescript
const r2Endpoint = (accountId: string) =>
  `https://${accountId}.r2.cloudflarestorage.com`;

function getCredentials() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Credenciales de R2 no configuradas");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

// assertR2Env() exportada aparte, sin acoplarse a assertCriticalServerEnv:
export function assertR2Env(): void {
  getCredentials(); // reutiliza el mismo chequeo; lanza si falta algo
}
```
Nota: a diferencia de `cloudflare-stream.ts` (que no cachea nada porque cada request HTTP directo es barato de rearmar), para R2 conviene evaluar si cachear la instancia de `AwsClient` a nivel de módulo (construirla una vez con las credenciales ya validadas) en vez de reconstruirla en cada `r2Put`/`r2Get` — `aws4fetch` soporta pasar un `cache: new Map()` compartido explícitamente para evitar rederivar el material de firma SigV4 en cada llamada (ver Code Examples). Ambas opciones son legítimas; cachear el cliente es más fiel al uso recomendado de `aws4fetch` para cargas repetidas.

### `apps/web/lib/env.ts` — comentario citado y forma de `assertCriticalServerEnv`

Comentario exacto (líneas 11-14):
> "Variables que deben existir para que la app sea funcional en cualquier despliegue real. No incluye llaves de servicios opcionales (IA, Stripe, Cloudflare Stream, Resend) — esas están gateadas por feature flags o rutas específicas y se validan en su propio módulo si se usan."

Forma de `assertCriticalServerEnv()` (líneas 28-51): singleton perezoso vía `let validated = false` (línea 26) — retorna inmediatamente si ya corrió (línea 29); se salta durante `next build` comprobando `NEXT_PHASE === "phase-production-build"` (línea 35); marca `validated = true` (línea 37); valida `CriticalEnvSchema` (Zod: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DOMAIN`, `BETTER_AUTH_SECRET`) con `safeParse`; si falla, en producción lanza (línea 48), en desarrollo sólo `console.warn` (línea 50).

**Dónde encaja el warning de producción (no throw) para R2:** dentro del mismo bloque de `assertCriticalServerEnv`, **después** de que el `safeParse` de las variables críticas termine (éxito o warning), como un chequeo adicional e independiente del schema Zod — porque `R2_BUCKET`/`PRIVATE_UPLOAD_DIR` nunca deben entrar en `CriticalEnvSchema` (eso rompería el contrato citado arriba). Al ser `assertCriticalServerEnv` ya un singleton por proceso (guardado por `validated`), el nuevo chequeo `if (process.env.NODE_ENV === "production" && !process.env.R2_BUCKET && !process.env.PRIVATE_UPLOAD_DIR) console.warn(...)` no necesita su propio flag anti-repetición — ya está protegido por el guard existente de la función completa.

**Dónde encaja `assertR2Env()`:** exportada aparte, **no** invocada desde `assertCriticalServerEnv` (eso violaría el comentario citado). El lugar natural es dentro de `lib/r2.ts` mismo (colocada junto a las credenciales que valida), consistente con "se validan en su propio módulo si se usan".

### La frontera del prefijo `prol/`

Dado que el grep exhaustivo confirma que `fileKey`/`baseFileKey` sólo se usa opacamente (nunca reconstruido fuera de `document-storage.ts`), el prefijo puede vivir en uno de dos sitios:

1. **Dentro de `lib/r2.ts`** (`r2Put`/`r2Get` prependen/quitan `prol/` internamente) — acopla el módulo de transporte al conocimiento de "este bucket es compartido".
2. **Dentro de la rama `STORAGE_BACKEND === "r2"` de `document-storage.ts`**, justo antes de invocar `r2Put(\`prol/${subdir}/${storedName}\`, ...)` / `r2Get(\`prol/${fileKey}\`)` — deja `r2.ts` como cliente R2 genérico y reutilizable, sin lógica de negocio de PROL, exactamente como `cloudflare-stream.ts` no sabe nada de PROL, sólo de la API de Cloudflare.

**Recomendación:** opción 2, por simetría con el molde verificado (`cloudflare-stream.ts` es un wrapper de API genérico, no un lugar para reglas de negocio) y porque toda la demás política de almacenamiento (límites de tamaño, allowlist de MIME, formato de `fileKey`) ya vive en `document-storage.ts`/`document-files.ts` — es coherente mantener ahí también la política "este bucket es compartido, hay que prefijar". Cualquiera de las dos opciones satisface el requisito de que ni `/files/*` ni `/api/upload/*` se enteren, porque ambas quedan a dos saltos de esas rutas.

**Prueba automatizada del prefijo:** el repo no tiene ningún test runner instalado hoy (ni `vitest`/`jest` en `package.json`, ni carpetas `__tests__`/`test/`). El requisito de CONTEXT ("una prueba automatizada debe fallar si alguna [clave] no lo hace") no se puede satisfacer con la infraestructura actual sin decidir explícitamente: (a) instalar un runner mínimo, o (b) implementarlo como una aserción en runtime dentro de la rama R2 de `document-storage.ts` (p. ej. `if (!key.startsWith("prol/")) throw new Error(...)` antes de cada `r2Put`/`r2Get`) que actúe como red de seguridad ejecutada en cada request real en vez de en CI. Ver Open Questions.

### `apps/web/lib/upload-paths.ts` y las rutas `/files/*/[id]/route.ts`

`resolvePrivateUploadDir(subdir)` (líneas 61-76) y `PRIVATE_SUBDIR = "private"` (línea 38): usados hoy **únicamente** por `document-storage.ts` (rama disco) y por `app/uploads/[...path]/route.ts` (línea 4, 69) — y en este segundo caso sólo para **rechazar** el segmento `"private"` si alguien intentara pedirlo por la ruta pública, nunca para leerlo. Confirmado por grep: ningún otro archivo importa `resolvePrivateUploadDir`/`PRIVATE_SUBDIR`.

**Por qué no cambian:** (1) la rama `STORAGE_BACKEND === "disk"` de `storePrivateFile`/`readPrivateFile` los sigue necesitando para dev/CI/rollback (R2-04 exige que quitar la variable de entorno devuelva la app al disco, sin desplegar código — eso implica que la rama disco debe seguir funcional, no eliminarse); (2) el trabajo de `PRIVATE_SUBDIR` (bloquear que `public/uploads/private/...` se sirva por la ruta pública) es ortogonal a qué backend sirve la ruta autorizada — sigue siendo necesario exista o no R2.

Las tres rutas `/files/*/[id]/route.ts` no importan `upload-paths.ts` ni `node:fs` directamente — sólo `@/lib/document-storage`. Confirmado que no requieren ninguna edición.

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por qué |
|----------|--------------|-------------------|---------|
| Firma SigV4 para R2 | Construcción manual del canonical request, hash del scope de credenciales, derivación de la clave de firma | `AwsClient.fetch()` de `aws4fetch` | R2 exige SigV4; implementar el canonical request a mano es exactamente el tipo de trampa de "correctitud de protocolo" que ya está resuelta y probada en una librería de 6 KB (verificado vía Context7). |
| Reintentos ante 5xx/429 transitorios de R2 | Un loop de retry casero alrededor de `fetch` | El backoff exponencial con jitter incorporado de `aws4fetch` (opciones `retries`/`initRetryMs`, activado por defecto) | El loop interno (confirmado vía Context7, ver Code Examples) ya sólo reintenta en `status >= 500` o `429`, nunca en 404 — cualquier reimplementación casera probablemente reintentaría mal los 404 o mal los 4xx en general. |
| Distinguir "objeto no encontrado" de "credenciales rotas" | Parseo de mensajes de error o adivinar por el tipo de excepción | `response.status` / `response.ok` sobre el resultado de `aws.fetch()` | Confirmado vía Context7: `aws4fetch` **no lanza** por códigos de estado HTTP, sólo por errores de red o de construcción del cliente (`TypeError` si faltan `accessKeyId`/`secretAccessKey`). El discriminador correcto es el status code, igual que hoy el disco distingue (mal, ver Pitfall #2) vía `try/catch` sobre `stat`/`readFile`. |

**Key insight:** el dominio (SigV4 contra un endpoint S3-compatible) ya tiene una solución de 6 KB, cero dependencias, verificada por Context7 y por `npm view`. El único trabajo real de esta fase es la política de PROL (flag, prefijo, límites), no el protocolo de firma.

## Common Pitfalls

### 1. `R2_BUCKET` presente pero credenciales incompletas
**Qué pasa:** `STORAGE_BACKEND` se evalúa una sola vez, a nivel de módulo, en el primer import del proceso, y sólo mira `R2_BUCKET`. Si `R2_BUCKET` existe pero falta `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, la app arranca sin error, pasa cualquier healthcheck, y sólo revienta en el primer `storePrivateFile`/`readPrivateFile` real, con el `throw new Error("Credenciales de R2 no configuradas")` de `getCredentials()`. Es exactamente lo mismo que ya pasa hoy si sólo se define `CLOUDFLARE_ACCOUNT_ID` sin `CLOUDFLARE_STREAM_API_TOKEN`.
**Por qué pasa:** decisión deliberada de CONTEXT (no fail-fast, para no romper dev/CI ni acoplar R2 al esquema crítico).
**Cómo evitarlo:** el warning de producción propuesto en `env.ts` (`!R2_BUCKET && !PRIVATE_UPLOAD_DIR`) **no cubre este caso** (`R2_BUCKET` sí está presente). No hay forma de cubrirlo sin romper la decisión de "no fail-fast" — se documenta como riesgo operacional aceptado, mitigado por el mensaje claro en español de `getCredentials()` en los logs.
**Señales de alerta:** 500 en `/api/upload/*` o `/files/*` inmediatamente después de un despliegue que activó `R2_BUCKET`.

### 2. GET de una clave inexistente vs. un error real
**Qué pasa:** hoy, en disco, `readPrivateFile` colapsa **cualquier** excepción (`ENOENT`, `EACCES`, lo que sea) a `null` en un único `try/catch` (líneas 101-107) — no distingue "no existe" de "error de permisos". Con R2 vía `aws4fetch`, un GET a una clave inexistente devuelve `response.status === 404` **sin lanzar** (confirmado vía Context7: el loop de reintentos sólo lanza por errores de red/constructor, nunca por status code); un 403 (credenciales sin permiso de lectura) o 500 (R2 caído) también llegan como `Response` sin `throw`.
**Por qué pasa:** si `r2Get` simplemente hace `if (!res.ok) return null` para calcar el comportamiento actual del disco, un fallo real de configuración (403) se confunde silenciosamente con "el archivo no existe".
**Cómo evitarlo:** mantener el contrato de retorno (`Buffer | null`, para no tocar los 5 call sites), pero loguear explícitamente cuando `status !== 404` antes de devolver `null` — así un 403/500 deja rastro en los logs del contenedor aunque el usuario final sólo vea el 404 genérico de `/files/*`.
**Señales de alerta:** todas las descargas de evidencias empiezan a devolver 404 a la vez tras activar R2 (probablemente 403 de credenciales, no archivos faltantes).

### 3. Runtime Node, no Edge
`document-storage.ts` importa `node:fs/promises` y ninguna ruta que lo usa declara `export const runtime = "edge"` (confirmado por grep en `app/files/*` y `app/api/upload/*`). `aws4fetch` funciona en ambos runtimes, pero la rama de fallback a disco (`node:fs`) sólo funciona en Node. Si algún plan futuro forzara `runtime = "edge"` en una de estas rutas (p. ej. para latencia), rompería el fallback a disco de R2-04. No es un riesgo de esta fase en sí, pero es una restricción a no violar accidentalmente.

### 4. El "Buffer completo en heap" ya es cierto hoy — R2 no lo empeora
`privateFileResponse` envuelve un `Buffer` completo en `new Uint8Array(buffer)` (línea 121) — ya pasa con disco. Con R2, `readPrivateFile` tendría que hacer algo equivalente a `Buffer.from(await res.arrayBuffer())` para conservar la firma `Promise<Buffer | null>` — mismo patrón "todo en heap", sin regresión pero tampoco streaming. El propio CONTEXT ya lo documenta como nota honesta, no como bug a resolver en esta fase (la optimización de redirect 302 es posterior).

### 5. Desfase entre `docker-compose.prod.yml` y el env real de producción
`docker-compose.prod.yml` (líneas 32-66) no es lo que corre en producción hoy. Producción usa quadlets de podman con el env en `/etc/containers/env/prol-web-1.env` (confirmado en `DEPLOY.md` líneas 174-176, 329, 356) — **no** `/opt/prol/.env`, que `INTEGRATIONS.md` cita pero que `DEPLOY.md` marca explícitamente como no usado por el host actual ("el host **no** usa `docker compose` ni lee `/opt/prol/.env`"). Cualquier plan de despliegue para R2-04 debe seguir el patrón real documentado en `DEPLOY.md` §7b (volumen + env vía SSH + `systemctl daemon-reload && systemctl restart prol-web-1.service`), replicando la receta ya usada para `PRIVATE_UPLOAD_DIR`, y añadir las 4 variables `R2_*` tanto ahí como al `docker-compose.prod.yml` (que sigue siendo "la receta para reconstruir desde cero", según el propio `DEPLOY.md`).

### 6. Ejecutores en paralelo pisándose el índice de git
Ya ocurrió en la ola 1 de la fase 1 (documentado en `STATE.md`, Blockers): dos agentes sobre el mismo working tree con `branching_strategy: "none"` se absorbieron archivos entre `add` y `commit`. Esta fase concentra casi todo el cambio en un puñado de archivos centrales (`document-storage.ts`, el nuevo `lib/r2.ts`, `env.ts`) de los que dependen los 5 call sites — si el reparto en olas asigna dos planes concurrentes que toquen esos archivos a la vez, el riesgo de colisión es real. Recomendación operativa (discreción del planificador, ya señalada en CONTEXT): serializar los planes que tocan `document-storage.ts`/`lib/r2.ts`/`env.ts`, o darles worktree dedicado.

## Code Examples

### Construir el cliente y hacer PUT/GET (verificado vía Context7, `/mhart/aws4fetch`)

```javascript
// Source: https://github.com/mhart/aws4fetch/blob/master/_autodocs/usage-examples.md
import { AwsClient } from 'aws4fetch'

const aws = new AwsClient({
  accessKeyId: 'AKIA...',
  secretAccessKey: 'wJalr...',
})

// PUT — Content-Type explícito, o cae a application/octet-stream
async function uploadFile(bucketName, objectKey, fileContent, contentType) {
  const response = await aws.fetch(
    `https://${bucketName}.s3.us-east-1.amazonaws.com/${objectKey}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
      body: fileContent,
    }
  )
  if (!response.ok) {
    console.error('S3 upload error:', response.status, await response.text())
    return false
  }
  return true
}

// GET — respuesta estándar Fetch API: .arrayBuffer()/.blob() sirven para binarios
async function downloadFile(bucketName, objectKey) {
  const response = await aws.fetch(
    `https://${bucketName}.s3.us-east-1.amazonaws.com/${objectKey}`,
    { method: 'GET' }
  )
  if (!response.ok) {
    console.error('S3 error:', response.status)
    return null
  }
  return response // .ok compatible con Response estándar: .arrayBuffer(), .blob(), etc.
}
```

### Forzar servicio/región explícitos (necesario para R2, ver Open Questions)

```javascript
// Source: https://github.com/mhart/aws4fetch/blob/master/_autodocs/types.md
const response = await aws.fetch('https://<account>.r2.cloudflarestorage.com/<bucket>/<key>', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: fileBuffer,
  aws: {
    service: 's3',
    region: 'auto',   // CONTEXT ya decide esto; ver Open Questions sobre autodetección
  },
})
```

### Retry loop interno — por qué 404 nunca se confunde con "hay que reintentar"

```javascript
// Source: https://github.com/mhart/aws4fetch/blob/master/_autodocs/architecture.md
for (let i = 0; i <= this.retries; i++) {
  const fetched = fetch(await this.sign(input, init))
  if (i === this.retries) return fetched
  const res = await fetched
  if (res.status < 500 && res.status !== 429) return res   // 404 devuelve aquí, sin reintentar ni lanzar
  await new Promise(resolve =>
    setTimeout(resolve, Math.random() * this.initRetryMs * Math.pow(2, i))
  )
}
```

### `apps/web/lib/document-storage.ts` (líneas 90-108) — comportamiento actual a igualar en R2

```typescript
// Ya en el repo, sin cambios en las líneas 91-99 (validación de forma de clave)
export async function readPrivateFile(fileKey: string): Promise<Buffer | null> {
  const parts = fileKey.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [subdir, name] = parts as [string, string];
  if (subdir !== "evidence" && subdir !== "templates") return null;
  if (name.includes("..") || name.includes("\\")) return null;
  // ... líneas 97-107: aquí es donde entra la rama R2 (con el prefijo `prol/`
  // añadido justo antes de llamar a r2Get, y quitado — porque nunca se guarda — al construir la clave)
}
```

## State of the Art

| Antes | Ahora (esta fase) | Cuándo cambia | Impacto |
|-------|---------------------|----------------|---------|
| Evidencias/plantillas en disco (`PRIVATE_UPLOAD_DIR` o `./private-uploads`) | Mismo disco como fallback + R2 como backend activo si `R2_BUCKET` existe | Al desplegar esta fase con las 4 variables `R2_*` en el env del contenedor | La app queda con **dos backends de almacenamiento para siempre** (nota explícita de CONTEXT); el interruptor vive en un único punto (`STORAGE_BACKEND` en `document-storage.ts`) y se documenta en la cabecera del archivo. |
| Respaldo del tier confidencial vía `backup.sh` (tarball `private_*.tar.gz` del volumen podman) | El tarball sigue existiendo como "cinturón y tirantes", pero deja de capturar nada nuevo una vez que todo se escribe en R2 | Post-R2, no en esta fase | El respaldo real pasa a ser responsabilidad de R2 (versionado + ciclo de vida) — explícitamente diferido, y explícitamente **sin** tocar el bucket compartido en esta fase (ninguna regla de lifecycle/versionado). |

**Deprecado/en desuso:** ninguno — la rama disco no se elimina, sigue siendo el fallback de rollback (R2-04).

## Open Questions

1. **¿`region: "auto"` se autodetecta o hay que pasarlo explícito?**
   - Qué sabemos: Context7 confirma que `aws4fetch` autodetecta servicio/región analizando el hostname, y menciona explícitamente que "servicios S3-compatibles de terceros como Cloudflare R2 y Backblaze B2" están soportados, mapeando al servicio `s3` — pero la documentación de Context7 no confirma el valor exacto de región que produce esa autodetección para un hostname `<account>.r2.cloudflarestorage.com`.
   - Qué es incierto: si la autodetección ya resuelve `region: "auto"` correctamente sin pasarlo, o si hace falta forzarlo.
   - Recomendación: pasar `service: "s3", region: "auto"` explícitos al construir el `AwsClient` (o en cada llamada vía `aws: {...}`), tal como el propio CONTEXT ya decide ("región auto, servicio s3") — elimina la ambigüedad en vez de confiar en la autodetección. Confianza: MEDIA (la forma de pasar las opciones está verificada vía Context7; el valor recomendado por Cloudflare para R2 no se verificó de forma independiente contra la documentación oficial de Cloudflare en esta pasada, sólo se tomó de la decisión ya cerrada en CONTEXT).

2. **¿`r2Head` gana su lugar en esta fase?**
   - Qué sabemos: CONTEXT ya decide que `lib/r2.ts` exporta `r2Put`, `r2Get`, `r2Head`. El `readPrivateFile` actual en disco hace `stat` + `isFile()` antes de `readFile` — el equivalente natural sería `r2Head` antes de `r2Get`.
   - Qué es incierto: si vale la pena el round-trip extra. Un `r2Get` que reciba 404 ya distingue "no existe" sin necesitar un HEAD previo (a diferencia de disco, donde `stat` es barato y local); `isFile()` en disco existe para descartar directorios, algo que no tiene sentido en un almacén de objetos.
   - Recomendación: mantener `r2Head` en la superficie del módulo (ya que CONTEXT lo nombra explícitamente) pero no necesariamente invocarlo desde `readPrivateFile` — un solo GET es más barato y suficiente para igualar el comportamiento actual.

3. **Fabricación del histórico local para el criterio 2** — delegado explícitamente a discreción de Claude por CONTEXT; no es una brecha de investigación, sólo se anota para que el planificador no lo confunda con algo pendiente de investigar.

## Sources

### Primary (HIGH confidence)
- Context7 `/mhart/aws4fetch` — constructor de `AwsClient`, ejemplos de PUT/GET firmados, loop de reintentos con backoff, detección de servicio/región, manejo de errores (consultado 2026-09-01).
- Lectura directa: `apps/web/lib/document-storage.ts`, `apps/web/lib/cloudflare-stream.ts`, `apps/web/lib/env.ts`, `apps/web/lib/upload-paths.ts`, `apps/web/lib/document-files.ts`, `apps/web/lib/certificate-assets.ts`, `apps/web/app/files/{evidence,company-document,manual-document}/[id]/route.ts`, `apps/web/app/api/upload/{evidence,document-template}/route.ts`, `apps/web/app/uploads/[...path]/route.ts`, `apps/web/lib/auth.ts`, `apps/web/next.config.js`, `docker-compose.prod.yml`, `DEPLOY.md`, `.env.example`, `.npmrc`, `packages/db/prisma/schema.prisma` (comentarios y campos de `fileKey`/`baseFileKey`), `apps/web/lib/actions/evidence.ts`, `apps/web/lib/actions/manual.ts` — todo el 2026-09-01.

### Secondary (MEDIUM confidence)
- `npm view aws4fetch dependencies version dist.unpackedSize` — confirma versión `1.0.20`, ausencia de campo `dependencies` (cero deps), tamaño empaquetado sin comprimir 65541 bytes (el tamaño minificado/gzip de 6.4/2.5 KB proviene de la descripción de Context7, no de una medición propia).

### Tertiary (LOW confidence)
- Ninguna: todas las afirmaciones críticas quedaron verificadas contra código o Context7; donde no fue posible (región `auto` para R2), se marcó explícitamente como MEDIA confianza en Open Questions en vez de presentarse como hecho.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `aws4fetch` verificado vía Context7 y `npm view` directamente, no sólo por training data.
- Architecture (transcripción de `document-storage.ts`, `cloudflare-stream.ts`, `env.ts`, call sites, frontera del prefijo): HIGH — todo leído línea por línea del código real, con grep exhaustivo para confirmar ausencia de otros usos.
- Pitfalls: HIGH en los que derivan de código leído (runtime, call sites, desfase DEPLOY.md/compose); MEDIUM en el pitfall de región `auto` de R2 (ver Open Questions), porque depende de un detalle de la API de `aws4fetch` no confirmado al 100% para el hostname específico de R2.

**Research date:** 2026-09-01
**Valid until:** 30 días (stack estable; `aws4fetch` es una librería pequeña y madura, sin cambios de API esperados a corto plazo)
