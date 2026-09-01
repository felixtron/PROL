// Saneado del HTML narrativo de las secciones del manual.
//
// El contenido llega pegado desde documentos que la consultora ya tiene
// maquetados, así que aceptamos HTML de verdad — no el dialecto de
// `RichText`, que es lo que usan las lecciones de los cursos. A cambio, todo
// pasa por aquí ANTES de guardarse: sanear al escribir y no al leer significa
// que en la base nunca hay marcado peligroso, y que una vista que se olvide
// de sanear no puede convertirse en un XSS.
//
// El diseño (tarjetas numeradas, avisos, fichas de documento) sale de las
// clases de `manual-content.css`, no de estilos incrustados: por eso `style`
// se elimina y `class` se filtra contra una lista cerrada. Alguien que pegue
// un documento con estilos propios pierde los colores, no la estructura.

import sanitizeHtml from "sanitize-html";

/**
 * Clases con significado en la hoja de estilos del manual. Las demás se
 * descartan en silencio: dejar pasar clases arbitrarias reabriría la puerta a
 * maquetas que se salen del diseño del producto.
 */
const ALLOWED_CLASSES = [
  "manual-card",
  "manual-card-head",
  "manual-card-num",
  "manual-card-body",
  "manual-callout",
  "manual-callout-warn",
  "manual-doc",
  "manual-doc-icon",
  "manual-doc-name",
  "manual-doc-code",
  "manual-doc-desc",
  "manual-preview",
  "manual-preview-tag",
  "manual-preview-note",
  "manual-role",
  "manual-note",
  "manual-lead",
  "text-center",
  "text-right",
];

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2",
    "h3",
    "h4",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sub",
    "sup",
    "small",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "div",
    "span",
    "section",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    "*": ["class"],
  },
  allowedClasses: { "*": ALLOWED_CLASSES },
  // Sin `data:` ni `javascript:`: las imágenes del manual se suben como
  // archivo y se referencian por URL.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // Un enlace externo que abra en pestaña nueva no debe darle acceso al
  // documento que lo abrió.
  transformTags: {
    a: (tagName, attribs) => {
      const next: Record<string, string> = { ...attribs };
      if (next.target === "_blank") {
        next.rel = "noopener noreferrer";
      }
      return { tagName, attribs: next };
    },
  },
  // `disallowedTagsMode: "discard"` (por defecto) tira la etiqueta pero deja
  // su texto; para script y style queremos que desaparezca también el
  // contenido, que es donde vive la carga.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
};

/** Sanea el HTML de una sección. Llamar SIEMPRE antes de guardar. */
export function sanitizeManualHtml(raw: string): string {
  if (!raw?.trim()) return "";
  return sanitizeHtml(raw, options);
}

/**
 * Texto plano del contenido, para buscadores y resúmenes. Se calcula sobre el
 * HTML ya saneado para no arrastrar el marcado descartado.
 */
export function manualHtmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
