// La aplicación tiene DOS backends de almacenamiento y los va a tener para
// siempre: Cloudflare R2 cuando las cuatro credenciales están completas, y el
// disco privado cuando no. El interruptor vive aquí y en ningún otro sitio.
//
// Acceso a los archivos del módulo de Gestión Documental: evidencias de
// cumplimiento y plantillas documentales.
//
// Sólo servidor — importa `node:fs`. El contrato compartido con los
// formularios de subida (formatos y límites) vive en `lib/document-files.ts`,
// que es puro para poder importarse también desde el cliente.
//
// Lo que se guarda en la base es la `fileKey` —una clave opaca
// `<subdir>/<uuid>.<ext>`—, nunca una URL pública: así el único camino hacia
// el archivo pasa por las rutas de `/files/*`, que autorizan contra la base
// antes de leer nada del backend que corresponda.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import crypto from "node:crypto";
import { resolvePrivateUploadDir } from "@/lib/upload-paths";
import { isR2Configured, missingR2Env, r2Get, r2Put } from "@/lib/r2";
import {
  MAX_FILE_SIZE,
  safeFilename,
  type PrivateSubdir,
  type StoredFile,
} from "@/lib/document-files";

export interface StoreResult {
  ok: true;
  file: StoredFile;
}
export interface StoreError {
  ok: false;
  error: string;
  status: number;
}

/**
 * Backend activo, decidido una sola vez por proceso al primer import.
 *
 * Interruptor único de toda la aplicación. Exige las CUATRO variables: con menos,
 * vale `"disk"`. Quitar `R2_BUCKET` del entorno y reiniciar devuelve la app al
 * disco sin desplegar código — ése es el rollback de R2-04, y la razón de que la
 * rama de disco no se borre nunca.
 */
const STORAGE_BACKEND: "r2" | "disk" = isR2Configured() ? "r2" : "disk";

/**
 * Configuración a medias: `R2_BUCKET` puesta y alguna de las otras tres ausente.
 * Vacío en los dos estados sanos (ninguna variable R2, o las cuatro).
 *
 * `lib/env.ts` ya lo avisó al arrancar, pero **sólo avisó**: la aplicación levanta
 * con normalidad a propósito, porque una errata en una variable del módulo
 * documental no puede dejar sin servicio a cursos, evaluaciones y certificados.
 * Quien lo hace cumplir es la ruta de escritura de aquí abajo. En este estado
 * `STORAGE_BACKEND` vale `"disk"`, y escribir una evidencia en el disco efímero
 * del contenedor creyendo que va al bucket es exactamente el agujero que la fase 1
 * cerró: entre tumbar la plataforma y esparcir evidencias, no hacer ninguna de las
 * dos y rechazar la subida.
 *
 * Se lee una sola vez al cargar el módulo, igual que `STORAGE_BACKEND`: los dos
 * describen el mismo entorno de proceso y no pueden discrepar a media vida.
 */
const R2_PARTIAL_ENV: string[] = process.env.R2_BUCKET ? missingR2Env() : [];

/**
 * El bucket de R2 está COMPARTIDO con otro producto en producción, que guarda lo
 * suyo bajo `empresas/` y `leads/`. Todo lo que escriba o lea PROL cuelga de
 * `prol/`, y el token tiene permiso sobre todo el bucket: por eso en esta fase no
 * existe ninguna operación de borrado, ni regla de ciclo de vida, ni versionado.
 *
 * Este prefijo NO entra nunca en `fileKey`. La base sigue guardando la clave
 * opaca `<subdir>/<uuid>.<ext>`. Si se filtrara: (1) las filas que ya existen
 * dejarían de resolver, (2) el rollback a disco se rompería, porque las rutas de
 * disco no llevan `prol/`, y (3) la base dejaría de ser agnóstica al backend, que
 * es la propiedad que hace barato tener dos.
 */
const R2_KEY_PREFIX = "prol/";

/**
 * Traduce una `fileKey` de la base a la clave real dentro del bucket compartido.
 *
 * Es una guarda de runtime, no una prueba automatizada, y es deliberado: el repo
 * no tiene test runner y añadirlo está declarado fuera de alcance. A cambio, esto
 * corre en cada lectura y cada escritura reales, que es más cobertura de la que
 * daría un test unitario. Si alguna vez llega una `fileKey` con el prefijo ya
 * puesto —el modo de fallo que más miedo da—, `parts.length` valdría 3 y esto
 * lanza en vez de escribir en `prol/prol/...`.
 */
function sharedBucketKey(fileKey: string): string {
  const parts = fileKey.split("/");
  const [subdir, name] = parts;
  if (
    parts.length !== 2 ||
    (subdir !== "evidence" && subdir !== "templates") ||
    !name ||
    fileKey.includes("..")
  ) {
    throw new Error(`Clave de archivo inválida para R2: ${fileKey}`);
  }
  const key = `${R2_KEY_PREFIX}${fileKey}`;
  if (!key.startsWith(R2_KEY_PREFIX)) {
    throw new Error(`Clave fuera del prefijo ${R2_KEY_PREFIX}: ${key}`);
  }
  return key;
}

/**
 * Valida y guarda un archivo en el backend activo (R2 o disco privado).
 *
 * Devuelve un resultado en vez de lanzar porque cada mensaje de error va tal
 * cual al usuario que está subiendo, y quien llama necesita el código HTTP.
 */
export async function storePrivateFile(
  file: File,
  subdir: PrivateSubdir,
  allowed: Record<string, string>,
): Promise<StoreResult | StoreError> {
  const ext = allowed[file.type];
  if (!ext) {
    return {
      ok: false,
      status: 400,
      error:
        subdir === "evidence"
          ? "Tipo de archivo no permitido. Acepta PDF, Office, imágenes, audio y video."
          : "Tipo de archivo no permitido. Acepta PDF, Word, Excel, PowerPoint y texto.",
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, status: 400, error: "El archivo supera los 25MB" };
  }
  if (file.size < 10) {
    return { ok: false, status: 400, error: "Archivo vacío" };
  }

  // Configuración a medias: no se escribe NADA, ni a R2 ni al disco. Es la otra
  // mitad de la enmienda del CONTEXT del 2026-09-01 —la app arranca, pero no
  // esparce evidencias por almacenamiento efímero— y va aquí, después de las
  // validaciones de siempre, para no alterar el orden de sus mensajes.
  if (R2_PARTIAL_ENV.length > 0) {
    console.error(
      `[storage] Subida rechazada por configuración de R2 incompleta: faltan ${R2_PARTIAL_ENV.join(", ")}`,
    );
    // El detalle (qué variables faltan) va al log, donde lo lee quien puede
    // arreglarlo. A quien sube el archivo no le sirve de nada saber nombres de
    // variables de entorno, así que el mensaje visible se queda en el qué y el
    // qué hacer. Deliberado: no lo "mejores" volviendo a nombrarlas aquí.
    return {
      ok: false,
      status: 503,
      error:
        "El almacenamiento de evidencias no está configurado correctamente. El archivo no se ha guardado; avisa a un administrador.",
    };
  }

  const storedName = `${crypto.randomUUID()}.${ext}`;
  const fileKey = `${subdir}/${storedName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (STORAGE_BACKEND === "r2") {
    // Fuera del try: si esto lanza es un bug de forma de clave, no un fallo de
    // red, y no debe disfrazarse de "vuelve a intentarlo".
    const key = sharedBucketKey(fileKey);
    try {
      await r2Put(key, bytes, file.type);
    } catch (err) {
      console.error("[r2] PUT falló al guardar un archivo privado:", err);
      return {
        ok: false,
        status: 502,
        error: "No se pudo guardar el archivo. Vuelve a intentarlo.",
      };
    }
  } else {
    const targetDir = resolvePrivateUploadDir(subdir);
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, storedName), bytes);
  }

  return {
    ok: true,
    file: {
      fileKey,
      fileName: safeFilename(file.name),
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Lee un archivo del backend activo a partir de su `fileKey`.
 *
 * La clave sale de la base, no de la URL, pero se valida igual: si un día una
 * fila quedara con basura dentro, esto no debe convertirse en una lectura
 * arbitraria del sistema de archivos ni en una clave de objeto inválida.
 */
export async function readPrivateFile(fileKey: string): Promise<Buffer | null> {
  const parts = fileKey.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [subdir, name] = parts as [string, string];
  if (subdir !== "evidence" && subdir !== "templates") return null;
  if (name.includes("..") || name.includes("\\")) return null;

  if (STORAGE_BACKEND === "r2") {
    // `sharedBucketKey` no puede lanzar aquí: las comprobaciones de arriba ya
    // garantizaron la forma. El try/catch conserva el contrato "esta función
    // devuelve null, nunca lanza", del que dependen las tres rutas /files/*.
    try {
      return await r2Get(sharedBucketKey(fileKey));
    } catch (err) {
      console.error("[r2] GET falló al leer un archivo privado:", err);
      return null;
    }
  }

  const dir = resolvePrivateUploadDir(subdir);
  const fullPath = normalize(join(dir, name));
  if (!fullPath.startsWith(normalize(dir))) return null;

  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return null;
    return await readFile(fullPath);
  } catch {
    return null;
  }
}

/**
 * Respuesta de descarga de un archivo privado.
 *
 * `no-store` y `private` son deliberados: un expediente de cumplimiento no
 * debe quedarse en la caché de un proxy compartido ni sobrevivir al cierre de
 * sesión en el disco del navegador.
 */
export function privateFileResponse(
  buffer: Buffer,
  file: { fileName: string; mimeType: string },
): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFilename(file.fileName)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
