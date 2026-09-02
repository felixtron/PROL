"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Eye, Loader2, Save, Upload } from "lucide-react";
import {
  publishCompanyDocument,
  saveCompanyDocumentDraft,
  updateManualDocumentBody,
} from "@/lib/actions/manual-document";
import { ManualContent } from "@/components/manual-content";

/**
 * A qué guarda el editor: la plantilla del manual, o el borrador de una
 * empresa. La prop discriminada evita pasar server actions por props — los
 * dos imports de arriba son estáticos y el `switch` de `handleSave` decide
 * cuál llamar.
 */
type EditorTarget =
  | { kind: "template"; documentId: string }
  | {
      kind: "company";
      companyDocumentId: string;
      /** Para el mensaje de guardado ("sigue siendo la versión N") y para el
       * texto exacto del `confirm()` al publicar. */
      version: number;
      /** Descripción del cambio que ya tuviera guardada esta fila, o vacío si
       * nunca se rellenó. Sólo precarga el campo — no hay valor por defecto
       * de negocio aquí. */
      initialNotes?: string;
    };

interface ImportResult {
  html: string;
  droppedImages: number;
  warnings: string[];
  source: string;
}

/**
 * Texto de ayuda base, compartido entre la plantilla y el borrador de
 * empresa. La página de la plantilla le añade la lista honesta de la
 * importación; la página del borrador de empresa lo usa tal cual, porque ahí
 * no hay importador.
 */
export const DOCUMENT_BODY_HELP_TEXT =
  "Se admiten títulos, párrafos, listas, tablas, imágenes y enlaces. Los estilos incrustados y los scripts se descartan al guardar: el diseño lo pone la plataforma.";

/**
 * Editor del cuerpo HTML de un documento nativo. Un solo componente para dos
 * destinos —la plantilla del manual (`target.kind === "template"`) y el
 * borrador de una empresa (`target.kind === "company"`)—, calcado de la
 * maqueta de `section-content-editor.tsx`: textarea mono + toggle de vista
 * previa con el mismo help text debajo.
 *
 * La vista previa es aproximada: `ManualContent` pinta el HTML SIN sanear que
 * hay en el textarea — el saneado real ocurre en el servidor al guardar. Esto
 * no es una excepción al invariante del sanitizador: lo que llega aquí sale
 * del propio textarea de un administrador ya autenticado, nunca de la base ni
 * de un tercero. Es el mismo comportamiento que tiene
 * `section-content-editor.tsx` desde su origen; no se cambia aquí.
 */
export function DocumentBodyEditor({
  target,
  initialHtml,
  canImport,
  helpText,
}: {
  target: EditorTarget;
  initialHtml: string;
  /** El importador sólo tiene sentido sobre la plantilla. */
  canImport: boolean;
  helpText: React.ReactNode;
}) {
  const router = useRouter();
  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [notes, setNotes] = useState(
    target.kind === "company" ? (target.initialNotes ?? "") : "",
  );
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        switch (target.kind) {
          case "template": {
            const result = await updateManualDocumentBody({
              documentId: target.documentId,
              contentHtml,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            setMessage(
              result.changed
                ? `Guardado. La plantilla pasa a la versión ${result.templateVersion}.`
                : "Sin cambios: el contenido es el mismo que ya estaba guardado.",
            );
            break;
          }
          case "company": {
            const result = await saveCompanyDocumentDraft({
              companyDocumentId: target.companyDocumentId,
              contentHtml,
              notes: notes.trim() || undefined,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            setMessage(
              `Borrador guardado. Sigue siendo la versión ${target.version} hasta que lo publiques.`,
            );
            break;
          }
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function handlePublish() {
    if (target.kind !== "company") return;
    const previousVersion = target.version - 1;
    const proceed = window.confirm(
      previousVersion > 0
        ? `La versión ${target.version} pasa a vigente y la ${previousVersion} queda obsoleta. El cliente verá la nueva. ¿Continuar?`
        : `La versión ${target.version} pasa a vigente. El cliente verá la nueva. ¿Continuar?`,
    );
    if (!proceed) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await publishCompanyDocument({
          companyDocumentId: target.companyDocumentId,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo publicar");
      }
    });
  }

  async function handleImport(file: File) {
    // Importar reemplaza: perder media hora de redacción por un clic no es
    // aceptable, así que se confirma antes de tocar nada si ya había texto.
    if (contentHtml.trim()) {
      const proceed = window.confirm(
        "Importar reemplaza el contenido actual del editor. ¿Continuar?",
      );
      if (!proceed) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    setError(null);
    setImportNotice(null);
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload/document-body", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo importar el archivo");
        return;
      }
      const result = data as ImportResult;
      // Se vuelca sin guardar y se cambia a vista previa: que el consultor
      // vea qué llegó antes de comprometerlo es la diferencia entre importar
      // y sufrir una importación.
      setContentHtml(result.html);
      setPreview(true);
      setMessage(null);
      if (result.droppedImages > 0) {
        setImportNotice(
          `Se descartaron ${result.droppedImages} ${
            result.droppedImages === 1 ? "imagen" : "imágenes"
          }: el cuerpo del procedimiento no las incorpora todavía.`,
        );
      }
    } catch {
      setError("No se pudo importar el archivo");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-medium text-text-secondary">
            Contenido (HTML)
          </label>
          <div className="flex items-center gap-3">
            {canImport ? (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
                {importing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Importar .docx
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImport(file);
                  }}
                />
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <Eye className="h-3.5 w-3.5" />
              {preview ? "Editar" : "Vista previa"}
            </button>
          </div>
        </div>

        {preview ? (
          <div className="min-h-[320px] rounded-lg border border-border bg-surface p-5">
            <ManualContent html={contentHtml} />
          </div>
        ) : (
          <textarea
            value={contentHtml}
            onChange={(e) => {
              setContentHtml(e.target.value);
              setMessage(null);
            }}
            rows={22}
            spellCheck={false}
            placeholder="<h2>Alcance</h2><p>…</p>"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
        )}
        <div className="mt-1.5 text-xs text-text-tertiary">{helpText}</div>
      </div>

      {target.kind === "company" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Descripción del cambio
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qué cambió en esta versión (aparece en el historial)"
            className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
        </div>
      ) : null}

      {importNotice ? <p className="text-sm text-amber-700">{importNotice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message && !error ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {target.kind === "template" ? "Guardar plantilla" : "Guardar borrador"}
        </button>

        {target.kind === "company" ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Publicar
          </button>
        ) : null}
      </div>
    </div>
  );
}
