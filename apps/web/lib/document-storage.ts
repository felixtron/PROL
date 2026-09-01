// Acceso a disco de los archivos del módulo de Gestión Documental:
// evidencias de cumplimiento y plantillas documentales.
//
// Sólo servidor — importa `node:fs`. El contrato compartido con los
// formularios de subida (formatos y límites) vive en `lib/document-files.ts`,
// que es puro para poder importarse también desde el cliente.
//
// Todo va al disco privado (`uploads/private/…`), que `/uploads/[...path]`
// rechaza. Lo que se guarda en la base es la `fileKey` —la ruta relativa
// dentro de ese disco—, nunca una URL pública: así el único camino hacia el
// archivo pasa por las rutas de `/files/*`, que autorizan contra la base
// antes de leer nada del disco.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import crypto from "node:crypto";
import { resolvePrivateUploadDir } from "@/lib/upload-paths";
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
 * Valida y guarda un archivo en el disco privado.
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

  const storedName = `${crypto.randomUUID()}.${ext}`;
  const targetDir = resolvePrivateUploadDir(subdir);
  await mkdir(targetDir, { recursive: true });
  await writeFile(
    join(targetDir, storedName),
    Buffer.from(await file.arrayBuffer()),
  );

  return {
    ok: true,
    file: {
      fileKey: `${subdir}/${storedName}`,
      fileName: safeFilename(file.name),
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Lee un archivo del disco privado a partir de su `fileKey`.
 *
 * La clave sale de la base, no de la URL, pero se valida igual: si un día una
 * fila quedara con basura dentro, esto no debe convertirse en una lectura
 * arbitraria del sistema de archivos.
 */
export async function readPrivateFile(fileKey: string): Promise<Buffer | null> {
  const parts = fileKey.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [subdir, name] = parts as [string, string];
  if (subdir !== "evidence" && subdir !== "templates") return null;
  if (name.includes("..") || name.includes("\\")) return null;

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
