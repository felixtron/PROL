"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setProjectDriveUrl } from "@/lib/actions/manual";
import { DriveFolderLink } from "@/components/drive-folder-link";

/**
 * Bloque de la carpeta de Drive del proyecto.
 *
 * Tres estados de lectura, y sólo uno pinta un `<a href>`: con enlace confiable
 * (ya pasado por `safeDriveUrl` en el servidor), sin enlace, o con un enlace que
 * había algo guardado pero ya no es confiable (`invalid`) — ese último caso NUNCA
 * produce un `<a>`, es la mitad de lectura de DRV-03.
 *
 * El formulario de edición sólo aparece si `canEdit` (resuelto en el servidor con
 * `isManualAdmin`), para que PROFESSOR pueda ver este bloque sin poder escribirlo.
 */
export function ProjectDriveLink({
  assignmentId,
  driveUrl,
  invalid,
  canEdit,
}: {
  assignmentId: string;
  /** Ya revalidado por el servidor: si llega no-null, es confiable. */
  driveUrl: string | null;
  /** Había algo guardado en la fila y no es confiable. */
  invalid: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextValue: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setProjectDriveUrl({
          assignmentId,
          driveUrl: nextValue,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setValue("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="space-y-3">
      <DriveFolderLink
        driveUrl={driveUrl}
        invalid={invalid}
        emptyHint={
          canEdit
            ? "Pega el enlace de la carpeta compartida con el cliente."
            : "Pídele a un administrador que la configure."
        }
      />

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={value}
            disabled={isPending}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            className="min-w-64 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            disabled={isPending || value.trim() === ""}
            onClick={() => save(value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Guardar
          </button>
          {driveUrl || invalid ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(null)}
              className="text-sm text-rose-600 hover:text-rose-700 disabled:opacity-60"
            >
              Quitar el enlace
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
