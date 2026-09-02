// Conversión de un `.docx` de Word al HTML saneado que esta plataforma sabe
// guardar y renderizar (ver `sanitize-manual-html.ts`).
//
// Límite honesto de esta conversión — léase antes de "mejorarla":
// - Las TABLAS sobreviven: filas, celdas, `colspan`/`rowspan` y la distinción
//   encabezado/dato. Es el criterio de la fase, no un extra.
// - Los ENCABEZADOS sobreviven como `h2`-`h4` gracias al `styleMap` de abajo.
//   Sin él, "Heading 1" de Word llega como `<h1>`, que el sanitizador
//   descarta dejando el texto suelto.
// - Lo que NO sobrevive, por diseño: bordes y colores de tabla, fuente y
//   color de texto (mammoth los ignora por defecto — no es un fallo a
//   corregir aquí), y las IMÁGENES incrustadas (se cuentan y se descartan,
//   ver más abajo). Nada de esto se intenta recuperar: el allowlist del
//   sanitizador es cerrado a propósito y esta conversión no le abre una
//   excepción para que Word "quepa mejor".

import { sanitizeManualHtml } from "@/lib/sanitize-manual-html";

export interface DocxConversionResult {
  /** HTML ya saneado. Lo que sale de aquí puede guardarse tal cual. */
  html: string;
  /** Imágenes incrustadas que se descartaron. Se le dice al usuario. */
  droppedImages: number;
  /** Avisos de mammoth, en texto plano, para la ayuda del importador. */
  warnings: string[];
}

// El sanitizador (`sanitize-manual-html.ts`) sólo permite `h2`-`h4`: el `h1`
// de la página lo pone la plantilla de la plataforma, no el cuerpo del
// documento importado. Por eso el mapeo empieza en `h2` y no en `h1`.
// Se incluyen las variantes en español —con y sin tilde, porque Word las
// escribe de las dos formas según la plantilla— ya que los documentos de la
// consultora están en español.
const STYLE_MAP = [
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Título 1'] => h2:fresh",
  "p[style-name='Título 2'] => h3:fresh",
  "p[style-name='Título 3'] => h4:fresh",
  "p[style-name='Titulo 1'] => h2:fresh", // sin tilde: Word lo escribe así en algunas plantillas
  "p[style-name='Titulo 2'] => h3:fresh",
  "p[style-name='Titulo 3'] => h4:fresh",
];

// Máximo de avisos de mammoth que se devuelven: un documento con cientos de
// párrafos "sin estilo reconocido" no debe inflar la respuesta.
const MAX_WARNINGS = 20;

export async function convertDocxToManualHtml(
  buffer: Buffer,
): Promise<DocxConversionResult> {
  const mammoth = await import("mammoth");

  let droppedImages = 0;
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      // No embebemos ninguna imagen: por defecto mammoth las pondría como un
      // `<img src>` con esquema `data:` (bytes codificados en línea), y el
      // allowlist de esquemas del sanitizador (`http`, `https`, `mailto`) no
      // incluye ese esquema — el atributo se caería igual, así que
      // transportar los bytes primero no tiene sentido. Se cuentan para
      // poder avisar al usuario.
      convertImage: mammoth.images.imgElement(() => {
        droppedImages += 1;
        // `ImageAttributes.src` es obligatorio en los tipos de mammoth; un
        // `src` vacío es intencional, no un descuido — el `<img>` que resulte
        // se quita a continuación con la expresión regular de abajo, antes
        // incluso de llegar al sanitizador.
        return Promise.resolve({ src: "" });
      }),
    },
  );

  // Quita los `<img>` (vacíos, por el `convertImage` de arriba) que mammoth
  // dejó en el HTML. Una expresión regular sobre HTML es frágil en general,
  // pero aquí es segura y está acotada: opera sobre la salida de mammoth, no
  // sobre entrada de usuario; sólo elimina, nunca reescribe; y el resultado
  // pasa igualmente por `sanitizeManualHtml` a continuación, que sabría
  // tratar un `<img>` que sobreviviera. No sustituir esto por un parser.
  const withoutImages = result.value.replace(/<img\b[^>]*>/gi, "");

  // Saneado obligatorio, incluso si el resultado queda vacío: es el
  // invariante de la fase, no una comprobación opcional.
  const html = sanitizeManualHtml(withoutImages);

  const warnings = result.messages
    .map((message) => message.message)
    .slice(0, MAX_WARNINGS);

  return { html, droppedImages, warnings };
}
