// Mapeador de HTML saneado -> primitivas de @react-pdf/renderer.
//
// El contenido que entra aquí YA pasó por el saneador de `lib/sanitize-manual-html.ts`
// al guardarse: este módulo NO vuelve a sanear ni relaja el allowlist. Si una
// etiqueta no está en ese allowlist, no existe en la base y no necesita caso
// aquí.
//
// Dos modos de recorrido, deliberadamente separados porque es lo que evita
// el error clásico de react-pdf (un `<View>` dentro de un `<Text>` revienta
// el layout):
//   - Contexto de BLOQUE: produce `<View>`/`<Text>` de nivel de bloque.
//   - Contexto INLINE: produce `string` o `<Text>` anidado, nunca un `<View>`.
//     Si en contexto inline aparece un elemento de bloque, se degrada a su
//     texto plano — misma regla que una etiqueta sin mapeo.
//
// El plan 04-01 cubrió encabezados, párrafos, listas, separador, cita y el
// juego de inline habitual. El plan 04-02 añadió la rejilla de tabla (bordes
// reales, cabecera repetida según el veredicto del spike, filas irrompibles)
// y, en esta misma tarea, el resto del allowlist cerrado de
// `lib/sanitize-manual-html.ts`: imágenes (marcador, nunca descarga),
// figuras, `div`/`span`/`section`, `pre`, y las 20 clases decorativas de
// `manual-content.css` degradadas a bloques legibles. `MAPPED_TAGS` (más
// abajo) enumera las 36 etiquetas cubiertas: comparar contra `allowedTags` de
// `sanitize-manual-html.ts` para verlo de un vistazo, sin leerse el `switch`.
// El `default` de las dos funciones de recorrido sigue siendo la red: sólo
// debería dispararse para algo que no exista en el allowlist.

import { Fragment } from "react";
import { parseDocument } from "htmlparser2";
import { isTag, isText, type AnyNode, type Element } from "domhandler";
import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";

// `@react-pdf/renderer` no reexporta su tipo `Style` (vive en
// `@react-pdf/types`, dependencia transitiva no declarada aquí): se deriva
// del propio prop `style` de `View` (sin la unión con `SVGTextProps` que
// tiene `Text`) para no añadir una dependencia directa sólo por un tipo.
type PdfStyleList = NonNullable<React.ComponentProps<typeof View>["style"]>;
type UnwrapArray<T> = T extends (infer U)[] ? U : T;
type PdfStyle = UnwrapArray<PdfStyleList>;

export interface MappedBody {
  /** Nodos listos para colgar dentro de <Page>. */
  body: React.ReactNode[];
  /** Degradaciones aplicadas: rowspan ignorado, imagen sustituida, etiqueta sin mapeo. */
  warnings: string[];
}

/**
 * Umbral de caracteres (suma de todas las celdas de la fila) a partir del
 * cual una fila de tabla deja de ser `wrap={false}`. El spike de 04-01 midió
 * que una fila irrompible más alta que la página se mueve entera a la
 * siguiente (no desaparece: FILA-GIGANTE: VISIBLE), así que este umbral es
 * una mejora cosmética -evita una página casi en blanco antes de la fila-,
 * no una red de seguridad de datos.
 */
const MAX_UNBREAKABLE_ROW_CHARS = 900;

const styles = StyleSheet.create({
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  h4: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  p: { marginBottom: 6, lineHeight: 1.45 },
  hr: { borderBottom: "0.5pt solid #cbd5e1", marginTop: 6, marginBottom: 6 },
  blockquote: {
    borderLeft: "2pt solid #94a3b8",
    paddingLeft: 8,
    marginTop: 6,
    marginBottom: 6,
    color: "#475569",
    fontFamily: "Helvetica-Oblique",
  },
  list: { marginBottom: 6 },
  listNested: { marginLeft: 14, marginTop: 2, marginBottom: 2 },
  listItemRow: { flexDirection: "row", marginBottom: 2 },
  listBullet: { width: 14 },
  listContent: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  underline: { textDecoration: "underline" },
  strike: { textDecoration: "line-through" },
  small: { fontSize: 8 },
  subSup: { fontSize: 7 },
  code: {
    fontFamily: "Courier",
    backgroundColor: "#f1f5f9",
    fontSize: 8.5,
  },
  link: { color: "#2563eb", textDecoration: "underline" },

  // ─── Tabla (04-02) ──────────────────────────────────────────────────────
  // `border-collapse` no existe en react-pdf: la rejilla se consigue con
  // borderTop+borderLeft en el contenedor y borderRight+borderBottom en cada
  // celda. Poner los cuatro bordes en cada celda dibuja líneas dobles.
  table: {
    marginTop: 8,
    marginBottom: 8,
    borderTop: "0.5pt solid #94a3b8",
    borderLeft: "0.5pt solid #94a3b8",
  },
  tableCaption: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#475569",
    marginBottom: 2,
  },
  tableHeadRow: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", flexWrap: "wrap" },
  th: {
    borderRight: "0.5pt solid #94a3b8",
    borderBottom: "0.5pt solid #94a3b8",
    padding: 4,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  td: {
    borderRight: "0.5pt solid #94a3b8",
    borderBottom: "0.5pt solid #94a3b8",
    padding: 4,
    fontSize: 8.5,
    textAlign: "left",
  },

  // ─── Imagen (marcador, nunca descarga) ─────────────────────────────────
  imgPlaceholder: {
    fontFamily: "Helvetica-Oblique",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    fontSize: 8.5,
  },

  // ─── Figura ─────────────────────────────────────────────────────────────
  figure: { marginTop: 8, marginBottom: 8 },
  figcaption: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 8,
    color: "#5b6672",
    textAlign: "center",
    marginTop: 3,
  },

  // ─── Bloque preformateado ───────────────────────────────────────────────
  pre: {
    backgroundColor: "#f1f5f9",
    padding: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  preText: { fontFamily: "Courier", fontSize: 8 },

  // ─── Clases decorativas de manual-content.css, degradadas ──────────────
  card: {
    border: "0.5pt solid #cbd5e1",
    borderRadius: 4,
    marginTop: 8,
    padding: 8,
  },
  cardBody: { marginTop: 2 },
  callout: {
    borderLeft: "3pt solid #9c7a3c",
    backgroundColor: "#fbf6ee",
    padding: 8,
    marginTop: 8,
  },
  calloutWarn: {
    borderLeft: "3pt solid #9c5a2e",
    backgroundColor: "#fdf3ec",
  },
  docCard: {
    border: "0.5pt dashed #94a3b8",
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
  },
  roleCard: {
    border: "0.5pt solid #dde1e5",
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
  },
  preview: {
    border: "1pt dashed #cbd5e1",
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
  },
  previewTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#9c7a3c",
    marginBottom: 3,
  },
});

/**
 * Clases de `ALLOWED_CLASSES` (`lib/sanitize-manual-html.ts`) que aportan
 * estilo de TEXTO (heredable por react-pdf de un `View`/`Text` a sus
 * descendientes, igual que en CSS: color, fontFamily, fontSize, textAlign).
 * Válidas tanto en `div`/`section` como en `span`.
 */
const CLASS_TEXT_STYLE: Partial<Record<string, PdfStyle>> = {
  "manual-card-head": { fontFamily: "Helvetica-Bold", color: "#13293d" },
  "manual-card-num": { fontFamily: "Helvetica-Bold" },
  "manual-doc-name": { fontFamily: "Helvetica-Bold", color: "#13293d" },
  "manual-doc-code": { fontFamily: "Courier", fontSize: 7.5, color: "#5b6672" },
  "manual-doc-desc": { fontSize: 8.5, color: "#444444" },
  "manual-preview-note": { fontFamily: "Helvetica-Oblique", fontSize: 8, color: "#5b6672" },
  "manual-role": { fontFamily: "Helvetica-Bold" },
  "manual-note": { fontFamily: "Helvetica-Oblique", fontSize: 8, color: "#5b6672" },
  "manual-lead": { fontSize: 10.5 },
  "text-center": { textAlign: "center" },
  "text-right": { textAlign: "right" },
};

/**
 * Clases que además aportan una caja (borde/fondo/relleno): sólo tienen
 * efecto en `div`/`section` — un `span` es inline puro y no puede tener caja.
 */
const CLASS_BOX_STYLE: Partial<Record<string, PdfStyle>> = {
  "manual-card": styles.card,
  "manual-card-body": styles.cardBody,
  "manual-callout": styles.callout,
  "manual-callout-warn": styles.calloutWarn,
  "manual-doc": styles.docCard,
  "manual-role": styles.roleCard,
  "manual-preview": styles.preview,
};

/** Clases que se descartan en silencio: son decoración pura sin equivalente en PDF. */
const DISCARDED_CLASSES = new Set(["manual-doc-icon"]);

function resolveClasses(attribs: Record<string, string> | undefined): string[] {
  return (attribs?.class ?? "").split(/\s+/).filter(Boolean);
}

/**
 * Las 36 etiquetas de `allowedTags` en `lib/sanitize-manual-html.ts`, todas
 * con tratamiento explícito entre `mapBlockNode` y `mapInlineNode`. Sirve
 * para comparar 1:1 contra el saneador sin leerse el `switch`; no se usa en
 * tiempo de ejecución.
 */
export const MAPPED_TAGS = [
  "h2", "h3", "h4", "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "small",
  "ul", "ol", "li", "blockquote", "a",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "div", "span", "section", "code", "pre",
] as const;

/** Etiquetas de nivel de bloque: cada una tiene su propio caso en `mapBlockNode`. */
const BLOCK_LEVEL_TAGS = new Set([
  "h2", "h3", "h4", "p", "ul", "ol", "li", "hr", "blockquote",
  "table", "div", "section", "figure", "figcaption", "pre",
]);

/** Colapsa espacios en blanco, incluidos saltos de línea de maquetación. */
function collapseWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ");
}

/** Texto plano recursivo de un nodo, para el `default` (degradar sin lanzar). */
function extractText(node: AnyNode): string {
  if (isText(node)) return node.data;
  if (isTag(node)) return node.children.map(extractText).join(" ");
  return "";
}

/**
 * Texto plano SIN colapsar espacios ni unir con separador: para `<pre>`, el
 * único sitio de todo el mapeador donde los saltos de línea del autor
 * importan tal cual.
 */
function extractPreformattedText(node: AnyNode): string {
  if (isText(node)) return node.data;
  if (isTag(node)) return node.children.map(extractPreformattedText).join("");
  return "";
}

function pushWarning(warnings: string[], tagName: string): void {
  warnings.push(`etiqueta sin mapeo: <${tagName}>`);
}

/** `[Imagen: alt|title|nombre de archivo]` — nunca se descarga, ni local ni remota. */
function imagePlaceholderLabel(node: Element): string {
  const alt = node.attribs?.alt?.trim();
  const title = node.attribs?.title?.trim();
  if (alt) return alt;
  if (title) return title;
  const src = node.attribs?.src ?? "";
  const fileName = src.split("/").pop()?.split("?")[0];
  return fileName || "sin descripción";
}

// ─── Contexto inline ────────────────────────────────────────────────────────

function mapInlineChildren(
  children: AnyNode[],
  keyPrefix: string,
  warnings: string[],
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  children.forEach((child, i) => {
    const mapped = mapInlineNode(child, `${keyPrefix}-${i}`, warnings);
    if (mapped === null || mapped === "") return;
    out.push(mapped);
  });
  return out;
}

/** `null` cuando el nodo no aporta nada visible (texto vacío tras colapsar). */
function mapInlineNode(
  node: AnyNode,
  key: string,
  warnings: string[],
): React.ReactNode | null {
  if (isText(node)) {
    const text = collapseWhitespace(node.data);
    return text === "" ? null : text;
  }
  if (!isTag(node)) return null;

  const children = () => mapInlineChildren(node.children, key, warnings);

  switch (node.name) {
    case "strong":
    case "b":
      return (
        <Text key={key} style={styles.bold}>
          {children()}
        </Text>
      );
    case "em":
    case "i":
      return (
        <Text key={key} style={styles.italic}>
          {children()}
        </Text>
      );
    case "u":
      return (
        <Text key={key} style={styles.underline}>
          {children()}
        </Text>
      );
    case "s":
      return (
        <Text key={key} style={styles.strike}>
          {children()}
        </Text>
      );
    case "small":
      return (
        <Text key={key} style={styles.small}>
          {children()}
        </Text>
      );
    case "sub":
    case "sup":
      // react-pdf no tiene verticalAlign: sólo se reduce el tamaño.
      return (
        <Text key={key} style={styles.subSup}>
          {children()}
        </Text>
      );
    case "code":
      return (
        <Text key={key} style={styles.code}>
          {children()}
        </Text>
      );
    case "br":
      return "\n";
    case "a": {
      const href = node.attribs?.href ?? "";
      const text = children();
      if (/^(https?:|mailto:)/.test(href)) {
        return (
          <Link key={key} src={href} style={styles.link}>
            {text}
          </Link>
        );
      }
      return text;
    }
    case "img": {
      // Marcador, nunca descarga: ni `https://` (SSRF + latencia) ni
      // `/uploads/...` (trabajo asíncrono dentro de un mapeador síncrono).
      // El único componente Image real de todo el PDF es el logo de la
      // banda, que resuelve la ruta antes de llegar aquí.
      warnings.push(`imagen sustituida por marcador: ${node.attribs?.src ?? "(sin src)"}`);
      return (
        <Text key={key} style={styles.imgPlaceholder}>
          {`[Imagen: ${imagePlaceholderLabel(node)}]`}
        </Text>
      );
    }
    case "span": {
      const classes = resolveClasses(node.attribs);
      if (classes.some((c) => DISCARDED_CLASSES.has(c))) return null;
      if (classes.includes("manual-preview-tag")) {
        // Versalitas: react-pdf no tiene small-caps, se degrada a mayúsculas.
        const text = collapseWhitespace(extractText(node)).trim().toUpperCase();
        return text === "" ? null : (
          <Text key={key} style={styles.previewTag}>
            {text}
          </Text>
        );
      }
      const textStyle = classes.map((c) => CLASS_TEXT_STYLE[c]).filter((s): s is PdfStyle => Boolean(s));
      const inline = children();
      if (inline.length === 0) return null;
      return textStyle.length > 0 ? (
        <Text key={key} style={textStyle}>
          {inline}
        </Text>
      ) : (
        <Text key={key}>{inline}</Text>
      );
    }
    default: {
      // Etiqueta de bloque en contexto inline, o una etiqueta sin caso
      // mapeado: en los dos casos se degrada a texto plano, nunca se lanza.
      const text = collapseWhitespace(extractText(node)).trim();
      pushWarning(warnings, node.name);
      return text === "" ? null : text;
    }
  }
}

// ─── Contexto de bloque ─────────────────────────────────────────────────────

/** Fila de lista (`<li>`), compartida entre `mapList` y el `<li>` huérfano. */
function renderListItem(
  li: Element,
  marker: string,
  key: string,
  warnings: string[],
): React.ReactNode {
  const inlineParts: AnyNode[] = [];
  const blockParts: React.ReactNode[] = [];

  li.children.forEach((child, i) => {
    if (isTag(child) && (child.name === "ul" || child.name === "ol")) {
      blockParts.push(mapList(child, child.name === "ol", `${key}-${i}`, warnings, 1));
    } else {
      inlineParts.push(child);
    }
  });

  const inline = mapInlineChildren(inlineParts, `${key}-i`, warnings);

  return (
    <View key={key} style={styles.listItemRow}>
      <View style={styles.listBullet}>
        <Text>{marker}</Text>
      </View>
      <View style={styles.listContent}>
        {inline.length > 0 && <Text style={styles.p}>{inline}</Text>}
        {blockParts}
      </View>
    </View>
  );
}

function mapList(
  node: Element,
  ordered: boolean,
  key: string,
  warnings: string[],
  depth = 0,
): React.ReactNode {
  const liNodes = node.children.filter(
    (child): child is Element => isTag(child) && child.name === "li",
  );
  const items = liNodes.map((li, i) => {
    const marker = ordered ? `${i + 1}.` : "•";
    return renderListItem(li, marker, `${key}-li-${i}`, warnings);
  });
  return (
    <View key={key} style={depth > 0 ? styles.listNested : styles.list}>
      {items}
    </View>
  );
}

// ─── Tabla ──────────────────────────────────────────────────────────────────

/** `colspan="0"`, negativo o no numérico se trata como 1: nunca se lanza por un atributo raro. */
function parseColspan(raw: string | undefined): number {
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function tagChildren(node: Element, name: string): Element[] {
  return node.children.filter((c): c is Element => isTag(c) && c.name === name);
}

/** Cuenta columnas sumando los `colspan` de una fila de referencia. */
function countColumns(row: Element): number {
  const cells = row.children.filter(
    (c): c is Element => isTag(c) && (c.name === "th" || c.name === "td"),
  );
  const total = cells.reduce((sum, cell) => sum + parseColspan(cell.attribs?.colspan), 0);
  return total > 0 ? total : 1;
}

/** `class="text-center"` / `"text-right"` en la celda manda sobre la alineación por defecto. */
function cellAlignStyle(cell: Element): PdfStyle | null {
  const classes = (cell.attribs?.class ?? "").split(/\s+/);
  if (classes.includes("text-center")) return { textAlign: "center" };
  if (classes.includes("text-right")) return { textAlign: "right" };
  return null;
}

/**
 * Ancho de una celda como fracción del total de columnas. Si la fila trae
 * más celdas de las que cuenta `columns` (fila irregular), las que sobran no
 * se recortan: se quedan sin ancho fijo (`flexGrow`) y `flexWrap: "wrap"` en
 * el contenedor de fila las deja caer a la línea siguiente en vez de romper
 * el layout.
 */
function cellWidthStyle(colspan: number, columns: number, used: number): PdfStyle {
  if (used + colspan <= columns) {
    return { width: `${(colspan / columns) * 100}%` };
  }
  return { flexGrow: 1 };
}

/** Mapea una `<tr>` a sus celdas (`<Text>` con ancho + alineación) y la longitud total de su texto. */
function buildRowCells(
  tr: Element,
  columns: number,
  cellStyle: PdfStyle,
  keyPrefix: string,
  warnings: string[],
): { cells: React.ReactNode[]; textLength: number } {
  const cellNodes = tr.children.filter(
    (c): c is Element => isTag(c) && (c.name === "th" || c.name === "td"),
  );
  let used = 0;
  let textLength = 0;
  const cells = cellNodes.map((cell, i) => {
    const colspan = parseColspan(cell.attribs?.colspan);
    const widthStyle = cellWidthStyle(colspan, columns, used);
    used += colspan;

    if (cell.attribs?.rowspan) {
      warnings.push("rowspan no se representa: la celda se pinta en su propia fila");
    }

    textLength += extractText(cell).length;
    const key = `${keyPrefix}-${i}`;
    const align = cellAlignStyle(cell);
    const style: PdfStyle[] = align ? [cellStyle, widthStyle, align] : [cellStyle, widthStyle];
    return (
      <Text key={key} style={style}>
        {mapInlineChildren(cell.children, key, warnings)}
      </Text>
    );
  });
  return { cells, textLength };
}

/**
 * `<table>` completo -> rejilla con bordes, cabecera repetida (VEREDICTO A
 * del spike de 04-01: un `<View fixed>` anidado DENTRO del contenedor propio
 * de la tabla repite el `<thead>` sólo en las páginas que la tabla ocupa) y
 * filas irrompibles salvo que superen `MAX_UNBREAKABLE_ROW_CHARS`.
 */
function mapTable(table: Element, keyPrefix: string, warnings: string[]): React.ReactNode | null {
  const directChildren = table.children.filter(isTag);
  const captionEl = directChildren.find((c) => c.name === "caption");
  const theadEl = directChildren.find((c) => c.name === "thead");
  const tfootEl = directChildren.find((c) => c.name === "tfoot");
  const tbodyEls = directChildren.filter((c) => c.name === "tbody");
  // `<tr>` sueltos directamente bajo `<table>`, sin `<tbody>` que los envuelva
  // (HTML válido, y el sanitizador no lo impide).
  const looseTrs = directChildren.filter((c) => c.name === "tr");

  const theadRows = theadEl ? tagChildren(theadEl, "tr") : [];
  const bodyRows = [...looseTrs, ...tbodyEls.flatMap((tb) => tagChildren(tb, "tr"))];
  const footRows = tfootEl ? tagChildren(tfootEl, "tr") : [];

  const referenceRow = theadRows[0] ?? bodyRows[0];
  if (!referenceRow) {
    warnings.push("tabla vacía o sin filas: se omite");
    return null;
  }
  const columns = countColumns(referenceRow);

  const headRowViews = theadRows.map((tr, i) => {
    const { cells } = buildRowCells(tr, columns, styles.th, `${keyPrefix}-th${i}`, warnings);
    return (
      <View key={`${keyPrefix}-thead-${i}`} style={styles.tableHeadRow}>
        {cells}
      </View>
    );
  });

  const bodyRowViews = [
    ...bodyRows.map((tr, i) => ({ tr, key: `${keyPrefix}-tr${i}` })),
    ...footRows.map((tr, i) => ({ tr, key: `${keyPrefix}-tf${i}` })),
  ].map(({ tr, key }) => {
    const { cells, textLength } = buildRowCells(tr, columns, styles.td, key, warnings);
    const tooLong = textLength > MAX_UNBREAKABLE_ROW_CHARS;
    if (tooLong) {
      warnings.push("fila demasiado alta para mantenerse íntegra: se permite partirla");
      return (
        <View key={key} style={styles.tableRow} wrap>
          {cells}
        </View>
      );
    }
    return (
      <View key={key} style={styles.tableRow} wrap={false}>
        {cells}
      </View>
    );
  });

  if (headRowViews.length === 0 && bodyRowViews.length === 0) {
    warnings.push("tabla vacía o sin filas: se omite");
    return null;
  }

  return (
    <View key={keyPrefix} style={styles.table}>
      {captionEl && (
        <Text style={styles.tableCaption}>{collapseWhitespace(extractText(captionEl)).trim()}</Text>
      )}
      {/* thead con varias filas: todas dentro del MISMO View fixed (veredicto A). */}
      {headRowViews.length > 0 && <View fixed>{headRowViews}</View>}
      {bodyRowViews}
    </View>
  );
}

/**
 * `div`/`section` -> `<View>`. El estilo lo decide su `class` (degradada
 * contra `CLASS_BOX_STYLE`/`CLASS_TEXT_STYLE`); sin clase reconocida es un
 * contenedor transparente que sólo agrupa a sus hijos, y se APLANA (no se
 * envuelve en un `View` propio) para no construir árboles hondos
 * innecesarios con cada `div` sin estilo del documento original.
 */
function mapContainer(node: Element, key: string, warnings: string[]): React.ReactNode | null {
  const classes = resolveClasses(node.attribs);
  if (classes.some((c) => DISCARDED_CLASSES.has(c))) return null; // decoración pura (manual-doc-icon)

  if (classes.includes("manual-preview-tag")) {
    const text = collapseWhitespace(extractText(node)).trim().toUpperCase();
    return text === "" ? null : (
      <Text key={key} style={styles.previewTag}>
        {text}
      </Text>
    );
  }

  const boxStyle = classes.map((c) => CLASS_BOX_STYLE[c]).filter((s): s is PdfStyle => Boolean(s));
  const textStyle = classes.map((c) => CLASS_TEXT_STYLE[c]).filter((s): s is PdfStyle => Boolean(s));
  const children = mapNodesAsBlocks(node.children, key, warnings);

  if (boxStyle.length === 0 && textStyle.length === 0) {
    return children.length > 0 ? <Fragment key={key}>{children}</Fragment> : null;
  }

  const style = [...boxStyle, ...textStyle];
  return (
    <View key={key} style={style}>
      {children}
    </View>
  );
}

/** `<figure>`: contenido + `<figcaption>` en cursiva pequeña, centrado. */
function mapFigure(node: Element, key: string, warnings: string[]): React.ReactNode {
  const captionEl = node.children.find((c): c is Element => isTag(c) && c.name === "figcaption");
  const contentNodes = node.children.filter((c) => !(isTag(c) && c.name === "figcaption"));
  return (
    <View key={key} style={styles.figure}>
      {mapNodesAsBlocks(contentNodes, key, warnings)}
      {captionEl && (
        <Text style={styles.figcaption}>{collapseWhitespace(extractText(captionEl)).trim()}</Text>
      )}
    </View>
  );
}

/** `<pre>`/`<code>` en bloque: fondo claro, Courier, saltos de línea intactos. */
function mapPre(node: Element, key: string): React.ReactNode {
  return (
    <View key={key} style={styles.pre}>
      <Text style={styles.preText}>{extractPreformattedText(node)}</Text>
    </View>
  );
}

/** Mapea UN nodo de nivel de bloque (ya confirmado en `BLOCK_LEVEL_TAGS`). */
function mapBlockNode(node: Element, key: string, warnings: string[]): React.ReactNode | null {
  switch (node.name) {
    case "h2":
      return (
        <Text key={key} style={styles.h2}>
          {mapInlineChildren(node.children, key, warnings)}
        </Text>
      );
    case "h3":
      return (
        <Text key={key} style={styles.h3}>
          {mapInlineChildren(node.children, key, warnings)}
        </Text>
      );
    case "h4":
      return (
        <Text key={key} style={styles.h4}>
          {mapInlineChildren(node.children, key, warnings)}
        </Text>
      );
    case "p":
      return (
        <Text key={key} style={styles.p}>
          {mapInlineChildren(node.children, key, warnings)}
        </Text>
      );
    case "hr":
      return <View key={key} style={styles.hr} />;
    case "blockquote":
      return (
        <View key={key} style={styles.blockquote}>
          {mapNodesAsBlocks(node.children, key, warnings)}
        </View>
      );
    case "ul":
      return mapList(node, false, key, warnings);
    case "ol":
      return mapList(node, true, key, warnings);
    case "li":
      // `<li>` huérfano (sin `<ul>`/`<ol>` que lo envuelva): degradado a
      // una única fila con viñeta, en vez de lanzar por estructura rara.
      return renderListItem(node, "•", key, warnings);
    case "table":
      return mapTable(node, key, warnings);
    case "div":
    case "section":
      return mapContainer(node, key, warnings);
    case "figure":
      return mapFigure(node, key, warnings);
    case "figcaption":
      // `<figcaption>` suelta (sin `<figure>` que la envuelva): mismo estilo,
      // degradado sin estructura padre en vez de lanzar.
      return (
        <Text key={key} style={styles.figcaption}>
          {collapseWhitespace(extractText(node)).trim()}
        </Text>
      );
    case "pre":
      return mapPre(node, key);
    default:
      return null;
  }
}

/**
 * Recorre una lista de hermanos en contexto de bloque. Es la entrada
 * principal (`htmlToPdfNodes`) y también lo que usa `blockquote`/`div`/
 * `section` para sus propios hijos: cualquiera de ellos puede contener
 * párrafos y listas, no sólo texto suelto.
 *
 * Tolera contenido mixto: una corrida de texto e inline sueltos entre
 * bloques reales (p. ej. un `<span>` seguido de texto, directamente bajo un
 * `div.manual-card-head`) se agrupa en un mismo `<Text>` de párrafo — igual
 * estrategia que ya usaba `renderListItem` para separar el texto de un
 * `<li>` de sus sublistas.
 */
function mapNodesAsBlocks(
  nodes: AnyNode[],
  keyPrefix: string,
  warnings: string[],
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let inlineBuffer: AnyNode[] = [];
  let bufferIndex = 0;

  const flushBuffer = () => {
    if (inlineBuffer.length === 0) return;
    const mapped = mapInlineChildren(inlineBuffer, `${keyPrefix}-buf${bufferIndex}`, warnings);
    if (mapped.length > 0) {
      out.push(
        <Text key={`${keyPrefix}-buf${bufferIndex}`} style={styles.p}>
          {mapped}
        </Text>,
      );
    }
    bufferIndex += 1;
    inlineBuffer = [];
  };

  nodes.forEach((node) => {
    if (isText(node)) {
      if (collapseWhitespace(node.data).trim() === "") return;
      inlineBuffer.push(node);
      return;
    }

    if (!isTag(node)) return;

    if (!BLOCK_LEVEL_TAGS.has(node.name)) {
      // Etiqueta inline (span, strong, a, img, br...) en contexto de bloque:
      // se agrupa con el texto vecino en el mismo párrafo. Una etiqueta sin
      // caso mapeado en absoluto se degrada dentro de ese mismo párrafo, vía
      // el `default` de `mapInlineNode`.
      inlineBuffer.push(node);
      return;
    }

    // Es un bloque real: cierra el párrafo acumulado antes de continuar.
    flushBuffer();
    const key = `${keyPrefix}-${out.length}-${bufferIndex}`;
    const mapped = mapBlockNode(node, key, warnings);
    if (mapped !== null) out.push(mapped);
  });

  flushBuffer();
  return out;
}

export function htmlToPdfNodes(contentHtml: string): MappedBody {
  const warnings: string[] = [];
  if (!contentHtml.trim()) return { body: [], warnings };

  const dom = parseDocument(contentHtml);
  const body = mapNodesAsBlocks(dom.children, "n", warnings);
  return { body, warnings };
}
