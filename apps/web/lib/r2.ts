// Cliente de Cloudflare R2 (S3-compatible) para el tier confidencial.
//
// Genérico a propósito: sabe de R2 y de nada más. Qué prefijo lleva el bucket,
// qué claves son válidas y cuándo se usa R2 en vez del disco son política de
// PROL y viven en `lib/document-storage.ts` — igual que `cloudflare-stream.ts`
// sabe de la API de Cloudflare y no del dominio.
//
// Sólo servidor. Se firma SigV4 con `aws4fetch` (~6 KB, cero dependencias) en
// vez de `@aws-sdk/client-s3` (~2 MB en ~40 paquetes): `.npmrc` documenta los
// timeouts del VPS contra el registry, y esto son dos operaciones, no un SDK.

import { AwsClient } from "aws4fetch";

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

/** Cuáles de las cuatro variables faltan. Vacío = configuración completa. */
export function missingR2Env(): string[] {
  return R2_ENV_KEYS.filter((key) => !process.env[key]);
}

/**
 * Las cuatro presentes. Es lo único que decide si el backend de almacenamiento
 * es R2 o disco (`STORAGE_BACKEND` en `lib/document-storage.ts`).
 */
export function isR2Configured(): boolean {
  return missingR2Env().length === 0;
}

/** Lanza en español si falta cualquiera de las cuatro. */
export function assertR2Env(): void {
  getCredentials();
}

function getCredentials() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      `Credenciales de R2 no configuradas: faltan ${missingR2Env().join(", ")}`,
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let cached: { accessKeyId: string; client: AwsClient } | null = null;

function getClient(accessKeyId: string, secretAccessKey: string): AwsClient {
  if (cached && cached.accessKeyId === accessKeyId) return cached.client;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    // Explícitos a propósito: no dependemos de la autodetección por hostname
    // para `<account>.r2.cloudflarestorage.com`. R2 no tiene regiones y su
    // endpoint S3 espera "auto".
    service: "s3",
    region: "auto",
    // Por defecto reintenta muchas más veces. Estas llamadas ocurren dentro de
    // una petición HTTP de un usuario: preferimos fallar en segundos a dejar
    // una subida colgada minutos.
    retries: 3,
    initRetryMs: 50,
  });
  cached = { accessKeyId, client };
  return client;
}

function objectUrl(accountId: string, bucket: string, key: string): string {
  // Path-style sobre el endpoint de cuenta. Las barras de `key` van literales:
  // son separadores de la clave del objeto, no caracteres a codificar.
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

function log(
  level: "warn" | "error",
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const record = {
    ts: new Date().toISOString(),
    level,
    component: "r2",
    msg,
    ...fields,
  };
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "warn"](JSON.stringify(record));
  } else {
    console[level === "error" ? "error" : "warn"](
      `[${level}] [r2] ${msg}`,
      fields,
    );
  }
}

/** Escribe un objeto. Lanza si R2 responde algo que no sea 2xx. */
export async function r2Put(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { accountId, accessKeyId, secretAccessKey, bucket } =
    getCredentials();
  const res = await getClient(accessKeyId, secretAccessKey).fetch(
    objectUrl(accountId, bucket, key),
    {
      method: "PUT",
      headers: { "Content-Type": contentType || "application/octet-stream" },
      body: new Uint8Array(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Lee un objeto. Devuelve `null` si no existe.
 *
 * `aws4fetch` NO lanza por códigos de estado: un 403 por token sin permiso y un
 * 500 por R2 caído llegan aquí igual que un 404. Devolvemos `null` en los tres
 * casos para conservar el contrato de `readPrivateFile`, pero los que no son 404
 * se loguean: sin ese rastro, una credencial rota se ve exactamente igual que
 * "el archivo no existe", y el síntoma sería "todas las evidencias devuelven
 * 404 a la vez".
 */
export async function r2Get(key: string): Promise<Buffer | null> {
  const { accountId, accessKeyId, secretAccessKey, bucket } =
    getCredentials();
  const res = await getClient(accessKeyId, secretAccessKey).fetch(
    objectUrl(accountId, bucket, key),
    { method: "GET" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    log("error", "GET fallido", { status: res.status, key });
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Metadatos de un objeto sin descargarlo.
 *
 * NO SE USA EN ESTA FASE, y es deliberado. `readPrivateFile` necesita los bytes
 * de todas formas, así que un HEAD antes de cada GET sería un viaje de red de
 * más: un GET que recibe 404 ya distingue "no existe" sin ayuda (en disco `stat`
 * es barato y local, aquí no). Existe porque la fase 6 —subida directa por URL
 * firmada— tiene que comprobar el tamaño real de lo que subió el navegador
 * antes de confirmar la evidencia, y ese es su único consumidor previsto.
 *
 * No borrar por "código muerto".
 */
export async function r2Head(
  key: string,
): Promise<{ size: number; contentType: string | null } | null> {
  const { accountId, accessKeyId, secretAccessKey, bucket } =
    getCredentials();
  const res = await getClient(accessKeyId, secretAccessKey).fetch(
    objectUrl(accountId, bucket, key),
    { method: "HEAD" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    log("error", "HEAD fallido", { status: res.status, key });
    return null;
  }
  const length = res.headers.get("content-length");
  return {
    size: length ? Number(length) : 0,
    contentType: res.headers.get("content-type"),
  };
}
