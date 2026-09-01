import "@/app/dashboard/manuals/manual-content.css";

/**
 * Renderiza el cuerpo narrativo de una sección del manual.
 *
 * Es el único `dangerouslySetInnerHTML` del proyecto, y sólo es seguro por lo
 * que pasa aguas arriba: `sanitizeManualHtml` limpia el marcado al GUARDAR, de
 * modo que lo que hay en la base ya está saneado. Nada que no haya pasado por
 * esa acción debe llegar aquí — en particular, no pases contenido que venga
 * directo de un formulario sin haberlo guardado antes.
 */
export function ManualContent({ html }: { html: string }) {
  if (!html?.trim()) {
    return (
      <p className="text-sm italic text-text-tertiary">
        Esta sección todavía no tiene contenido.
      </p>
    );
  }
  return (
    <div
      className="manual-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
