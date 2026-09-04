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
// el juego de inline habitual. Tablas, imágenes, figuras, `div/span/section`,
// `pre` y las clases decorativas de `manual-content.css` llegan en el plan
// 04-02; hasta entonces caen al `default` de aquí (texto plano + warning),
// nunca a una excepción: un PDF pobre es recuperable, un 500 en la descarga
// no lo es.

import { parseDocument } from "htmlparser2";
import { isTag, isText, type AnyNode, type Element } from "domhandler";
import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface MappedBody {
  /** Nodos listos para colgar dentro de <Page>. */
  body: React.ReactNode[];
  /** Degradaciones aplicadas: rowspan ignorado, imagen sustituida, etiqueta sin mapeo. */
  warnings: string[];
}

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
});

/** Bloques cubiertos por esta tarea. El resto del allowlist cae al `default`. */
const BLOCK_TAGS = new Set(["h2", "h3", "h4", "p", "ul", "ol", "li", "hr", "blockquote"]);

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
      // caso mapeado (tablas, imágenes, div/span/section... llegan en 04-02):
      // en los dos casos se degrada a texto plano, nunca se lanza.
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
      // Etiqueta permitida sin mapeo todavía (tabla, imagen, div/span/section,
      // pre... del plan 04-02): texto plano, nunca una excepción.
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
