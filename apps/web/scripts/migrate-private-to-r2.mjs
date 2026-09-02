// Copia el contenido del disco privado (evidencias y plantillas confidenciales)
// a Cloudflare R2, bajo el prefijo `prol/`.
//
// NO BORRA NADA, ni del disco ni del bucket, y NO TOCA LA BASE DE DATOS. Es una
// copia de bytes: las `fileKey` que guarda la base de datos —`<subdir>/<uuid>.<ext>`—
// son válidas en los dos backends sin modificarse, y ésa es justamente la
// propiedad que hace reversible el cambio.
//
// El bucket está COMPARTIDO con otro producto en producción (prefijos
// `empresas/` y `leads/`). Por eso aquí no hay ninguna operación destructiva.
//
// Idempotente: si el objeto ya existe con el mismo tamaño, lo salta.
//
//   node --env-file=.env apps/web/scripts/migrate-private-to-r2.mjs [--dry-run]
//
// Variables: las cuatro R2_*, y PRIVATE_UPLOAD_DIR (si no está, usa
// <cwd>/private-uploads, igual que resolvePrivateUploadDir).
//
// El prefijo `prol/` y la forma de las claves duplican deliberadamente lo que
// ya define `apps/web/lib/document-storage.ts` (fuente de verdad): un `.mjs`
// suelto no puede importar ese `.ts`.

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";

const R2_KEY_PREFIX = "prol/";
const SUBDIRS = ["evidence", "templates"];

const CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

function contentTypeFor(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function checkEnv() {
  const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `Faltan credenciales de R2: ${missing.join(", ")}. No se puede migrar sin las cuatro variables.`,
    );
    process.exit(1);
  }
}

function objectUrl(accountId, bucket, key) {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

async function main() {
  checkEnv();

  const dryRun = process.argv.includes("--dry-run");
  const baseDir = process.env.PRIVATE_UPLOAD_DIR ?? join(process.cwd(), "private-uploads");
  console.log(`Directorio local de origen: ${baseDir}${dryRun ? " (--dry-run: sin escritura)" : ""}`);

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const totals = {};
  let anyFailure = false;

  for (const subdir of SUBDIRS) {
    const dir = join(baseDir, subdir);
    totals[subdir] = { copiados: 0, saltados: 0, fallidos: 0 };

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      console.log(`[${subdir}] sin archivos (el directorio no existe: ${dir})`);
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;

      const fileKey = `${subdir}/${name}`;
      if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
        console.error(`[${subdir}] nombre de archivo inválido, se omite: ${name}`);
        totals[subdir].fallidos += 1;
        anyFailure = true;
        continue;
      }

      const key = R2_KEY_PREFIX + fileKey;
      if (!key.startsWith(R2_KEY_PREFIX)) {
        throw new Error(`Clave fuera del prefijo ${R2_KEY_PREFIX}: ${key}`);
      }

      const localPath = join(dir, name);
      const localSize = (await stat(localPath)).size;

      const headRes = await client.fetch(objectUrl(accountId, bucket, key), { method: "HEAD" });
      if (headRes.ok) {
        const remoteSize = Number(headRes.headers.get("content-length") ?? -1);
        if (remoteSize === localSize) {
          console.log(`[${subdir}] saltado (ya existe, mismo tamaño): ${key}`);
          totals[subdir].saltados += 1;
          continue;
        }
      }

      if (dryRun) {
        console.log(`[${subdir}] (dry-run) copiaría: ${localPath} -> ${key} (${localSize} bytes)`);
        continue;
      }

      const body = await readFile(localPath);
      const putRes = await client.fetch(objectUrl(accountId, bucket, key), {
        method: "PUT",
        headers: { "Content-Type": contentTypeFor(name) },
        body: new Uint8Array(body),
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        console.error(`[${subdir}] fallo al subir ${key}: ${putRes.status} ${text.slice(0, 200)}`);
        totals[subdir].fallidos += 1;
        anyFailure = true;
        continue;
      }

      const verifyRes = await client.fetch(objectUrl(accountId, bucket, key), { method: "HEAD" });
      const verifySize = Number(verifyRes.headers.get("content-length") ?? -1);
      if (!verifyRes.ok || verifySize !== localSize) {
        console.error(
          `[${subdir}] verificación posterior al PUT falló para ${key}: status=${verifyRes.status} tamaño=${verifySize} esperado=${localSize}`,
        );
        totals[subdir].fallidos += 1;
        anyFailure = true;
        continue;
      }

      console.log(`[${subdir}] copiado: ${key} (${localSize} bytes)`);
      totals[subdir].copiados += 1;
    }
  }

  console.log("\nResumen:");
  for (const subdir of SUBDIRS) {
    const t = totals[subdir] ?? { copiados: 0, saltados: 0, fallidos: 0 };
    console.log(`  ${subdir}: copiados=${t.copiados} saltados=${t.saltados} fallidos=${t.fallidos}`);
  }

  if (anyFailure) {
    console.error("\nHubo fallos durante la migración. Revisa el detalle arriba.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error inesperado en la migración:", err);
  process.exit(1);
});
