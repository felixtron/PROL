/**
 * Validación del enlace a la carpeta de Google Drive de un proyecto.
 *
 * Un administrador pega esta URL y un cliente la sigue después: sin una lista
 * cerrada de hosts, el campo es un redirector abierto. **La lista cerrada es la
 * propiedad de seguridad**, igual que en `sanitize-manual-html.ts`; una regex
 * sobre el path no lo sería, porque las formas de URL de Drive cambian
 * (`/drive/folders/`, `/drive/u/2/folders/`, `/open?id=`) y el host no.
 *
 * Precedente que NO hay que copiar: `AdvisorySession.meetingUrl` se escribe y se
 * renderiza sin validar nada (`lib/actions/advisory.ts`). Está fuera del alcance
 * de esta fase arreglarlo, pero este módulo existe para no repetirlo.
 */
const ALLOWED_DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

/** Mensaje único de DRV-03: dice qué se esperaba, no sólo que falló. */
export const DRIVE_URL_ERROR =
  "El enlace debe ser de Google Drive (https://drive.google.com/… o https://docs.google.com/…)";

export function isValidDriveUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  // `URL` normaliza el host a punycode y minúsculas; el `toLowerCase` es
  // redundante a propósito, para que la comparación no dependa de esa garantía.
  return (
    url.protocol === "https:" &&
    ALLOWED_DRIVE_HOSTS.has(url.hostname.toLowerCase())
  );
}

/**
 * El enlace, sólo si sigue siendo confiable. Se usa en **cada lectura** que vaya a
 * exponerlo, no sólo al guardarlo: una fila puede ser anterior a la validación de
 * escritura, o haberse editado a mano en la base. Cuando devuelve `null`, la
 * pantalla debe decir "sin enlace configurado" — nunca pintar un `<a href>`.
 */
export function safeDriveUrl(value: string | null | undefined): string | null {
  return isValidDriveUrl(value) ? (value as string).trim() : null;
}
