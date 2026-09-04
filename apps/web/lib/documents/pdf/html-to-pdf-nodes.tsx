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
// Esta tarea (04-01) cubre encabezados, párrafos, listas, separador, cita y
// el juego de inline habitual. Tablas (04-02, esta edición) llegan con
// rejilla de bordes reales y filas irrompibles; el resto del allowlist
// (imágenes, figuras, div/span/section, pre, clases decorativas) sigue cayendo
// al `default` de aquí (texto plano + warning) hasta la siguiente tarea de
// este mismo plan.

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
});

/** Bloques cubiertos por esta tarea. El resto del allowlist cae al `default`. */
const BLOCK_TAGS = new Set(["h2", "h3", "h4", "p", "ul", "ol", "li", "hr", "blockquote", "table"]);

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

function pushWarning(warnings: string[], tagName: string): void {
  warnings.push(`etiqueta sin mapeo: <${tagName}>`);
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
    default: {
      // Etiqueta de bloque en contexto inline, o una etiqueta permitida sin
      // caso mapeado (imágenes, div/span/section... llegan en la siguiente
      // tarea de este mismo plan): en los dos casos se degrada a texto
      // plano, nunca se lanza.
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
 * Recorre una lista de hermanos en contexto de bloque. Es la entrada
 * principal (`htmlToPdfNodes`) y también lo que usa `blockquote` para sus
 * propios hijos: un `<blockquote>` puede contener párrafos y listas, no sólo
 * texto suelto.
 */
function mapNodesAsBlocks(
  nodes: AnyNode[],
  keyPrefix: string,
  warnings: string[],
): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  nodes.forEach((node, i) => {
    const key = `${keyPrefix}-${i}`;

    if (isText(node)) {
      // Saltos de línea de maquetación entre etiquetas de bloque: se
      // descartan si quedan vacíos tras colapsar, no se convierten en
      // párrafos fantasma.
      const text = collapseWhitespace(node.data).trim();
      if (text === "") return;
      out.push(
        <Text key={key} style={styles.p}>
          {text}
        </Text>,
      );
      return;
    }

    if (!isTag(node)) return;

    if (!BLOCK_TAGS.has(node.name)) {
      // Etiqueta permitida sin mapeo todavía (imagen, div/span/section,
      // pre... de la siguiente tarea de este plan): texto plano, nunca una
      // excepción.
      const text = collapseWhitespace(extractText(node)).trim();
      pushWarning(warnings, node.name);
      if (text !== "") {
        out.push(
          <Text key={key} style={styles.p}>
            {text}
          </Text>,
        );
      }
      return;
    }

    switch (node.name) {
      case "h2":
        out.push(
          <Text key={key} style={styles.h2}>
            {mapInlineChildren(node.children, key, warnings)}
          </Text>,
        );
        return;
      case "h3":
        out.push(
          <Text key={key} style={styles.h3}>
            {mapInlineChildren(node.children, key, warnings)}
          </Text>,
        );
        return;
      case "h4":
        out.push(
          <Text key={key} style={styles.h4}>
            {mapInlineChildren(node.children, key, warnings)}
          </Text>,
        );
        return;
      case "p":
        out.push(
          <Text key={key} style={styles.p}>
            {mapInlineChildren(node.children, key, warnings)}
          </Text>,
        );
        return;
      case "hr":
        out.push(<View key={key} style={styles.hr} />);
        return;
      case "blockquote":
        out.push(
          <View key={key} style={styles.blockquote}>
            {mapNodesAsBlocks(node.children, key, warnings)}
          </View>,
        );
        return;
      case "ul":
        out.push(mapList(node, false, key, warnings));
        return;
      case "ol":
        out.push(mapList(node, true, key, warnings));
        return;
      case "li":
        // `<li>` huérfano (sin `<ul>`/`<ol>` que lo envuelva): degradado a
        // una única fila con viñeta, en vez de lanzar por estructura rara.
        out.push(renderListItem(node, "•", key, warnings));
        return;
      case "table": {
        const mapped = mapTable(node, key, warnings);
        if (mapped !== null) out.push(mapped);
        return;
      }
      default:
        return;
    }
  });

  return out;
}

export function htmlToPdfNodes(contentHtml: string): MappedBody {
  const warnings: string[] = [];
  if (!contentHtml.trim()) return { body: [], warnings };

  const dom = parseDocument(contentHtml);
  const body = mapNodesAsBlocks(dom.children, "n", warnings);
  return { body, warnings };
}
