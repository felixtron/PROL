import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveUploadDir } from "@/lib/upload-paths";

/**
 * Carga una URL /uploads/... del volumen local y la devuelve como data:
 * URL, que es lo que <Image> de @react-pdf/renderer consume de forma
 * fiable. Devuelve null ante cualquier fallo para que la plantilla caiga
 * a su placeholder en vez de romper la emisión del diploma.
 */
export async function loadUploadAsDataUrl(
  url: string | null | undefined
): Promise<string | null> {
  if (!url || !url.startsWith("/uploads/")) return null;
  // Forma esperada: /uploads/<subdir>/<file.ext>
  const parts = url.replace(/^\/uploads\//, "").split("/");
  if (parts.length < 2) return null;
  const [subdir, ...rest] = parts;
  const filename = rest.join("/");
  if (!subdir || !filename || filename.includes("..")) return null;
  const dir = resolveUploadDir(subdir);
  const filePath = join(dir, filename);
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    null;
  if (!mime) return null;
  try {
    const buf = await readFile(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Carga un asset bundled de apps/web/public/cert-assets/ como data URL.
 * Resuelve con process.cwd() para funcionar igual en `next dev` y en
 * builds standalone de Next.
 */
export async function loadBundledCertAsset(
  filename: string,
  mime: string
): Promise<string | null> {
  try {
    const filePath = join(process.cwd(), "public", "cert-assets", filename);
    const buf = await readFile(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
