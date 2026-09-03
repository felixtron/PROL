import { AlertTriangle, FolderOpen } from "lucide-react";

/**
 * Bloque de sólo lectura de la carpeta de Drive del proyecto, compartido por
 * las tres pantallas que necesitan mostrarla (panel de gestión, proyecto del
 * cliente, ficha de revisión de evidencia).
 *
 * Tres estados, y sólo el primero produce un `<a href>`:
 *   - enlace confiable (ya pasado por `safeDriveUrl` en el servidor)
 *   - sin enlace (`driveUrl === null && !invalid`)
 *   - enlace no confiable (`invalid`): había algo guardado y no es de Drive —
 *     esto NUNCA produce un `<a>`, es la mitad de lectura de DRV-03.
 *
 * No es `"use client"`: no tiene estado propio y los componentes cliente
 * pueden importarlo igual que uno del servidor.
 */
export function DriveFolderLink({
  driveUrl,
  invalid = false,
  emptyHint,
  size = "default",
}: {
  /** Ya revalidado por el servidor: si llega no-null, es confiable. */
  driveUrl: string | null;
  /** Había algo guardado en la fila y no es confiable. */
  invalid?: boolean;
  /** Qué decirle a este usuario concreto cuando no hay enlace. */
  emptyHint?: string;
  size?: "default" | "compact";
}) {
  const compact = size === "compact";

  if (driveUrl) {
    return (
      <div className="space-y-1">
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-lg bg-primary-600 font-medium text-white transition-colors hover:bg-primary-700 ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          <FolderOpen className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Abrir la carpeta de Drive
        </a>
        <p className="text-xs text-text-tertiary">
          Se abre en una pestaña nueva, en Google Drive.
        </p>
      </div>
    );
  }

  if (invalid) {
    return (
      <p
        className={`flex items-start gap-2 rounded-lg bg-amber-50 text-amber-800 ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        El enlace guardado no es de Google Drive, así que no se abre desde aquí.
      </p>
    );
  }

  return (
    <p className={`text-text-secondary ${compact ? "text-xs" : "text-sm"}`}>
      Este proyecto todavía no tiene carpeta de Drive.
      {emptyHint ? ` ${emptyHint}` : ""}
    </p>
  );
}
