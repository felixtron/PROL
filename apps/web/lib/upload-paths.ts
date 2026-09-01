import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolve the absolute upload directory for a given subdir
 * (e.g. "thumbnails", "pdfs", "assignments").
 *
 * In production the standalone Next.js server runs from
 * /app/apps/web, where the public dir lives at ./public/uploads. In
 * dev (`pnpm dev`) cwd may be the repo root or apps/web depending on
 * how it was started, so we try a couple of candidates and use the
 * first one that exists. UPLOAD_DIR overrides everything.
 */
export function resolveUploadDir(subdir: string): string {
  if (process.env.UPLOAD_DIR) {
    return join(process.env.UPLOAD_DIR, subdir);
  }
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "public", "uploads", subdir),                 // standalone runtime
    join(cwd, "apps", "web", "public", "uploads", subdir),  // monorepo root in dev
  ];
  for (const c of candidates) {
    // Use the parent dir as the existence probe — the leaf might not exist
    // yet for a fresh deploy. Pick the first whose parent is reachable.
    const parent = c.replace(`/${subdir}`, "");
    if (existsSync(parent)) return c;
  }
  // Last resort: use the standalone path. mkdir -p will create it.
  return candidates[0]!;
}

/**
 * Segmento reservado a archivos confidenciales. `app/uploads/[...path]` lo
 * rechaza explícitamente, por si alguna configuración acabara dejándolos bajo
 * el directorio público.
 */
export const PRIVATE_SUBDIR = "private";

let warnedAboutPrivateDir = false;

/**
 * Directorio de los archivos confidenciales: evidencias de cumplimiento y
 * plantillas documentales de cada empresa.
 *
 * Estos archivos NO pueden vivir bajo `public/`. El resto de uploads sí lo
 * hace, y está bien —una portada de curso es pública—, pero `public/` lo sirve
 * el propio Next sin pasar por ninguna comprobación de sesión, y el expediente
 * de cumplimiento de un cliente no puede depender de que ese servidor estático
 * no encuentre el archivo. Sólo debe salir por las rutas de `/files/*`, que
 * comprueban la empresa contra la base antes de devolver un byte.
 *
 * Orden de resolución:
 *   1. `PRIVATE_UPLOAD_DIR` — lo que debe configurar producción, apuntando a
 *      un volumen persistente FUERA de `public/`.
 *   2. `<cwd>/private-uploads` — sirve en desarrollo y, si producción se
 *      desplegara sin configurarlo, deja los archivos en un sitio no público.
 *      Perderlos al recrear el contenedor es un fallo visible y recuperable
 *      (se vuelven a subir); una fuga silenciosa no lo sería.
 */
export function resolvePrivateUploadDir(subdir: string): string {
  const base = process.env.PRIVATE_UPLOAD_DIR;
  if (base) return join(base, subdir);

  if (process.env.NODE_ENV === "production" && !warnedAboutPrivateDir) {
    warnedAboutPrivateDir = true;
    console.warn(
      JSON.stringify({
        level: "warn",
        component: "uploads",
        msg: "PRIVATE_UPLOAD_DIR no está configurada: las evidencias van a un directorio no persistente",
      }),
    );
  }
  return join(process.cwd(), "private-uploads", subdir);
}
